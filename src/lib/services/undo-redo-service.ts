/**
 * Undo/Redo Service
 * Collaborative undo/redo system for match session edits
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'
import { EventEmitter } from 'events'

export interface UndoRedoAction {
  id: string
  sessionId: string
  userId: string
  userName: string
  actionType: string
  entityType: string
  entityId: string
  action: 'create' | 'update' | 'delete' | 'move' | 'resize'
  beforeState: Record<string, any>
  afterState: Record<string, any>
  timestamp: number
  description: string
  metadata?: Record<string, any>
  isUndone: boolean
  undoneAt?: number
  undoneBy?: string
}

export interface UndoRedoStack {
  sessionId: string
  actions: UndoRedoAction[]
  currentIndex: number
  maxSize: number
  lastModified: number
}

export interface UndoRedoOptions {
  maxStackSize?: number
  autoSave?: boolean
  saveInterval?: number
  enableCollaboration?: boolean
  conflictResolution?: 'last_wins' | 'merge' | 'manual'
}

export interface UndoRedoStats {
  totalActions: number
  undoableActions: number
  redoableActions: number
  mostActiveUser: string
  actionsByType: Record<string, number>
  actionsByUser: Record<string, number>
  averageActionsPerMinute: number
}

export interface ConflictResolution {
  actionId: string
  conflictType: 'concurrent_edit' | 'state_mismatch' | 'dependency_lost'
  resolution: 'accepted' | 'rejected' | 'merged' | 'pending'
  resolvedBy?: string
  resolvedAt?: number
  details?: string
}

class UndoRedoService extends EventEmitter {
  private supabase = createClientComponentClient<Database>()
  private stacks = new Map<string, UndoRedoStack>()
  private options: Required<UndoRedoOptions> = {
    maxStackSize: 100,
    autoSave: true,
    saveInterval: 30000, // 30 seconds
    enableCollaboration: true,
    conflictResolution: 'last_wins'
  }
  private saveIntervals = new Map<string, NodeJS.Timeout>()

  /**
   * Initialize undo/redo for a session
   */
  async initializeSession(
    sessionId: string,
    options?: UndoRedoOptions
  ): Promise<void> {
    try {
      // Merge options
      this.options = { ...this.options, ...options }

      // Initialize stack
      const stack: UndoRedoStack = {
        sessionId,
        actions: [],
        currentIndex: -1,
        maxSize: this.options.maxStackSize,
        lastModified: Date.now()
      }

      this.stacks.set(sessionId, stack)

      // Load existing actions from database
      await this.loadSessionActions(sessionId)

      // Setup auto-save if enabled
      if (this.options.autoSave) {
        this.setupAutoSave(sessionId)
      }

      console.log(`Initialized undo/redo for session: ${sessionId}`)
    } catch (error) {
      console.error('Error initializing undo/redo session:', error)
    }
  }

  /**
   * Add action to undo stack
   */
  async addAction(
    sessionId: string,
    userId: string,
    userName: string,
    actionType: string,
    entityType: string,
    entityId: string,
    action: UndoRedoAction['action'],
    beforeState: Record<string, any>,
    afterState: Record<string, any>,
    description: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; action?: UndoRedoAction; error?: string }> {
    try {
      const stack = this.stacks.get(sessionId)
      if (!stack) {
        return { success: false, error: 'Session not initialized' }
      }

      const undoAction: UndoRedoAction = {
        id: `undo-${sessionId}-${userId}-${Date.now()}`,
        sessionId,
        userId,
        userName,
        actionType,
        entityType,
        entityId,
        action,
        beforeState,
        afterState,
        timestamp: Date.now(),
        description,
        metadata,
        isUndone: false
      }

      // Remove any actions after current index (when new action is added after undo)
      if (stack.currentIndex < stack.actions.length - 1) {
        stack.actions = stack.actions.slice(0, stack.currentIndex + 1)
      }

      // Add new action
      stack.actions.push(undoAction)
      stack.currentIndex = stack.actions.length - 1

      // Trim stack if it exceeds max size
      if (stack.actions.length > stack.maxSize) {
        stack.actions = stack.actions.slice(-stack.maxSize)
        stack.currentIndex = stack.actions.length - 1
      }

      stack.lastModified = Date.now()

      // Emit action added event
      this.emit('actionAdded', { sessionId, action: undoAction })

      return { success: true, action: undoAction }
    } catch (error) {
      console.error('Error adding undo action:', error)
      return { success: false, error: 'Failed to add action' }
    }
  }

  /**
   * Undo last action
   */
  async undoAction(
    sessionId: string,
    userId: string
  ): Promise<{ success: boolean; action?: UndoRedoAction; error?: string }> {
    try {
      const stack = this.stacks.get(sessionId)
      if (!stack) {
        return { success: false, error: 'Session not initialized' }
      }

      if (stack.currentIndex < 0) {
        return { success: false, error: 'No actions to undo' }
      }

      const action = stack.actions[stack.currentIndex]
      if (!action || action.isUndone) {
        return { success: false, error: 'Action already undone or invalid' }
      }

      // Check for conflicts in collaborative mode
      if (this.options.enableCollaboration) {
        const conflict = await this.checkConflict(sessionId, action)
        if (conflict) {
          return { success: false, error: `Conflict detected: ${conflict.details}` }
        }
      }

      // Apply undo
      const undoResult = await this.applyAction(action, 'undo')
      if (!undoResult.success) {
        return { success: false, error: undoResult.error }
      }

      // Mark action as undone
      action.isUndone = true
      action.undoneAt = Date.now()
      action.undoneBy = userId

      stack.currentIndex--
      stack.lastModified = Date.now()

      // Emit undo event
      this.emit('actionUndone', { sessionId, action, undoneBy: userId })

      return { success: true, action }
    } catch (error) {
      console.error('Error undoing action:', error)
      return { success: false, error: 'Failed to undo action' }
    }
  }

  /**
   * Redo next action
   */
  async redoAction(
    sessionId: string,
    userId: string
  ): Promise<{ success: boolean; action?: UndoRedoAction; error?: string }> {
    try {
      const stack = this.stacks.get(sessionId)
      if (!stack) {
        return { success: false, error: 'Session not initialized' }
      }

      if (stack.currentIndex >= stack.actions.length - 1) {
        return { success: false, error: 'No actions to redo' }
      }

      const nextIndex = stack.currentIndex + 1
      const action = stack.actions[nextIndex]
      if (!action || !action.isUndone) {
        return { success: false, error: 'Action not undone or invalid' }
      }

      // Check for conflicts in collaborative mode
      if (this.options.enableCollaboration) {
        const conflict = await this.checkConflict(sessionId, action)
        if (conflict) {
          return { success: false, error: `Conflict detected: ${conflict.details}` }
        }
      }

      // Apply redo
      const redoResult = await this.applyAction(action, 'redo')
      if (!redoResult.success) {
        return { success: false, error: redoResult.error }
      }

      // Mark action as not undone
      action.isUndone = false
      action.undoneAt = undefined
      action.undoneBy = undefined

      stack.currentIndex = nextIndex
      stack.lastModified = Date.now()

      // Emit redo event
      this.emit('actionRedone', { sessionId, action, redoneBy: userId })

      return { success: true, action }
    } catch (error) {
      console.error('Error redoing action:', error)
      return { success: false, error: 'Failed to redo action' }
    }
  }

  /**
   * Get undo stack for session
   */
  getUndoStack(sessionId: string): UndoRedoAction[] {
    const stack = this.stacks.get(sessionId)
    if (!stack) {
      return []
    }

    return stack.actions.slice(0, stack.currentIndex + 1)
  }

  /**
   * Get redo stack for session
   */
  getRedoStack(sessionId: string): UndoRedoAction[] {
    const stack = this.stacks.get(sessionId)
    if (!stack) {
      return []
    }

    return stack.actions.slice(stack.currentIndex + 1)
  }

  /**
   * Check if undo is possible
   */
  canUndo(sessionId: string): boolean {
    const stack = this.stacks.get(sessionId)
    if (!stack) {
      return false
    }

    return stack.currentIndex >= 0 && 
           stack.actions[stack.currentIndex] && 
           !stack.actions[stack.currentIndex].isUndone
  }

  /**
   * Check if redo is possible
   */
  canRedo(sessionId: string): boolean {
    const stack = this.stacks.get(sessionId)
    if (!stack) {
      return false
    }

    const nextIndex = stack.currentIndex + 1
    return nextIndex < stack.actions.length && 
           stack.actions[nextIndex] && 
           stack.actions[nextIndex].isUndone
  }

  /**
   * Get undo/redo statistics
   */
  getStats(sessionId: string): UndoRedoStats {
    const stack = this.stacks.get(sessionId)
    if (!stack) {
      return {
        totalActions: 0,
        undoableActions: 0,
        redoableActions: 0,
        mostActiveUser: '',
        actionsByType: {},
        actionsByUser: {},
        averageActionsPerMinute: 0
      }
    }

    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)
    
    // Filter to last hour for rate calculation
    const recentActions = stack.actions.filter(action => action.timestamp > oneHourAgo)

    const actionsByType: Record<string, number> = {}
    const actionsByUser: Record<string, number> = {}

    stack.actions.forEach(action => {
      actionsByType[action.actionType] = (actionsByType[action.actionType] || 0) + 1
      actionsByUser[action.userId] = (actionsByUser[action.userId] || 0) + 1
    })

    const mostActiveUser = Object.entries(actionsByUser)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || ''

    return {
      totalActions: stack.actions.length,
      undoableActions: stack.actions.filter(action => 
        stack.actions.indexOf(action) <= stack.currentIndex && !action.isUndone
      ).length,
      redoableActions: stack.actions.filter(action => 
        stack.actions.indexOf(action) > stack.currentIndex && action.isUndone
      ).length,
      mostActiveUser,
      actionsByType,
      actionsByUser,
      averageActionsPerMinute: Math.round((recentActions.length / 60) * 100) / 100
    }
  }

  /**
   * Clear undo/redo stack
   */
  clearStack(sessionId: string): void {
    const stack = this.stacks.get(sessionId)
    if (stack) {
      stack.actions = []
      stack.currentIndex = -1
      stack.lastModified = Date.now()
      
      this.emit('stackCleared', { sessionId })
    }
  }

  /**
   * Apply action (undo or redo)
   */
  private async applyAction(
    action: UndoRedoAction,
    direction: 'undo' | 'redo'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const state = direction === 'undo' ? action.beforeState : action.afterState

      switch (action.action) {
        case 'create':
          if (direction === 'undo') {
            // Delete the created entity
            await this.deleteEntity(action.entityType, action.entityId)
          } else {
            // Recreate the entity
            await this.createEntity(action.entityType, state)
          }
          break

        case 'update':
          // Update entity with the appropriate state
          await this.updateEntity(action.entityType, action.entityId, state)
          break

        case 'delete':
          if (direction === 'undo') {
            // Restore the deleted entity
            await this.createEntity(action.entityType, action.beforeState)
          } else {
            // Delete the entity again
            await this.deleteEntity(action.entityType, action.entityId)
          }
          break

        case 'move':
          // Apply position changes
          await this.updateEntity(action.entityType, action.entityId, {
            ...state,
            position: state.position
          })
          break

        case 'resize':
          // Apply size changes
          await this.updateEntity(action.entityType, action.entityId, {
            ...state,
            size: state.size
          })
          break

        default:
          return { success: false, error: `Unknown action type: ${action.action}` }
      }

      return { success: true }
    } catch (error) {
      console.error('Error applying action:', error)
      return { success: false, error: 'Failed to apply action' }
    }
  }

  /**
   * Check for conflicts in collaborative editing
   */
  private async checkConflict(
    sessionId: string,
    action: UndoRedoAction
  ): Promise<ConflictResolution | null> {
    try {
      // Check if entity still exists and has the expected state
      const currentState = await this.getEntityState(action.entityType, action.entityId)
      
      if (!currentState) {
        return {
          actionId: action.id,
          conflictType: 'dependency_lost',
          resolution: 'pending',
          details: 'Entity no longer exists'
        }
      }

      // Check for state mismatches
      if (JSON.stringify(currentState) !== JSON.stringify(action.afterState)) {
        return {
          actionId: action.id,
          conflictType: 'state_mismatch',
          resolution: 'pending',
          details: 'Entity state has changed since action was performed'
        }
      }

      return null
    } catch (error) {
      console.error('Error checking conflict:', error)
      return {
        actionId: action.id,
        conflictType: 'concurrent_edit',
        resolution: 'pending',
        details: 'Error checking for conflicts'
      }
    }
  }

  /**
   * Load session actions from database
   */
  private async loadSessionActions(sessionId: string): Promise<void> {
    try {
      // TODO: Implement database persistence
      // For now, actions are only stored in memory
      console.log(`Loading actions for session ${sessionId} from database`)
    } catch (error) {
      console.error('Error loading session actions:', error)
    }
  }

  /**
   * Setup auto-save
   */
  private setupAutoSave(sessionId: string): void {
    const interval = setInterval(async () => {
      await this.saveSessionActions(sessionId)
    }, this.options.saveInterval)

    this.saveIntervals.set(sessionId, interval)
  }

  /**
   * Save session actions to database
   */
  private async saveSessionActions(sessionId: string): Promise<void> {
    try {
      // TODO: Implement database persistence
      console.log(`Saving actions for session ${sessionId} to database`)
    } catch (error) {
      console.error('Error saving session actions:', error)
    }
  }

  /**
   * Entity operations (placeholder implementations)
   */
  private async createEntity(entityType: string, state: Record<string, any>): Promise<void> {
    // TODO: Implement based on entity type
    console.log(`Creating entity ${entityType}:`, state)
  }

  private async updateEntity(entityType: string, entityId: string, state: Record<string, any>): Promise<void> {
    // TODO: Implement based on entity type
    console.log(`Updating entity ${entityType} ${entityId}:`, state)
  }

  private async deleteEntity(entityType: string, entityId: string): Promise<void> {
    // TODO: Implement based on entity type
    console.log(`Deleting entity ${entityType} ${entityId}`)
  }

  private async getEntityState(entityType: string, entityId: string): Promise<Record<string, any> | null> {
    // TODO: Implement based on entity type
    console.log(`Getting state for entity ${entityType} ${entityId}`)
    return null
  }

  /**
   * Cleanup session
   */
  cleanupSession(sessionId: string): void {
    try {
      // Clear stack
      this.stacks.delete(sessionId)

      // Clear auto-save interval
      const interval = this.saveIntervals.get(sessionId)
      if (interval) {
        clearInterval(interval)
        this.saveIntervals.delete(sessionId)
      }

      console.log(`Cleaned up undo/redo for session: ${sessionId}`)
    } catch (error) {
      console.error('Error cleaning up session:', error)
    }
  }

  /**
   * Get predefined action types
   */
  getPredefinedActionTypes(): Record<string, string[]> {
    return {
      match: [
        'match_settings_changed',
        'match_started',
        'match_ended',
        'match_paused',
        'match_resumed'
      ],
      event: [
        'goal_scored',
        'card_given',
        'substitution_made',
        'penalty_awarded',
        'event_edited',
        'event_deleted'
      ],
      timer: [
        'timer_started',
        'timer_stopped',
        'timer_reset',
        'stoppage_time_added',
        'extra_time_added'
      ],
      team: [
        'team_sheet_updated',
        'player_added',
        'player_removed',
        'formation_changed'
      ],
      settings: [
        'settings_updated',
        'permissions_changed',
        'roles_assigned'
      ]
    }
  }
}

// Export singleton instance
export const undoRedoService = new UndoRedoService()

// Export types
export type {
  UndoRedoAction,
  UndoRedoStack,
  UndoRedoOptions,
  UndoRedoStats,
  ConflictResolution
}
