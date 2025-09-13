/**
 * Timer Permissions Service
 * Handles role-based permissions for timer control operations
 */

export interface UserRole {
  id: string
  name: string
  level: number // Higher number = more permissions
  permissions: TimerPermission[]
}

export interface TimerPermission {
  action: TimerAction
  conditions?: PermissionCondition[]
  restrictions?: PermissionRestriction[]
}

export interface PermissionCondition {
  type: 'match_status' | 'time_range' | 'user_count' | 'timer_state'
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: any
}

export interface PermissionRestriction {
  type: 'rate_limit' | 'time_window' | 'cooldown' | 'max_operations'
  value: number
  window?: number // for time-based restrictions
}

export type TimerAction = 
  | 'start_timer'
  | 'pause_timer'
  | 'resume_timer'
  | 'stop_timer'
  | 'add_stoppage_time'
  | 'remove_stoppage_time'
  | 'add_extra_time'
  | 'edit_time'
  | 'change_period'
  | 'start_injury_time'
  | 'end_injury_time'
  | 'override_control'
  | 'view_timer'
  | 'view_controls'
  | 'export_timer_data'

export interface PermissionCheck {
  allowed: boolean
  reason?: string
  restrictions?: string[]
  conditions?: string[]
}

export interface PermissionAudit {
  userId: string
  userRole: string
  action: TimerAction
  timestamp: Date
  result: 'granted' | 'denied'
  reason?: string
  conditions?: any
  matchId: string
}

export class TimerPermissionsService {
  private roles: Map<string, UserRole> = new Map()
  private permissionCache: Map<string, PermissionCheck> = new Map()
  private auditLog: PermissionAudit[] = []
  private userOperationCounts: Map<string, Map<TimerAction, number>> = new Map()
  private userLastOperation: Map<string, Map<TimerAction, Date>> = new Map()

  constructor() {
    this.initializeDefaultRoles()
  }

  /**
   * Check if user has permission for an action
   */
  checkPermission(
    userId: string,
    userRole: string,
    action: TimerAction,
    context?: {
      matchId: string
      matchStatus?: string
      timerState?: any
      currentTime?: Date
    }
  ): PermissionCheck {
    const cacheKey = `${userId}-${action}-${context?.matchId || 'global'}`
    
    // Check cache first
    if (this.permissionCache.has(cacheKey)) {
      const cached = this.permissionCache.get(cacheKey)!
      this.logPermissionAudit(userId, userRole, action, cached.allowed, cached.reason, context)
      return cached
    }

    const role = this.roles.get(userRole)
    if (!role) {
      const result: PermissionCheck = {
        allowed: false,
        reason: `Unknown role: ${userRole}`
      }
      this.permissionCache.set(cacheKey, result)
      this.logPermissionAudit(userId, userRole, action, false, result.reason, context)
      return result
    }

    // Find permission for the action
    const permission = role.permissions.find(p => p.action === action)
    if (!permission) {
      const result: PermissionCheck = {
        allowed: false,
        reason: `Action '${action}' not allowed for role '${userRole}'`
      }
      this.permissionCache.set(cacheKey, result)
      this.logPermissionAudit(userId, userRole, action, false, result.reason, context)
      return result
    }

    // Check conditions
    const conditionResults = this.checkConditions(permission.conditions || [], context)
    if (!conditionResults.allowed) {
      this.permissionCache.set(cacheKey, conditionResults)
      this.logPermissionAudit(userId, userRole, action, false, conditionResults.reason, context)
      return conditionResults
    }

    // Check restrictions
    const restrictionResults = this.checkRestrictions(userId, action, permission.restrictions || [])
    if (!restrictionResults.allowed) {
      this.permissionCache.set(cacheKey, restrictionResults)
      this.logPermissionAudit(userId, userRole, action, false, restrictionResults.reason, context)
      return restrictionResults
    }

    const result: PermissionCheck = {
      allowed: true
    }
    this.permissionCache.set(cacheKey, result)
    this.logPermissionAudit(userId, userRole, action, true, undefined, context)
    return result
  }

  /**
   * Get all permissions for a role
   */
  getRolePermissions(userRole: string): TimerPermission[] {
    const role = this.roles.get(userRole)
    return role ? [...role.permissions] : []
  }

  /**
   * Get all roles
   */
  getAllRoles(): UserRole[] {
    return Array.from(this.roles.values())
  }

  /**
   * Create or update a role
   */
  createOrUpdateRole(role: UserRole): void {
    this.roles.set(role.id, role)
    this.clearPermissionCache()
  }

  /**
   * Delete a role
   */
  deleteRole(roleId: string): boolean {
    if (this.roles.has(roleId)) {
      this.roles.delete(roleId)
      this.clearPermissionCache()
      return true
    }
    return false
  }

  /**
   * Get permission audit log
   */
  getPermissionAuditLog(filter?: {
    userId?: string
    userRole?: string
    action?: TimerAction
    result?: 'granted' | 'denied'
    dateFrom?: Date
    dateTo?: Date
  }): PermissionAudit[] {
    let filteredLog = [...this.auditLog]

    if (filter) {
      if (filter.userId) {
        filteredLog = filteredLog.filter(entry => entry.userId === filter.userId)
      }
      if (filter.userRole) {
        filteredLog = filteredLog.filter(entry => entry.userRole === filter.userRole)
      }
      if (filter.action) {
        filteredLog = filteredLog.filter(entry => entry.action === filter.action)
      }
      if (filter.result) {
        filteredLog = filteredLog.filter(entry => entry.result === filter.result)
      }
      if (filter.dateFrom) {
        filteredLog = filteredLog.filter(entry => entry.timestamp >= filter.dateFrom!)
      }
      if (filter.dateTo) {
        filteredLog = filteredLog.filter(entry => entry.timestamp <= filter.dateTo!)
      }
    }

    return filteredLog.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Get permission statistics
   */
  getPermissionStatistics(): {
    totalChecks: number
    grantedCount: number
    deniedCount: number
    grantRate: number
    checksByRole: Record<string, number>
    checksByAction: Record<string, number>
    deniedByReason: Record<string, number>
  } {
    const stats = {
      totalChecks: this.auditLog.length,
      grantedCount: this.auditLog.filter(entry => entry.result === 'granted').length,
      deniedCount: this.auditLog.filter(entry => entry.result === 'denied').length,
      grantRate: 0,
      checksByRole: {} as Record<string, number>,
      checksByAction: {} as Record<string, number>,
      deniedByReason: {} as Record<string, number>
    }

    if (stats.totalChecks > 0) {
      stats.grantRate = (stats.grantedCount / stats.totalChecks) * 100
    }

    this.auditLog.forEach(entry => {
      stats.checksByRole[entry.userRole] = (stats.checksByRole[entry.userRole] || 0) + 1
      stats.checksByAction[entry.action] = (stats.checksByAction[entry.action] || 0) + 1
      
      if (entry.result === 'denied' && entry.reason) {
        stats.deniedByReason[entry.reason] = (stats.deniedByReason[entry.reason] || 0) + 1
      }
    })

    return stats
  }

  /**
   * Clear permission cache
   */
  clearPermissionCache(): void {
    this.permissionCache.clear()
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = []
    this.userOperationCounts.clear()
    this.userLastOperation.clear()
  }

  // Private methods

  private initializeDefaultRoles(): void {
    // Referee - Full control
    this.roles.set('referee', {
      id: 'referee',
      name: 'Referee',
      level: 100,
      permissions: [
        { action: 'start_timer' },
        { action: 'pause_timer' },
        { action: 'resume_timer' },
        { action: 'stop_timer' },
        { action: 'add_stoppage_time' },
        { action: 'remove_stoppage_time' },
        { action: 'add_extra_time' },
        { action: 'edit_time' },
        { action: 'change_period' },
        { action: 'start_injury_time' },
        { action: 'end_injury_time' },
        { action: 'view_timer' },
        { action: 'view_controls' },
        { action: 'export_timer_data' }
      ]
    })

    // Assistant Referee - Limited control
    this.roles.set('assistant_referee', {
      id: 'assistant_referee',
      name: 'Assistant Referee',
      level: 80,
      permissions: [
        { 
          action: 'pause_timer',
          restrictions: [
            { type: 'rate_limit', value: 5, window: 60000 } // 5 times per minute
          ]
        },
        { action: 'resume_timer' },
        { 
          action: 'add_stoppage_time',
          restrictions: [
            { type: 'rate_limit', value: 3, window: 60000 } // 3 times per minute
          ]
        },
        { action: 'start_injury_time' },
        { action: 'end_injury_time' },
        { action: 'view_timer' },
        { action: 'view_controls' }
      ]
    })

    // Fourth Official - Very limited control
    this.roles.set('fourth_official', {
      id: 'fourth_official',
      name: 'Fourth Official',
      level: 60,
      permissions: [
        { 
          action: 'add_stoppage_time',
          restrictions: [
            { type: 'rate_limit', value: 2, window: 60000 } // 2 times per minute
          ]
        },
        { action: 'view_timer' },
        { action: 'view_controls' }
      ]
    })

    // Admin - Full control with overrides
    this.roles.set('admin', {
      id: 'admin',
      name: 'Administrator',
      level: 90,
      permissions: [
        { action: 'start_timer' },
        { action: 'pause_timer' },
        { action: 'resume_timer' },
        { action: 'stop_timer' },
        { action: 'add_stoppage_time' },
        { action: 'remove_stoppage_time' },
        { action: 'add_extra_time' },
        { action: 'edit_time' },
        { action: 'change_period' },
        { action: 'start_injury_time' },
        { action: 'end_injury_time' },
        { action: 'override_control' },
        { action: 'view_timer' },
        { action: 'view_controls' },
        { action: 'export_timer_data' }
      ]
    })

    // Scorer - View only
    this.roles.set('scorer', {
      id: 'scorer',
      name: 'Match Scorer',
      level: 40,
      permissions: [
        { action: 'view_timer' }
      ]
    })

    // Viewer - View only
    this.roles.set('viewer', {
      id: 'viewer',
      name: 'Viewer',
      level: 20,
      permissions: [
        { action: 'view_timer' }
      ]
    })
  }

  private checkConditions(conditions: PermissionCondition[], context?: any): PermissionCheck {
    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, context)
      if (!conditionResult.allowed) {
        return conditionResult
      }
    }
    return { allowed: true }
  }

  private evaluateCondition(condition: PermissionCondition, context?: any): PermissionCheck {
    let actualValue: any

    switch (condition.type) {
      case 'match_status':
        actualValue = context?.matchStatus
        break
      case 'timer_state':
        actualValue = context?.timerState?.status
        break
      case 'time_range':
        actualValue = context?.currentTime
        break
      case 'user_count':
        actualValue = context?.userCount
        break
      default:
        return { allowed: false, reason: `Unknown condition type: ${condition.type}` }
    }

    const conditionMet = this.compareValues(actualValue, condition.operator, condition.value)
    
    if (!conditionMet) {
      return {
        allowed: false,
        reason: `Condition not met: ${condition.type} ${condition.operator} ${condition.value}`,
        conditions: [`${condition.type} ${condition.operator} ${condition.value}`]
      }
    }

    return { allowed: true }
  }

  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected
      case 'not_equals':
        return actual !== expected
      case 'greater_than':
        return actual > expected
      case 'less_than':
        return actual < expected
      case 'in':
        return Array.isArray(expected) && expected.includes(actual)
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual)
      default:
        return false
    }
  }

  private checkRestrictions(userId: string, action: TimerAction, restrictions: PermissionRestriction[]): PermissionCheck {
    for (const restriction of restrictions) {
      const restrictionResult = this.evaluateRestriction(userId, action, restriction)
      if (!restrictionResult.allowed) {
        return restrictionResult
      }
    }
    return { allowed: true }
  }

  private evaluateRestriction(userId: string, action: TimerAction, restriction: PermissionRestriction): PermissionCheck {
    const now = new Date()

    switch (restriction.type) {
      case 'rate_limit':
        return this.checkRateLimit(userId, action, restriction.value, restriction.window || 60000)
      
      case 'time_window':
        return this.checkTimeWindow(now, restriction.value, restriction.window || 3600000)
      
      case 'cooldown':
        return this.checkCooldown(userId, action, restriction.value)
      
      case 'max_operations':
        return this.checkMaxOperations(userId, action, restriction.value)
      
      default:
        return { allowed: false, reason: `Unknown restriction type: ${restriction.type}` }
    }
  }

  private checkRateLimit(userId: string, action: TimerAction, maxCount: number, windowMs: number): PermissionCheck {
    const userCounts = this.userOperationCounts.get(userId) || new Map()
    const actionCount = userCounts.get(action) || 0
    
    if (actionCount >= maxCount) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${actionCount}/${maxCount} operations in ${windowMs/1000}s`,
        restrictions: [`Rate limit: ${actionCount}/${maxCount} in ${windowMs/1000}s`]
      }
    }

    // Increment count
    userCounts.set(action, actionCount + 1)
    this.userOperationCounts.set(userId, userCounts)

    // Reset count after window
    setTimeout(() => {
      const currentCounts = this.userOperationCounts.get(userId)
      if (currentCounts) {
        const currentCount = currentCounts.get(action) || 0
        currentCounts.set(action, Math.max(0, currentCount - 1))
      }
    }, windowMs)

    return { allowed: true }
  }

  private checkTimeWindow(currentTime: Date, allowedHours: number[], windowMs?: number): PermissionCheck {
    const hour = currentTime.getHours()
    
    if (!allowedHours.includes(hour)) {
      return {
        allowed: false,
        reason: `Operation not allowed at this time (${hour}:00)`,
        restrictions: [`Time window: allowed hours ${allowedHours.join(', ')}`]
      }
    }

    return { allowed: true }
  }

  private checkCooldown(userId: string, action: TimerAction, cooldownMs: number): PermissionCheck {
    const userLastOps = this.userLastOperation.get(userId) || new Map()
    const lastOpTime = userLastOps.get(action)
    
    if (lastOpTime) {
      const timeSinceLastOp = Date.now() - lastOpTime.getTime()
      if (timeSinceLastOp < cooldownMs) {
        const remainingCooldown = Math.ceil((cooldownMs - timeSinceLastOp) / 1000)
        return {
          allowed: false,
          reason: `Cooldown active: ${remainingCooldown}s remaining`,
          restrictions: [`Cooldown: ${remainingCooldown}s remaining`]
        }
      }
    }

    // Update last operation time
    userLastOps.set(action, new Date())
    this.userLastOperation.set(userId, userLastOps)

    return { allowed: true }
  }

  private checkMaxOperations(userId: string, action: TimerAction, maxOperations: number): PermissionCheck {
    const userCounts = this.userOperationCounts.get(userId) || new Map()
    const actionCount = userCounts.get(action) || 0
    
    if (actionCount >= maxOperations) {
      return {
        allowed: false,
        reason: `Maximum operations exceeded: ${actionCount}/${maxOperations}`,
        restrictions: [`Max operations: ${actionCount}/${maxOperations}`]
      }
    }

    return { allowed: true }
  }

  private logPermissionAudit(
    userId: string,
    userRole: string,
    action: TimerAction,
    granted: boolean,
    reason?: string,
    context?: any
  ): void {
    const audit: PermissionAudit = {
      userId,
      userRole,
      action,
      timestamp: new Date(),
      result: granted ? 'granted' : 'denied',
      reason,
      conditions: context,
      matchId: context?.matchId || 'unknown'
    }

    this.auditLog.unshift(audit)

    // Keep only last 1000 audit entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(0, 1000)
    }
  }
}

// Export singleton instance
export const timerPermissionsService = new TimerPermissionsService()
