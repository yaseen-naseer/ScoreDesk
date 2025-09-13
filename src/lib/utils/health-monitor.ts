/**
 * Health monitoring utilities for real-time connections
 */

export interface HealthCheck {
  id: string
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  lastCheck: Date
  responseTime?: number
  error?: string
  metadata?: Record<string, any>
}

export interface HealthMetrics {
  overallStatus: 'healthy' | 'degraded' | 'unhealthy'
  checks: HealthCheck[]
  uptime: number
  averageResponseTime: number
  errorRate: number
  lastUpdated: Date
}

export class HealthMonitor {
  private checks: Map<string, HealthCheck> = new Map()
  private checkHistory: HealthCheck[][] = []
  private maxHistorySize = 100
  private checkInterval?: NodeJS.Timeout
  private isRunning = false

  /**
   * Register a health check
   */
  registerCheck(
    id: string,
    name: string,
    checkFunction: () => Promise<{ status: HealthCheck['status']; responseTime?: number; error?: string; metadata?: Record<string, any> }>
  ): void {
    this.checks.set(id, {
      id,
      name,
      status: 'healthy',
      lastCheck: new Date(),
      checkFunction
    } as any)
  }

  /**
   * Start health monitoring
   */
  start(intervalMs: number = 30000): void {
    if (this.isRunning) return

    this.isRunning = true
    this.checkInterval = setInterval(() => {
      this.performAllChecks()
    }, intervalMs)

    // Perform initial check
    this.performAllChecks()
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = undefined
    }
    this.isRunning = false
  }

  /**
   * Perform all registered health checks
   */
  private async performAllChecks(): Promise<void> {
    const checkPromises = Array.from(this.checks.values()).map(async (check) => {
      try {
        const startTime = performance.now()
        const result = await check.checkFunction()
        const responseTime = performance.now() - startTime

        const updatedCheck: HealthCheck = {
          ...check,
          status: result.status,
          responseTime,
          error: result.error,
          metadata: result.metadata,
          lastCheck: new Date()
        }

        this.checks.set(check.id, updatedCheck)
        return updatedCheck
      } catch (error) {
        const failedCheck: HealthCheck = {
          ...check,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: new Date()
        }

        this.checks.set(check.id, failedCheck)
        return failedCheck
      }
    })

    const results = await Promise.all(checkPromises)
    this.addToHistory(results)
  }

  /**
   * Add check results to history
   */
  private addToHistory(checks: HealthCheck[]): void {
    this.checkHistory.push([...checks])
    
    // Maintain history size
    if (this.checkHistory.length > this.maxHistorySize) {
      this.checkHistory.shift()
    }
  }

  /**
   * Get current health metrics
   */
  getHealthMetrics(): HealthMetrics {
    const checks = Array.from(this.checks.values())
    const now = new Date()
    
    // Calculate overall status
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length
    const degradedCount = checks.filter(c => c.status === 'degraded').length
    
    let overallStatus: HealthMetrics['overallStatus'] = 'healthy'
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy'
    } else if (degradedCount > 0) {
      overallStatus = 'degraded'
    }

    // Calculate average response time
    const responseTimes = checks.filter(c => c.responseTime).map(c => c.responseTime!)
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0

    // Calculate error rate
    const totalChecks = this.checkHistory.length
    const failedChecks = this.checkHistory.reduce((count, historyEntry) => {
      return count + historyEntry.filter(c => c.status === 'unhealthy').length
    }, 0)
    const errorRate = totalChecks > 0 ? (failedChecks / (totalChecks * checks.length)) * 100 : 0

    // Calculate uptime (simplified - based on first check time)
    const firstCheck = this.checkHistory[0]?.[0]?.lastCheck
    const uptime = firstCheck ? now.getTime() - firstCheck.getTime() : 0

    return {
      overallStatus,
      checks,
      uptime,
      averageResponseTime,
      errorRate,
      lastUpdated: now
    }
  }

  /**
   * Get health check history
   */
  getHistory(): HealthCheck[][] {
    return [...this.checkHistory]
  }

  /**
   * Get a specific health check
   */
  getCheck(id: string): HealthCheck | undefined {
    return this.checks.get(id)
  }

  /**
   * Force a specific health check
   */
  async forceCheck(id: string): Promise<HealthCheck | undefined> {
    const check = this.checks.get(id)
    if (!check || !check.checkFunction) return undefined

    try {
      const startTime = performance.now()
      const result = await check.checkFunction()
      const responseTime = performance.now() - startTime

      const updatedCheck: HealthCheck = {
        ...check,
        status: result.status,
        responseTime,
        error: result.error,
        metadata: result.metadata,
        lastCheck: new Date()
      }

      this.checks.set(check.id, updatedCheck)
      return updatedCheck
    } catch (error) {
      const failedCheck: HealthCheck = {
        ...check,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date()
      }

      this.checks.set(check.id, failedCheck)
      return failedCheck
    }
  }

  /**
   * Remove a health check
   */
  unregisterCheck(id: string): void {
    this.checks.delete(id)
  }

  /**
   * Get monitoring status
   */
  isMonitoring(): boolean {
    return this.isRunning
  }
}

// Predefined health check functions
export const HealthChecks = {
  /**
   * Database connection health check
   */
  database: async (supabase: any) => {
    try {
      const startTime = performance.now()
      const { data, error } = await supabase.from('organizations').select('id').limit(1)
      const responseTime = performance.now() - startTime

      if (error) {
        return {
          status: 'unhealthy' as const,
          responseTime,
          error: error.message
        }
      }

      return {
        status: 'healthy' as const,
        responseTime,
        metadata: { recordCount: data?.length || 0 }
      }
    } catch (error) {
      return {
        status: 'unhealthy' as const,
        error: error instanceof Error ? error.message : 'Unknown database error'
      }
    }
  },

  /**
   * Real-time connection health check
   */
  realtime: async (realtimeManager: any) => {
    try {
      const connectionState = realtimeManager.getConnectionState()
      
      if (connectionState.status === 'connected') {
        return {
          status: 'healthy' as const,
          metadata: {
            latency: connectionState.latency,
            quality: connectionState.connectionQuality
          }
        }
      } else if (connectionState.status === 'reconnecting') {
        return {
          status: 'degraded' as const,
          metadata: {
            reconnectAttempts: connectionState.reconnectAttempts
          }
        }
      } else {
        return {
          status: 'unhealthy' as const,
          error: connectionState.error || 'Not connected'
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy' as const,
        error: error instanceof Error ? error.message : 'Unknown realtime error'
      }
    }
  },

  /**
   * Network connectivity health check
   */
  network: async () => {
    try {
      const startTime = performance.now()
      
      // Simple connectivity test
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-cache'
      })
      
      const responseTime = performance.now() - startTime
      
      return {
        status: 'healthy' as const,
        responseTime,
        metadata: {
          online: navigator.onLine,
          userAgent: navigator.userAgent.substring(0, 50)
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy' as const,
        error: error instanceof Error ? error.message : 'Network connectivity issue'
      }
    }
  },

  /**
   * Browser performance health check
   */
  performance: async () => {
    try {
      const startTime = performance.now()
      
      // Simple performance test
      const iterations = 100000
      let result = 0
      for (let i = 0; i < iterations; i++) {
        result += Math.random()
      }
      
      const responseTime = performance.now() - startTime
      
      // Consider performance degraded if it takes more than 10ms
      const status = responseTime > 10 ? 'degraded' : 'healthy'
      
      return {
        status: status as const,
        responseTime,
        metadata: {
          memoryUsage: (performance as any).memory?.usedJSHeapSize,
          iterations
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy' as const,
        error: error instanceof Error ? error.message : 'Performance check failed'
      }
    }
  }
}

// Export singleton instance
export const healthMonitor = new HealthMonitor()
