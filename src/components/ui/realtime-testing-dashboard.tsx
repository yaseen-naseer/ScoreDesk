/**
 * Real-time Testing Dashboard
 * UI component for running and managing real-time tests
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Play, 
  Square, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Activity,
  Bug,
  Zap,
  Database,
  Wifi,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Download,
  Trash2
} from 'lucide-react'
import { 
  realtimeTestingUtils, 
  TestScenario, 
  TestSuite, 
  TestResult, 
  TestReport 
} from '@/lib/services/realtime-testing-utils'

interface RealtimeTestingDashboardProps {
  className?: string
}

export function RealtimeTestingDashboard({ className = '' }: RealtimeTestingDashboardProps) {
  const [scenarios, setScenarios] = useState<TestScenario[]>([])
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [results, setResults] = useState<TestResult[]>([])
  const [reports, setReports] = useState<TestReport[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setResults(realtimeTestingUtils.getResults(50))
    setReports(realtimeTestingUtils.getReports(20))
  }

  const runScenario = async (scenarioId: string) => {
    setIsRunning(true)
    setCurrentTest(scenarioId)
    setProgress(0)

    try {
      const result = await realtimeTestingUtils.runScenario(scenarioId)
      setResults(prev => [result, ...prev.slice(0, 49)])
    } catch (error) {
      console.error('Failed to run scenario:', error)
    } finally {
      setIsRunning(false)
      setCurrentTest(null)
      setProgress(0)
    }
  }

  const runSuite = async (suiteId: string) => {
    setIsRunning(true)
    setCurrentTest(suiteId)
    setProgress(0)

    try {
      const report = await realtimeTestingUtils.runSuite(suiteId)
      setReports(prev => [report, ...prev.slice(0, 19)])
      setResults(prev => [...report.results, ...prev.slice(0, 49 - report.results.length)])
    } catch (error) {
      console.error('Failed to run suite:', error)
    } finally {
      setIsRunning(false)
      setCurrentTest(null)
      setProgress(0)
    }
  }

  const runAllTests = async () => {
    setIsRunning(true)
    setCurrentTest('all')
    setProgress(0)

    try {
      const allReports = await realtimeTestingUtils.runAllScenarios()
      setReports(prev => [...allReports, ...prev.slice(0, 20 - allReports.length)])
      
      const allResults = allReports.flatMap(report => report.results)
      setResults(prev => [...allResults, ...prev.slice(0, 50 - allResults.length)])
    } catch (error) {
      console.error('Failed to run all tests:', error)
    } finally {
      setIsRunning(false)
      setCurrentTest(null)
      setProgress(0)
    }
  }

  const clearResults = () => {
    realtimeTestingUtils.clearResults()
    setResults([])
    setReports([])
  }

  const exportResults = () => {
    const data = {
      results,
      reports,
      exportedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `test-results-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getScenarioIcon = (category: string) => {
    switch (category) {
      case 'connection': return <Wifi className="h-4 w-4" />
      case 'subscription': return <Database className="h-4 w-4" />
      case 'performance': return <Zap className="h-4 w-4" />
      case 'error': return <AlertTriangle className="h-4 w-4" />
      case 'sync': return <RefreshCw className="h-4 w-4" />
      case 'conflict': return <XCircle className="h-4 w-4" />
      default: return <Bug className="h-4 w-4" />
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    )
  }

  const getStatusColor = (success: boolean) => {
    return success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bug className="h-6 w-6" />
            Real-time Testing Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Test real-time functionality and performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={exportResults}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={clearResults}
            variant="outline"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Progress */}
      {isRunning && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Activity className="h-5 w-5 animate-pulse text-blue-600" />
              <div className="flex-1">
                <div className="text-sm font-medium">
                  Running: {currentTest}
                </div>
                <Progress value={progress} className="mt-2" />
              </div>
              <Button
                onClick={() => setIsRunning(false)}
                variant="outline"
                size="sm"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tests</p>
                <p className="text-2xl font-bold">{results.length}</p>
              </div>
              <Bug className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2">
              <div className="text-sm text-gray-500">
                {results.filter(r => r.success).length} passed
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pass Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {results.length > 0 ? 
                    ((results.filter(r => r.success).length / results.length) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2">
              <div className="text-sm text-gray-500">
                {results.filter(r => !r.success).length} failed
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                <p className="text-2xl font-bold">
                  {results.length > 0 ? 
                    formatDuration(results.reduce((sum, r) => sum + r.duration, 0) / results.length) : 
                    '0ms'
                  }
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2">
              <div className="text-sm text-gray-500">
                {reports.length} test suites
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Test Suites</p>
                <p className="text-2xl font-bold">{reports.length}</p>
              </div>
              <Activity className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-2">
              <div className="text-sm text-gray-500">
                {reports.filter(r => r.summary.passRate === 100).length} perfect
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="scenarios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
          <TabsTrigger value="suites">Test Suites</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Test Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Available Test Scenarios</CardTitle>
                  <CardDescription>
                    Individual test scenarios for specific functionality
                  </CardDescription>
                </div>
                <Button
                  onClick={runAllTests}
                  disabled={isRunning}
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Run All Tests
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Connection Test */}
                <Card className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg">Connection Test</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Test real-time connection establishment and stability
                    </p>
                    <Button
                      onClick={() => runScenario('connection_test')}
                      disabled={isRunning}
                      size="sm"
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Run Test
                    </Button>
                  </CardContent>
                </Card>

                {/* Subscription Test */}
                <Card className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-lg">Subscription Test</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Test real-time subscription creation and event handling
                    </p>
                    <Button
                      onClick={() => runScenario('subscription_test')}
                      disabled={isRunning}
                      size="sm"
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Run Test
                    </Button>
                  </CardContent>
                </Card>

                {/* Performance Test */}
                <Card className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-600" />
                      <CardTitle className="text-lg">Performance Test</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Test real-time performance metrics and latency
                    </p>
                    <Button
                      onClick={() => runScenario('performance_test')}
                      disabled={isRunning}
                      size="sm"
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Run Test
                    </Button>
                  </CardContent>
                </Card>

                {/* Error Handling Test */}
                <Card className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <CardTitle className="text-lg">Error Handling Test</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Test error handling and recovery mechanisms
                    </p>
                    <Button
                      onClick={() => runScenario('error_handling_test')}
                      disabled={isRunning}
                      size="sm"
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Run Test
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Suites Tab */}
        <TabsContent value="suites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Suites</CardTitle>
              <CardDescription>
                Predefined test suites for comprehensive testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Basic Functionality</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-2">
                      Connection and subscription tests
                    </p>
                    <div className="text-xs text-gray-500 mb-4">
                      2 scenarios • Sequential execution
                    </div>
                    <Button
                      onClick={() => runSuite('basic_functionality')}
                      disabled={isRunning}
                      size="sm"
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Run Suite
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Performance & Reliability</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-2">
                      Performance and error handling tests
                    </p>
                    <div className="text-xs text-gray-500 mb-4">
                      2 scenarios • Parallel execution
                    </div>
                    <Button
                      onClick={() => runSuite('performance_and_reliability')}
                      disabled={isRunning}
                      size="sm"
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Run Suite
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                Individual test results and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {results.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No test results yet. Run some tests to see results here.
                    </div>
                  ) : (
                    results.map((result) => (
                      <div key={result.id} className={`p-4 border rounded-lg ${getStatusColor(result.success)}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(result.success)}
                            <div>
                              <div className="font-medium">{result.scenarioId}</div>
                              <div className="text-sm text-gray-500">
                                {result.startTime.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {formatDuration(result.duration)}
                            </div>
                            <Badge variant={result.success ? 'default' : 'destructive'}>
                              {result.success ? 'PASSED' : 'FAILED'}
                            </Badge>
                          </div>
                        </div>
                        {result.error && (
                          <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                            <div className="text-sm text-red-800 dark:text-red-200">
                              Error: {result.error}
                            </div>
                          </div>
                        )}
                        {result.metrics && (
                          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                            <div>Subscriptions: {result.metrics.subscriptionCount}</div>
                            <div>Health: {result.metrics.connectionHealth}%</div>
                            <div>Latency: {result.metrics.latency}ms</div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Reports</CardTitle>
              <CardDescription>
                Comprehensive test suite reports and analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {reports.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No test reports yet. Run test suites to see reports here.
                    </div>
                  ) : (
                    reports.map((report) => (
                      <div key={report.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{report.suiteId}</div>
                            <div className="text-sm text-gray-500">
                              {report.startTime.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {formatDuration(report.duration)}
                            </div>
                            <Badge variant={report.summary.passRate === 100 ? 'default' : 'secondary'}>
                              {report.summary.passRate.toFixed(1)}% pass rate
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-medium">{report.totalScenarios}</div>
                            <div className="text-gray-500">Total</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-green-600">{report.passedScenarios}</div>
                            <div className="text-gray-500">Passed</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-red-600">{report.failedScenarios}</div>
                            <div className="text-gray-500">Failed</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{report.summary.performanceScore.toFixed(0)}</div>
                            <div className="text-gray-500">Score</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
