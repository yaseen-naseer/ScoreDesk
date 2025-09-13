/**
 * Real-time Testing Utilities
 * Comprehensive testing tools for real-time functionality
 */

import { subscriptionStateManager } from './subscription-state-manager'
import { subscriptionHealthMonitor } from './subscription-health-monitor'
import { subscriptionPerformanceMetrics } from './subscription-performance-metrics'
import { subscriptionDebugger } from './subscription-debugger'
import { realtimeEventLogger } from './realtime-event-logger'
import { realtimeErrorTracker } from './realtime-error-tracker'
import { EnhancedRealtimeManager } from '@/lib/supabase/realtime-enhanced'

export interface TestScenario {
  id: string
  name: string
  description: string
  category: 'connection' | 'subscription' | 'performance' | 'error' | 'sync' | 'conflict'
  setup: () => Promise<void>
  execute: () => Promise<TestResult>
  cleanup: () => Promise<void>
  expectedResult: any
  timeout: number
  retries: number
}

export interface TestResult {
  id: string
  scenarioId: string
  success: boolean
  duration: number
  startTime: Date
  endTime: Date
  error?: string
  metrics?: {
    subscriptionCount: number
    connectionHealth: number
    errorCount: number
    latency: number
    memoryUsage: number
  }
  details?: any
}

export interface TestSuite {
  id: string
  name: string
  description: string
  scenarios: TestScenario[]
  setup: () => Promise<void>
  cleanup: () => Promise<void>
  parallel: boolean
  timeout: number
}

export interface TestReport {
  id: string
  suiteId: string
  startTime: Date
  endTime: Date
  duration: number
  totalScenarios: number
  passedScenarios: number
  failedScenarios: number
  skippedScenarios: number
  results: TestResult[]
  summary: {
    passRate: number
    averageDuration: number
    totalErrors: number
    performanceScore: number
  }
}

export type TestProgressCallback = (result: TestResult) => void
export type TestSuiteProgressCallback = (report: TestReport) => void

export class RealtimeTestingUtils {
  private scenarios: Map<string, TestScenario> = new Map()
  private suites: Map<string, TestSuite> = new Map()
  private results: TestResult[] = []
  private reports: TestReport[] = []
  
  private progressCallbacks: Set<TestProgressCallback> = new Set()
  private suiteProgressCallbacks: Set<TestSuiteProgressCallback> = new Set()
  
  private realtimeManager: EnhancedRealtimeManager

  constructor() {
    this.realtimeManager = new EnhancedRealtimeManager()
    this.initializeDefaultScenarios()
    this.initializeDefaultSuites()
  }

  /**
   * Register a test scenario
   */
  registerScenario(scenario: TestScenario): void {
    this.scenarios.set(scenario.id, scenario)
  }

  /**
   * Register a test suite
   */
  registerSuite(suite: TestSuite): void {
    this.suites.set(suite.id, suite)
  }

  /**
   * Run a single test scenario
   */
  async runScenario(scenarioId: string): Promise<TestResult> {
    const scenario = this.scenarios.get(scenarioId)
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`)
    }

    const result: TestResult = {
      id: this.generateResultId(),
      scenarioId,
      success: false,
      duration: 0,
      startTime: new Date(),
      endTime: new Date(),
      metrics: {
        subscriptionCount: 0,
        connectionHealth: 0,
        errorCount: 0,
        latency: 0,
        memoryUsage: 0
      }
    }

    try {
      // Setup
      await scenario.setup()
      
      // Capture initial metrics
      result.metrics = await this.captureMetrics()
      
      // Execute test
      const startTime = Date.now()
      const testResult = await Promise.race([
        scenario.execute(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), scenario.timeout)
        )
      ])
      
      result.duration = Date.now() - startTime
      result.endTime = new Date()
      result.success = this.evaluateResult(testResult, scenario.expectedResult)
      result.details = testResult
      
    } catch (error) {
      result.endTime = new Date()
      result.duration = result.endTime.getTime() - result.startTime.getTime()
      result.error = error instanceof Error ? error.message : String(error)
      result.success = false
    } finally {
      // Cleanup
      try {
        await scenario.cleanup()
      } catch (cleanupError) {
        console.warn('Cleanup failed:', cleanupError)
      }
    }

    this.results.push(result)
    this.notifyProgressCallbacks(result)
    
    return result
  }

  /**
   * Run a test suite
   */
  async runSuite(suiteId: string): Promise<TestReport> {
    const suite = this.suites.get(suiteId)
    if (!suite) {
      throw new Error(`Suite ${suiteId} not found`)
    }

    const report: TestReport = {
      id: this.generateReportId(),
      suiteId,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      totalScenarios: suite.scenarios.length,
      passedScenarios: 0,
      failedScenarios: 0,
      skippedScenarios: 0,
      results: [],
      summary: {
        passRate: 0,
        averageDuration: 0,
        totalErrors: 0,
        performanceScore: 0
      }
    }

    try {
      // Suite setup
      await suite.setup()

      // Run scenarios
      if (suite.parallel) {
        // Run scenarios in parallel
        const scenarioPromises = suite.scenarios.map(scenario => this.runScenario(scenario.id))
        const results = await Promise.allSettled(scenarioPromises)
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            report.results.push(result.value)
          } else {
            report.results.push({
              id: this.generateResultId(),
              scenarioId: suite.scenarios[index].id,
              success: false,
              duration: 0,
              startTime: new Date(),
              endTime: new Date(),
              error: result.reason?.message || 'Unknown error'
            })
          }
        })
      } else {
        // Run scenarios sequentially
        for (const scenario of suite.scenarios) {
          try {
            const result = await this.runScenario(scenario.id)
            report.results.push(result)
          } catch (error) {
            report.results.push({
              id: this.generateResultId(),
              scenarioId: scenario.id,
              success: false,
              duration: 0,
              startTime: new Date(),
              endTime: new Date(),
              error: error instanceof Error ? error.message : String(error)
            })
          }
        }
      }

    } finally {
      // Suite cleanup
      try {
        await suite.cleanup()
      } catch (cleanupError) {
        console.warn('Suite cleanup failed:', cleanupError)
      }
    }

    // Calculate summary
    report.endTime = new Date()
    report.duration = report.endTime.getTime() - report.startTime.getTime()
    report.passedScenarios = report.results.filter(r => r.success).length
    report.failedScenarios = report.results.filter(r => !r.success).length
    report.skippedScenarios = 0 // TODO: Implement skip logic
    
    report.summary = {
      passRate: report.totalScenarios > 0 ? (report.passedScenarios / report.totalScenarios) * 100 : 0,
      averageDuration: report.results.length > 0 
        ? report.results.reduce((sum, r) => sum + r.duration, 0) / report.results.length 
        : 0,
      totalErrors: report.results.filter(r => !r.success).length,
      performanceScore: this.calculatePerformanceScore(report.results)
    }

    this.reports.push(report)
    this.notifySuiteProgressCallbacks(report)
    
    return report
  }

  /**
   * Run all test scenarios
   */
  async runAllScenarios(): Promise<TestReport[]> {
    const reports: TestReport[] = []
    
    for (const suite of this.suites.values()) {
      try {
        const report = await this.runSuite(suite.id)
        reports.push(report)
      } catch (error) {
        console.error(`Failed to run suite ${suite.id}:`, error)
      }
    }
    
    return reports
  }

  /**
   * Generate test data for scenarios
   */
  generateTestData(type: string, count: number = 1): any[] {
    const data = []
    
    for (let i = 0; i < count; i++) {
      switch (type) {
        case 'match':
          data.push({
            id: `test_match_${i}`,
            home_team_id: `team_${i}_a`,
            away_team_id: `team_${i}_b`,
            tournament_id: `tournament_${i}`,
            scheduled_at: new Date(Date.now() + i * 60000).toISOString(),
            status: 'scheduled'
          })
          break
          
        case 'team':
          data.push({
            id: `test_team_${i}`,
            name: `Test Team ${i}`,
            organization_id: `org_${i}`,
            created_at: new Date().toISOString()
          })
          break
          
        case 'player':
          data.push({
            id: `test_player_${i}`,
            name: `Test Player ${i}`,
            team_id: `team_${i}`,
            position: 'forward',
            jersey_number: i + 1
          })
          break
          
        default:
          data.push({
            id: `test_${type}_${i}`,
            name: `Test ${type} ${i}`,
            created_at: new Date().toISOString()
          })
      }
    }
    
    return data
  }

  /**
   * Simulate network conditions
   */
  async simulateNetworkConditions(
    type: 'slow' | 'unstable' | 'offline' | 'high_latency',
    duration: number = 5000
  ): Promise<void> {
    const originalFetch = window.fetch
    const startTime = Date.now()
    
    switch (type) {
      case 'slow':
        window.fetch = async (...args) => {
          await new Promise(resolve => setTimeout(resolve, 2000))
          return originalFetch(...args)
        }
        break
        
      case 'unstable':
        window.fetch = async (...args) => {
          if (Math.random() < 0.3) {
            throw new Error('Network error')
          }
          return originalFetch(...args)
        }
        break
        
      case 'offline':
        // Mock offline state
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false
        })
        break
        
      case 'high_latency':
        window.fetch = async (...args) => {
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
          return originalFetch(...args)
        }
        break
    }
    
    // Restore after duration
    setTimeout(() => {
      window.fetch = originalFetch
      if (type === 'offline') {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true
        })
      }
    }, duration)
  }

  /**
   * Get test results
   */
  getResults(limit?: number): TestResult[] {
    const sortedResults = [...this.results].sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    return limit ? sortedResults.slice(0, limit) : sortedResults
  }

  /**
   * Get test reports
   */
  getReports(limit?: number): TestReport[] {
    const sortedReports = [...this.reports].sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    return limit ? sortedReports.slice(0, limit) : sortedReports
  }

  /**
   * Clear test data
   */
  clearResults(): void {
    this.results = []
    this.reports = []
  }

  /**
   * Register progress callback
   */
  onProgress(callback: TestProgressCallback): () => void {
    this.progressCallbacks.add(callback)
    return () => this.progressCallbacks.delete(callback)
  }

  /**
   * Register suite progress callback
   */
  onSuiteProgress(callback: TestSuiteProgressCallback): () => void {
    this.suiteProgressCallbacks.add(callback)
    return () => this.suiteProgressCallbacks.delete(callback)
  }

  /**
   * Initialize default test scenarios
   */
  private initializeDefaultScenarios(): void {
    // Connection test
    this.registerScenario({
      id: 'connection_test',
      name: 'Connection Test',
      description: 'Test real-time connection establishment and stability',
      category: 'connection',
      setup: async () => {
        await this.realtimeManager.disconnect()
      },
      execute: async () => {
        await this.realtimeManager.connect()
        const connectionState = this.realtimeManager.getConnectionState()
        return { connected: connectionState.status === 'connected' }
      },
      cleanup: async () => {
        await this.realtimeManager.disconnect()
      },
      expectedResult: { connected: true },
      timeout: 10000,
      retries: 3
    })

    // Subscription test
    this.registerScenario({
      id: 'subscription_test',
      name: 'Subscription Test',
      description: 'Test real-time subscription creation and event handling',
      category: 'subscription',
      setup: async () => {
        await this.realtimeManager.connect()
      },
      execute: async () => {
        const subscription = await this.realtimeManager.subscribe(
          'test_table',
          'test_channel',
          () => {}
        )
        const isSubscribed = subscription !== null
        await this.realtimeManager.unsubscribe('test_channel')
        return { subscribed: isSubscribed }
      },
      cleanup: async () => {
        await this.realtimeManager.unsubscribe('test_channel')
      },
      expectedResult: { subscribed: true },
      timeout: 5000,
      retries: 2
    })

    // Performance test
    this.registerScenario({
      id: 'performance_test',
      name: 'Performance Test',
      description: 'Test real-time performance metrics',
      category: 'performance',
      setup: async () => {
        await this.realtimeManager.connect()
      },
      execute: async () => {
        const metrics = this.realtimeManager.getConnectionMetrics()
        return {
          latency: metrics.averageLatency,
          uptime: metrics.uptime
        }
      },
      cleanup: async () => {
        // No cleanup needed
      },
      expectedResult: { latency: { min: 0, max: 1000 } },
      timeout: 5000,
      retries: 1
    })

    // Error handling test
    this.registerScenario({
      id: 'error_handling_test',
      name: 'Error Handling Test',
      description: 'Test error handling and recovery',
      category: 'error',
      setup: async () => {
        // Setup for error testing
      },
      execute: async () => {
        try {
          // Simulate an error
          await this.simulateNetworkConditions('offline', 1000)
          const error = realtimeErrorTracker.trackError(
            new Error('Test error'),
            { category: 'system', source: 'test' }
          )
          return { errorTracked: !!error }
        } catch (error) {
          return { errorTracked: false }
        }
      },
      cleanup: async () => {
        // Cleanup
      },
      expectedResult: { errorTracked: true },
      timeout: 5000,
      retries: 2
    })
  }

  /**
   * Initialize default test suites
   */
  private initializeDefaultSuites(): void {
    this.registerSuite({
      id: 'basic_functionality',
      name: 'Basic Functionality',
      description: 'Basic real-time functionality tests',
      scenarios: [
        this.scenarios.get('connection_test')!,
        this.scenarios.get('subscription_test')!
      ],
      setup: async () => {
        // Suite setup
      },
      cleanup: async () => {
        await this.realtimeManager.disconnect()
      },
      parallel: false,
      timeout: 30000
    })

    this.registerSuite({
      id: 'performance_and_reliability',
      name: 'Performance and Reliability',
      description: 'Performance and reliability tests',
      scenarios: [
        this.scenarios.get('performance_test')!,
        this.scenarios.get('error_handling_test')!
      ],
      setup: async () => {
        // Suite setup
      },
      cleanup: async () => {
        await this.realtimeManager.disconnect()
      },
      parallel: true,
      timeout: 20000
    })
  }

  /**
   * Capture current metrics
   */
  private async captureMetrics(): Promise<TestResult['metrics']> {
    const subscriptions = subscriptionStateManager.getAllSubscriptions()
    const health = subscriptionHealthMonitor.getHealthMetrics()
    const performance = subscriptionPerformanceMetrics.getMetrics()
    
    return {
      subscriptionCount: subscriptions.length,
      connectionHealth: health.overallHealth === 'healthy' ? 100 : 0,
      errorCount: realtimeErrorTracker.getStats().totalErrors,
      latency: performance.averageLatency || 0,
      memoryUsage: performance.memoryUsage || 0
    }
  }

  /**
   * Evaluate test result
   */
  private evaluateResult(actual: any, expected: any): boolean {
    if (typeof expected === 'object' && expected !== null) {
      return Object.keys(expected).every(key => {
        const expectedValue = expected[key]
        const actualValue = actual[key]
        
        if (typeof expectedValue === 'object' && expectedValue.min !== undefined) {
          return actualValue >= expectedValue.min && actualValue <= expectedValue.max
        }
        
        return actualValue === expectedValue
      })
    }
    
    return actual === expected
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(results: TestResult[]): number {
    if (results.length === 0) return 0
    
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length
    const successRate = results.filter(r => r.success).length / results.length
    
    // Simple scoring algorithm
    const durationScore = Math.max(0, 100 - avgDuration / 100) // Lower duration = higher score
    const successScore = successRate * 100
    
    return (durationScore + successScore) / 2
  }

  /**
   * Generate result ID
   */
  private generateResultId(): string {
    return `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate report ID
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Notify progress callbacks
   */
  private notifyProgressCallbacks(result: TestResult): void {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(result)
      } catch (error) {
        console.error('Error in progress callback:', error)
      }
    })
  }

  /**
   * Notify suite progress callbacks
   */
  private notifySuiteProgressCallbacks(report: TestReport): void {
    this.suiteProgressCallbacks.forEach(callback => {
      try {
        callback(report)
      } catch (error) {
        console.error('Error in suite progress callback:', error)
      }
    })
  }
}

// Export singleton instance
export const realtimeTestingUtils = new RealtimeTestingUtils()
