/**
 * Subscription Lifecycle Hooks
 * Event-driven lifecycle management for subscriptions with hooks and middleware
 */

import { subscriptionStateManager, SubscriptionState } from './subscription-state-manager'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface LifecycleHook {
  id: string
  name: string
  event: LifecycleEvent
  priority: number
  enabled: boolean
  callback: LifecycleHookCallback
  metadata?: {
    description?: string
    tags?: string[]
    dependencies?: string[]
  }
}

export interface LifecycleEvent {
  type: 'before_create' | 'after_create' | 'before_subscribe' | 'after_subscribe' | 
        'before_unsubscribe' | 'after_unsubscribe' | 'before_destroy' | 'after_destroy' |
        'on_error' | 'on_retry' | 'on_reconnect' | 'on_performance_update'
  subscriptionId?: string
  data?: any
}

export interface LifecycleContext {
  subscriptionId: string
  channelName: string
  tableName?: string
  filter?: any
  metadata?: any
  error?: string
  performance?: any
}

export type LifecycleHookCallback = (context: LifecycleContext) => Promise<boolean | void>

export interface HookMiddleware {
  id: string
  name: string
  priority: number
  enabled: boolean
  before?: (context: LifecycleContext) => Promise<boolean>
  after?: (context: LifecycleContext, result: any) => Promise<void>
  error?: (context: LifecycleContext, error: Error) => Promise<void>
}

export interface LifecycleMetrics {
  totalHooks: number
  activeHooks: number
  hookExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageExecutionTime: number
  lastExecution?: Date
}

export class SubscriptionLifecycleHooks {
  private hooks: Map<string, LifecycleHook> = new Map()
  private middleware: Map<string, HookMiddleware> = new Map()
  private executionHistory: Array<{
    hookId: string
    event: LifecycleEvent['type']
    subscriptionId: string
    success: boolean
    executionTime: number
    timestamp: Date
    error?: string
  }> = []
  
  private metrics: LifecycleMetrics = {
    totalHooks: 0,
    activeHooks: 0,
    hookExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageExecutionTime: 0,
  }

  constructor() {
    this.initializeDefaultHooks()
  }

  /**
   * Register a lifecycle hook
   */
  registerHook(hook: Omit<LifecycleHook, 'id'>): string {
    const id = this.generateHookId(hook.name)
    const lifecycleHook: LifecycleHook = {
      ...hook,
      id,
      enabled: hook.enabled !== false
    }

    this.hooks.set(id, lifecycleHook)
    this.updateMetrics()
    
    return id
  }

  /**
   * Unregister a lifecycle hook
   */
  unregisterHook(hookId: string): boolean {
    const removed = this.hooks.delete(hookId)
    if (removed) {
      this.updateMetrics()
    }
    return removed
  }

  /**
   * Enable/disable a hook
   */
  setHookEnabled(hookId: string, enabled: boolean): boolean {
    const hook = this.hooks.get(hookId)
    if (hook) {
      hook.enabled = enabled
      this.updateMetrics()
      return true
    }
    return false
  }

  /**
   * Register middleware
   */
  registerMiddleware(middleware: Omit<HookMiddleware, 'id'>): string {
    const id = this.generateMiddlewareId(middleware.name)
    const lifecycleMiddleware: HookMiddleware = {
      ...middleware,
      id,
      enabled: middleware.enabled !== false
    }

    this.middleware.set(id, lifecycleMiddleware)
    return id
  }

  /**
   * Unregister middleware
   */
  unregisterMiddleware(middlewareId: string): boolean {
    return this.middleware.delete(middlewareId)
  }

  /**
   * Execute hooks for a lifecycle event
   */
  async executeHooks(event: LifecycleEvent, context: LifecycleContext): Promise<boolean> {
    const relevantHooks = this.getHooksForEvent(event.type)
      .filter(hook => hook.enabled)
      .sort((a, b) => a.priority - b.priority)

    let shouldContinue = true

    for (const hook of relevantHooks) {
      const startTime = Date.now()
      let success = false
      let error: string | undefined

      try {
        // Execute middleware before hook
        const middleware = this.getMiddlewareForPriority(hook.priority)
        for (const mw of middleware) {
          if (mw.enabled && mw.before) {
            const middlewareResult = await mw.before(context)
            if (!middlewareResult) {
              shouldContinue = false
              break
            }
          }
        }

        if (!shouldContinue) break

        // Execute hook
        const hookResult = await hook.callback(context)
        
        // If hook returns false, stop execution
        if (hookResult === false) {
          shouldContinue = false
        }

        success = true

        // Execute middleware after hook
        for (const mw of middleware) {
          if (mw.enabled && mw.after) {
            await mw.after(context, hookResult)
          }
        }

      } catch (err) {
        error = err instanceof Error ? err.message : 'Unknown error'
        
        // Execute error middleware
        const middleware = this.getMiddlewareForPriority(hook.priority)
        for (const mw of middleware) {
          if (mw.enabled && mw.error) {
            await mw.error(context, err instanceof Error ? err : new Error(String(err)))
          }
        }

        shouldContinue = false
      } finally {
        const executionTime = Date.now() - startTime
        
        // Record execution
        this.recordExecution({
          hookId: hook.id,
          event: event.type,
          subscriptionId: context.subscriptionId,
          success,
          executionTime,
          timestamp: new Date(),
          error
        })

        // Update metrics
        this.updateMetrics()
      }

      if (!shouldContinue) break
    }

    return shouldContinue
  }

  /**
   * Get hooks for a specific event type
   */
  getHooksForEvent(eventType: LifecycleEvent['type']): LifecycleHook[] {
    return Array.from(this.hooks.values())
      .filter(hook => hook.event.type === eventType)
      .sort((a, b) => a.priority - b.priority)
  }

  /**
   * Get all registered hooks
   */
  getAllHooks(): LifecycleHook[] {
    return Array.from(this.hooks.values())
  }

  /**
   * Get all registered middleware
   */
  getAllMiddleware(): HookMiddleware[] {
    return Array.from(this.middleware.values())
  }

  /**
   * Get lifecycle metrics
   */
  getMetrics(): LifecycleMetrics {
    return { ...this.metrics }
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit?: number): typeof this.executionHistory {
    const history = [...this.executionHistory]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    
    return limit ? history.slice(0, limit) : history
  }

  /**
   * Get execution history for a specific hook
   */
  getHookExecutionHistory(hookId: string, limit?: number): typeof this.executionHistory {
    const history = this.executionHistory
      .filter(execution => execution.hookId === hookId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    
    return limit ? history.slice(0, limit) : history
  }

  /**
   * Initialize default hooks
   */
  private initializeDefaultHooks(): void {
    // Logging hook
    this.registerHook({
      name: 'Default Logging',
      event: { type: 'after_create' },
      priority: 1000,
      callback: async (context) => {
        console.log(`Subscription created: ${context.subscriptionId} for ${context.channelName}`)
      }
    })

    // Performance monitoring hook
    this.registerHook({
      name: 'Performance Monitor',
      event: { type: 'on_performance_update' },
      priority: 500,
      callback: async (context) => {
        if (context.performance) {
          subscriptionStateManager.recordPerformance(context.subscriptionId, context.performance)
        }
      }
    })

    // Error handling hook
    this.registerHook({
      name: 'Error Handler',
      event: { type: 'on_error' },
      priority: 100,
      callback: async (context) => {
        if (context.error) {
          subscriptionStateManager.setSubscriptionStatus(context.subscriptionId, 'error', context.error)
        }
      }
    })

    // Activity tracking hook
    this.registerHook({
      name: 'Activity Tracker',
      event: { type: 'after_subscribe' },
      priority: 200,
      callback: async (context) => {
        subscriptionStateManager.recordActivity(context.subscriptionId, 'message')
      }
    })
  }

  /**
   * Get middleware for a specific priority range
   */
  private getMiddlewareForPriority(priority: number): HookMiddleware[] {
    return Array.from(this.middleware.values())
      .filter(mw => mw.priority <= priority)
      .sort((a, b) => a.priority - b.priority)
  }

  /**
   * Record hook execution
   */
  private recordExecution(execution: typeof this.executionHistory[0]): void {
    this.executionHistory.push(execution)
    
    // Keep only last 1000 executions
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(-1000)
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    const hooks = Array.from(this.hooks.values())
    const executions = this.executionHistory

    this.metrics.totalHooks = hooks.length
    this.metrics.activeHooks = hooks.filter(h => h.enabled).length
    this.metrics.hookExecutions = executions.length
    this.metrics.successfulExecutions = executions.filter(e => e.success).length
    this.metrics.failedExecutions = executions.filter(e => !e.success).length
    
    if (executions.length > 0) {
      this.metrics.averageExecutionTime = executions.reduce((sum, e) => sum + e.executionTime, 0) / executions.length
      this.metrics.lastExecution = executions[executions.length - 1]?.timestamp
    }
  }

  /**
   * Generate hook ID
   */
  private generateHookId(name: string): string {
    return `hook_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`
  }

  /**
   * Generate middleware ID
   */
  private generateMiddlewareId(name: string): string {
    return `middleware_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`
  }

  /**
   * Create common hook templates
   */
  static createHooks = {
    /**
     * Create a validation hook
     */
    validation: (validator: (context: LifecycleContext) => Promise<boolean>) => ({
      name: 'Validation Hook',
      event: { type: 'before_create' },
      priority: 100,
      callback: async (context) => {
        return await validator(context)
      }
    }),

    /**
     * Create a logging hook
     */
    logging: (eventType: LifecycleEvent['type'], message: string) => ({
      name: `Logging Hook - ${eventType}`,
      event: { type: eventType },
      priority: 1000,
      callback: async (context) => {
        console.log(`${message}: ${context.subscriptionId}`)
      }
    }),

    /**
     * Create a metrics collection hook
     */
    metrics: (eventType: LifecycleEvent['type']) => ({
      name: `Metrics Hook - ${eventType}`,
      event: { type: eventType },
      priority: 500,
      callback: async (context) => {
        subscriptionStateManager.recordActivity(context.subscriptionId, 'message')
      }
    }),

    /**
     * Create a cleanup hook
     */
    cleanup: (eventType: LifecycleEvent['type']) => ({
      name: `Cleanup Hook - ${eventType}`,
      event: { type: eventType },
      priority: 200,
      callback: async (context) => {
        // Implement cleanup logic here
        console.log(`Cleanup triggered for ${context.subscriptionId}`)
      }
    }),

    /**
     * Create a notification hook
     */
    notification: (eventType: LifecycleEvent['type'], notifier: (context: LifecycleContext) => Promise<void>) => ({
      name: `Notification Hook - ${eventType}`,
      event: { type: eventType },
      priority: 300,
      callback: async (context) => {
        await notifier(context)
      }
    })
  }

  /**
   * Create common middleware templates
   */
  static createMiddleware = {
    /**
     * Create authentication middleware
     */
    authentication: (authChecker: (context: LifecycleContext) => Promise<boolean>) => ({
      name: 'Authentication Middleware',
      priority: 50,
      before: async (context) => {
        return await authChecker(context)
      }
    }),

    /**
     * Create rate limiting middleware
     */
    rateLimit: (maxRequests: number, windowMs: number) => {
      const requests: Map<string, number[]> = new Map()
      
      return {
        name: 'Rate Limit Middleware',
        priority: 100,
        before: async (context) => {
          const now = Date.now()
          const key = context.subscriptionId
          const userRequests = requests.get(key) || []
          
          // Remove old requests
          const recentRequests = userRequests.filter(time => now - time < windowMs)
          
          if (recentRequests.length >= maxRequests) {
            return false // Rate limit exceeded
          }
          
          recentRequests.push(now)
          requests.set(key, recentRequests)
          return true
        }
      }
    },

    /**
     * Create caching middleware
     */
    caching: (cacheKey: (context: LifecycleContext) => string, ttl: number) => {
      const cache = new Map<string, { data: any; expiry: number }>()
      
      return {
        name: 'Caching Middleware',
        priority: 150,
        before: async (context) => {
          const key = cacheKey(context)
          const cached = cache.get(key)
          
          if (cached && cached.expiry > Date.now()) {
            context.metadata = { ...context.metadata, cached: cached.data }
            return true
          }
          
          return true
        },
        after: async (context, result) => {
          const key = cacheKey(context)
          cache.set(key, {
            data: result,
            expiry: Date.now() + ttl
          })
        }
      }
    }
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory = []
    this.updateMetrics()
  }

  /**
   * Export hooks configuration
   */
  exportConfiguration(): {
    hooks: LifecycleHook[]
    middleware: HookMiddleware[]
    metrics: LifecycleMetrics
  } {
    return {
      hooks: Array.from(this.hooks.values()),
      middleware: Array.from(this.middleware.values()),
      metrics: this.getMetrics()
    }
  }

  /**
   * Import hooks configuration
   */
  importConfiguration(config: {
    hooks?: LifecycleHook[]
    middleware?: HookMiddleware[]
  }): void {
    if (config.hooks) {
      config.hooks.forEach(hook => {
        this.hooks.set(hook.id, hook)
      })
    }
    
    if (config.middleware) {
      config.middleware.forEach(mw => {
        this.middleware.set(mw.id, mw)
      })
    }
    
    this.updateMetrics()
  }
}

// Export singleton instance
export const subscriptionLifecycleHooks = new SubscriptionLifecycleHooks()
