/**
 * Subscription Retry Manager
 * Handles retry logic, error handling, and recovery for failed subscriptions
 */

import { subscriptionStateManager, SubscriptionState } from './subscription-state-manager'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface RetryConfig {
  maxRetries: number
  baseDelay: number // ms
  maxDelay: number // ms
  backoffMultiplier: number
  jitter: boolean
  retryableErrors: string[]
  nonRetryableErrors: string[]
  exponentialBackoff: boolean
}

export interface RetryAttempt {
  attemptNumber: number
  timestamp: Date
  error: string
  nextRetryAt: Date
  backoffDelay: number
}

export interface RetryStats {
  totalRetries: number
  successfulRetries: number
  failedRetries: number
  averageRetryTime: number
  retrySuccessRate: number
  lastRetryTime?: Date
}

export interface ErrorPattern {
  errorType: string
  frequency: number
  lastOccurred: Date
  resolution: 'automatic' | 'manual' | 'unknown'
}

export type RetryCallback = (subscriptionId: string, attempt: number, error: string) => Promise<boolean>
export type ErrorHandler = (subscriptionId: string, error: string, context: any) => Promise<void>

export class SubscriptionRetryManager {
  private retryQueue: Map<string, RetryAttempt[]> = new Map()
  private retryTimers: Map<string, NodeJS.Timeout> = new Map()
  private errorPatterns: Map<string, ErrorPattern> = new Map()
  private retryStats: RetryStats = {
    totalRetries: 0,
    successfulRetries: 0,
    failedRetries: 0,
    averageRetryTime: 0,
    retrySuccessRate: 0
  }
  
  private retryCallbacks: Set<RetryCallback> = new Set()
  private errorHandlers: Set<ErrorHandler> = new Set()
  
  private config: RetryConfig = {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [
      'NETWORK_ERROR',
      'TIMEOUT',
      'CONNECTION_LOST',
      'TEMPORARY_FAILURE'
    ],
    nonRetryableErrors: [
      'INVALID_CREDENTIALS',
      'PERMISSION_DENIED',
      'RESOURCE_NOT_FOUND',
      'INVALID_SUBSCRIPTION'
    ],
    exponentialBackoff: true
  }

  constructor() {
    // Listen for subscription errors
    subscriptionStateManager.onEvent((event) => {
      if (event.type === 'error') {
        this.handleSubscriptionError(event.subscriptionId, event.error || 'Unknown error')
      }
    })
  }

  /**
   * Update retry configuration
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current retry configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config }
  }

  /**
   * Get retry statistics
   */
  getRetryStats(): RetryStats {
    return { ...this.retryStats }
  }

  /**
   * Get error patterns
   */
  getErrorPatterns(): ErrorPattern[] {
    return Array.from(this.errorPatterns.values())
  }

  /**
   * Get retry attempts for subscription
   */
  getRetryAttempts(subscriptionId: string): RetryAttempt[] {
    return this.retryQueue.get(subscriptionId) || []
  }

  /**
   * Handle subscription error
   */
  async handleSubscriptionError(subscriptionId: string, error: string): Promise<void> {
    const subscription = subscriptionStateManager.getSubscriptionState(subscriptionId)
    if (!subscription) return

    // Update error pattern
    this.updateErrorPattern(error)

    // Check if error is retryable
    if (!this.isRetryableError(error)) {
      await this.handleNonRetryableError(subscriptionId, error)
      return
    }

    // Check if max retries reached
    if (subscription.retryCount >= subscription.maxRetries) {
      await this.handleMaxRetriesReached(subscriptionId, error)
      return
    }

    // Schedule retry
    await this.scheduleRetry(subscriptionId, error)
  }

  /**
   * Schedule retry for subscription
   */
  async scheduleRetry(subscriptionId: string, error: string): Promise<void> {
    const subscription = subscriptionStateManager.getSubscriptionState(subscriptionId)
    if (!subscription) return

    const attemptNumber = subscription.retryCount + 1
    const backoffDelay = this.calculateBackoffDelay(attemptNumber)
    const nextRetryAt = new Date(Date.now() + backoffDelay)

    const retryAttempt: RetryAttempt = {
      attemptNumber,
      timestamp: new Date(),
      error,
      nextRetryAt,
      backoffDelay
    }

    // Add to retry queue
    const attempts = this.retryQueue.get(subscriptionId) || []
    attempts.push(retryAttempt)
    this.retryQueue.set(subscriptionId, attempts)

    // Set timer for retry
    const timer = setTimeout(async () => {
      await this.executeRetry(subscriptionId)
    }, backoffDelay)

    this.retryTimers.set(subscriptionId, timer)

    // Update subscription state
    subscriptionStateManager.updateSubscriptionState(subscriptionId, {
      status: 'pending',
      error: `Retry ${attemptNumber}/${subscription.maxRetries}: ${error}`
    })

    console.log(`Scheduled retry ${attemptNumber} for subscription ${subscriptionId} in ${backoffDelay}ms`)
  }

  /**
   * Execute retry for subscription
   */
  private async executeRetry(subscriptionId: string): Promise<void> {
    const subscription = subscriptionStateManager.getSubscriptionState(subscriptionId)
    if (!subscription) return

    const startTime = Date.now()
    let success = false

    try {
      // Notify retry callbacks
      for (const callback of this.retryCallbacks) {
        try {
          const result = await callback(subscriptionId, subscription.retryCount + 1, subscription.error || '')
          if (result) {
            success = true
            break
          }
        } catch (error) {
          console.error('Error in retry callback:', error)
        }
      }

      if (success) {
        await this.handleRetrySuccess(subscriptionId, Date.now() - startTime)
      } else {
        await this.handleRetryFailure(subscriptionId, 'Retry callback failed')
      }
    } catch (error) {
      await this.handleRetryFailure(subscriptionId, error instanceof Error ? error.message : 'Unknown error')
    } finally {
      // Clean up timer
      this.retryTimers.delete(subscriptionId)
    }
  }

  /**
   * Handle successful retry
   */
  private async handleRetrySuccess(subscriptionId: string, retryTime: number): Promise<void> {
    const subscription = subscriptionStateManager.getSubscriptionState(subscriptionId)
    if (!subscription) return

    // Update subscription state
    subscriptionStateManager.updateSubscriptionState(subscriptionId, {
      status: 'subscribed',
      error: undefined,
      retryCount: subscription.retryCount + 1
    })

    // Update stats
    this.retryStats.successfulRetries++
    this.retryStats.totalRetries++
    this.retryStats.lastRetryTime = new Date()
    this.updateRetrySuccessRate()

    // Update average retry time
    this.retryStats.averageRetryTime = 
      (this.retryStats.averageRetryTime * (this.retryStats.successfulRetries - 1) + retryTime) / 
      this.retryStats.successfulRetries

    // Clear retry queue
    this.retryQueue.delete(subscriptionId)

    console.log(`Retry successful for subscription ${subscriptionId}`)
  }

  /**
   * Handle failed retry
   */
  private async handleRetryFailure(subscriptionId: string, error: string): Promise<void> {
    const subscription = subscriptionStateManager.getSubscriptionState(subscriptionId)
    if (!subscription) return

    // Update subscription state
    subscriptionStateManager.updateSubscriptionState(subscriptionId, {
      status: 'error',
      error: error,
      retryCount: subscription.retryCount + 1
    })

    // Update stats
    this.retryStats.failedRetries++
    this.retryStats.totalRetries++
    this.retryStats.lastRetryTime = new Date()
    this.updateRetrySuccessRate()

    // Check if we should retry again
    if (subscription.retryCount + 1 < subscription.maxRetries) {
      await this.scheduleRetry(subscriptionId, error)
    } else {
      await this.handleMaxRetriesReached(subscriptionId, error)
    }

    console.log(`Retry failed for subscription ${subscriptionId}: ${error}`)
  }

  /**
   * Handle non-retryable error
   */
  private async handleNonRetryableError(subscriptionId: string, error: string): Promise<void> {
    const subscription = subscriptionStateManager.getSubscriptionState(subscriptionId)
    if (!subscription) return

    // Update subscription state
    subscriptionStateManager.updateSubscriptionState(subscriptionId, {
      status: 'error',
      error: `Non-retryable error: ${error}`
    })

    // Notify error handlers
    for (const handler of this.errorHandlers) {
      try {
        await handler(subscriptionId, error, { type: 'non_retryable' })
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError)
      }
    }

    console.log(`Non-retryable error for subscription ${subscriptionId}: ${error}`)
  }

  /**
   * Handle max retries reached
   */
  private async handleMaxRetriesReached(subscriptionId: string, error: string): Promise<void> {
    const subscription = subscriptionStateManager.getSubscriptionState(subscriptionId)
    if (!subscription) return

    // Update subscription state
    subscriptionStateManager.updateSubscriptionState(subscriptionId, {
      status: 'error',
      error: `Max retries (${subscription.maxRetries}) reached: ${error}`
    })

    // Notify error handlers
    for (const handler of this.errorHandlers) {
      try {
        await handler(subscriptionId, error, { type: 'max_retries_reached', maxRetries: subscription.maxRetries })
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError)
      }
    }

    // Clear retry queue
    this.retryQueue.delete(subscriptionId)

    console.log(`Max retries reached for subscription ${subscriptionId}`)
  }

  /**
   * Calculate backoff delay
   */
  private calculateBackoffDelay(attemptNumber: number): number {
    let delay = this.config.baseDelay

    if (this.config.exponentialBackoff) {
      delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attemptNumber - 1)
    }

    // Cap at max delay
    delay = Math.min(delay, this.config.maxDelay)

    // Add jitter if enabled
    if (this.config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5)
    }

    return Math.floor(delay)
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: string): boolean {
    const errorLower = error.toLowerCase()
    
    // Check non-retryable errors first
    for (const nonRetryableError of this.config.nonRetryableErrors) {
      if (errorLower.includes(nonRetryableError.toLowerCase())) {
        return false
      }
    }

    // Check retryable errors
    for (const retryableError of this.config.retryableErrors) {
      if (errorLower.includes(retryableError.toLowerCase())) {
        return true
      }
    }

    // Default to retryable for unknown errors
    return true
  }

  /**
   * Update error pattern
   */
  private updateErrorPattern(error: string): void {
    const pattern = this.errorPatterns.get(error) || {
      errorType: error,
      frequency: 0,
      lastOccurred: new Date(),
      resolution: 'unknown' as const
    }

    pattern.frequency++
    pattern.lastOccurred = new Date()

    this.errorPatterns.set(error, pattern)
  }

  /**
   * Update retry success rate
   */
  private updateRetrySuccessRate(): void {
    if (this.retryStats.totalRetries > 0) {
      this.retryStats.retrySuccessRate = 
        (this.retryStats.successfulRetries / this.retryStats.totalRetries) * 100
    }
  }

  /**
   * Cancel retry for subscription
   */
  cancelRetry(subscriptionId: string): boolean {
    const timer = this.retryTimers.get(subscriptionId)
    if (timer) {
      clearTimeout(timer)
      this.retryTimers.delete(subscriptionId)
      this.retryQueue.delete(subscriptionId)
      return true
    }
    return false
  }

  /**
   * Cancel all retries
   */
  cancelAllRetries(): void {
    for (const [subscriptionId, timer] of this.retryTimers) {
      clearTimeout(timer)
    }
    this.retryTimers.clear()
    this.retryQueue.clear()
  }

  /**
   * Register retry callback
   */
  onRetry(callback: RetryCallback): () => void {
    this.retryCallbacks.add(callback)
    return () => this.retryCallbacks.delete(callback)
  }

  /**
   * Register error handler
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler)
    return () => this.errorHandlers.delete(handler)
  }

  /**
   * Get pending retries
   */
  getPendingRetries(): Array<{ subscriptionId: string; nextRetryAt: Date; attempts: number }> {
    const pending: Array<{ subscriptionId: string; nextRetryAt: Date; attempts: number }> = []
    
    for (const [subscriptionId, attempts] of this.retryQueue) {
      const latestAttempt = attempts[attempts.length - 1]
      pending.push({
        subscriptionId,
        nextRetryAt: latestAttempt.nextRetryAt,
        attempts: attempts.length
      })
    }

    return pending.sort((a, b) => a.nextRetryAt.getTime() - b.nextRetryAt.getTime())
  }

  /**
   * Force retry for subscription
   */
  async forceRetry(subscriptionId: string): Promise<void> {
    const timer = this.retryTimers.get(subscriptionId)
    if (timer) {
      clearTimeout(timer)
      this.retryTimers.delete(subscriptionId)
    }

    await this.executeRetry(subscriptionId)
  }

  /**
   * Reset retry count for subscription
   */
  resetRetryCount(subscriptionId: string): boolean {
    const subscription = subscriptionStateManager.getSubscriptionState(subscriptionId)
    if (!subscription) return false

    subscriptionStateManager.updateSubscriptionState(subscriptionId, {
      retryCount: 0,
      error: undefined
    })

    this.retryQueue.delete(subscriptionId)
    return true
  }

  /**
   * Get retry recommendations
   */
  getRetryRecommendations(): {
    shouldAdjustConfig: boolean
    recommendations: string[]
    errorPatterns: ErrorPattern[]
  } {
    const recommendations: string[] = []
    const errorPatterns = Array.from(this.errorPatterns.values())
    let shouldAdjustConfig = false

    // Check success rate
    if (this.retryStats.retrySuccessRate < 50 && this.retryStats.totalRetries > 10) {
      recommendations.push('Low retry success rate - consider increasing base delay or reducing max retries')
      shouldAdjustConfig = true
    }

    // Check frequent errors
    const frequentErrors = errorPatterns.filter(p => p.frequency > 5)
    if (frequentErrors.length > 0) {
      recommendations.push('Frequent errors detected - investigate error patterns')
    }

    // Check average retry time
    if (this.retryStats.averageRetryTime > 10000) {
      recommendations.push('High average retry time - consider optimizing retry logic')
      shouldAdjustConfig = true
    }

    return {
      shouldAdjustConfig,
      recommendations,
      errorPatterns
    }
  }

  /**
   * Cleanup old retry data
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): number {
    const cutoff = new Date(Date.now() - maxAge)
    let cleaned = 0

    // Clean up old retry attempts
    for (const [subscriptionId, attempts] of this.retryQueue) {
      const filteredAttempts = attempts.filter(attempt => attempt.timestamp > cutoff)
      if (filteredAttempts.length !== attempts.length) {
        if (filteredAttempts.length === 0) {
          this.retryQueue.delete(subscriptionId)
        } else {
          this.retryQueue.set(subscriptionId, filteredAttempts)
        }
        cleaned += attempts.length - filteredAttempts.length
      }
    }

    // Clean up old error patterns
    for (const [error, pattern] of this.errorPatterns) {
      if (pattern.lastOccurred < cutoff) {
        this.errorPatterns.delete(error)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Stop the retry manager
   */
  stop(): void {
    this.cancelAllRetries()
    this.retryCallbacks.clear()
    this.errorHandlers.clear()
  }
}

// Export singleton instance
export const subscriptionRetryManager = new SubscriptionRetryManager()
