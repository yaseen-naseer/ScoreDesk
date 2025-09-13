/**
 * Event Log Viewer
 * UI component for viewing and filtering real-time event logs
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Activity,
  Clock,
  Database,
  Wifi,
  Zap,
  Sync,
  AlertCircle
} from 'lucide-react'
import { realtimeEventLogger, LogEvent, LogFilter, LogStats } from '@/lib/services/realtime-event-logger'

interface EventLogViewerProps {
  className?: string
}

export function EventLogViewer({ className = '' }: EventLogViewerProps) {
  const [events, setEvents] = useState<LogEvent[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLevels, setSelectedLevels] = useState<string[]>(['debug', 'info', 'warn', 'error', 'critical'])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadEvents = () => {
      setIsLoading(true)
      try {
        const filter: LogFilter = {
          level: selectedLevels.length > 0 ? selectedLevels as LogEvent['level'][] : undefined,
          category: selectedCategories.length > 0 ? selectedCategories as LogEvent['category'][] : undefined,
          source: selectedSources.length > 0 ? selectedSources : undefined,
          search: searchTerm || undefined
        }
        
        const eventData = realtimeEventLogger.getEvents(filter, 1000)
        setEvents(eventData)
        
        const statsData = realtimeEventLogger.getStats()
        setStats(statsData)
      } catch (error) {
        console.error('Error loading events:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadEvents()

    if (autoRefresh) {
      const interval = setInterval(loadEvents, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [searchTerm, selectedLevels, selectedCategories, selectedSources, autoRefresh])

  const getEventIcon = (level: string, category: string) => {
    if (category === 'subscription') return <Database className="h-4 w-4" />
    if (category === 'connection') return <Wifi className="h-4 w-4" />
    if (category === 'performance') return <Zap className="h-4 w-4" />
    if (category === 'error') return <AlertTriangle className="h-4 w-4" />
    if (category === 'sync') return <Sync className="h-4 w-4" />
    if (category === 'conflict') return <AlertCircle className="h-4 w-4" />
    if (category === 'system') return <Activity className="h-4 w-4" />
    
    switch (level) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info': return <Info className="h-4 w-4 text-blue-500" />
      case 'debug': return <Activity className="h-4 w-4 text-gray-500" />
      default: return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getEventColor = (level: string) => {
    switch (level) {
      case 'critical': return 'border-l-red-600 bg-red-50 dark:bg-red-950'
      case 'error': return 'border-l-red-500 bg-red-50 dark:bg-red-950'
      case 'warn': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950'
      case 'info': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950'
      case 'debug': return 'border-l-gray-500 bg-gray-50 dark:bg-gray-950'
      default: return 'border-l-gray-300 bg-gray-50 dark:bg-gray-950'
    }
  }

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive'
      case 'error': return 'destructive'
      case 'warn': return 'secondary'
      case 'info': return 'default'
      case 'debug': return 'outline'
      default: return 'outline'
    }
  }

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'subscription': return 'default'
      case 'connection': return 'secondary'
      case 'performance': return 'outline'
      case 'error': return 'destructive'
      case 'sync': return 'secondary'
      case 'conflict': return 'destructive'
      case 'system': return 'outline'
      default: return 'outline'
    }
  }

  const clearLogs = () => {
    realtimeEventLogger.clearLogs()
    setEvents([])
  }

  const exportLogs = () => {
    const filter: LogFilter = {
      level: selectedLevels.length > 0 ? selectedLevels as LogEvent['level'][] : undefined,
      category: selectedCategories.length > 0 ? selectedCategories as LogEvent['category'][] : undefined,
      source: selectedSources.length > 0 ? selectedSources : undefined,
      search: searchTerm || undefined
    }
    
    const exportData = realtimeEventLogger.exportLogs(filter)
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `event-logs-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const toggleLevel = (level: string) => {
    setSelectedLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level]
    )
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const toggleSource = (source: string) => {
    setSelectedSources(prev => 
      prev.includes(source) 
        ? prev.filter(s => s !== source)
        : [...prev, source]
    )
  }

  const refreshEvents = () => {
    const filter: LogFilter = {
      level: selectedLevels.length > 0 ? selectedLevels as LogEvent['level'][] : undefined,
      category: selectedCategories.length > 0 ? selectedCategories as LogEvent['category'][] : undefined,
      source: selectedSources.length > 0 ? selectedSources : undefined,
      search: searchTerm || undefined
    }
    
    const eventData = realtimeEventLogger.getEvents(filter, 1000)
    setEvents(eventData)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Event Log Viewer
              </CardTitle>
              <CardDescription>
                Real-time event logging and monitoring
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={refreshEvents}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={exportLogs}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={clearLogs}
                variant="outline"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalEvents}</div>
                <div className="text-sm text-gray-500">Total Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.errorRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-500">Error Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.averageEventsPerMinute}</div>
                <div className="text-sm text-gray-500">Events/Min</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{events.length}</div>
                <div className="text-sm text-gray-500">Filtered</div>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
          </div>

          {/* Filters */}
          <Tabs defaultValue="levels" className="mb-4">
            <TabsList>
              <TabsTrigger value="levels">Levels</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
            </TabsList>
            
            <TabsContent value="levels">
              <div className="flex flex-wrap gap-2">
                {['debug', 'info', 'warn', 'error', 'critical'].map(level => (
                  <Badge
                    key={level}
                    variant={selectedLevels.includes(level) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleLevel(level)}
                  >
                    {level}
                  </Badge>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="categories">
              <div className="flex flex-wrap gap-2">
                {['subscription', 'connection', 'performance', 'error', 'sync', 'conflict', 'system'].map(category => (
                  <Badge
                    key={category}
                    variant={selectedCategories.includes(category) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleCategory(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="sources">
              <div className="flex flex-wrap gap-2">
                {stats && Object.keys(stats.eventsBySource).slice(0, 10).map(source => (
                  <Badge
                    key={source}
                    variant={selectedSources.includes(source) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleSource(source)}
                  >
                    {source} ({stats.eventsBySource[source]})
                  </Badge>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Event List */}
      <Card>
        <CardHeader>
          <CardTitle>Events ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea ref={scrollAreaRef} className="h-96">
            <div className="space-y-2">
              {events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No events found matching the current filters.
                </div>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border-l-4 ${getEventColor(event.level)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getEventIcon(event.level, event.category)}
                        <Badge variant={getLevelBadgeColor(event.level)}>
                          {event.level.toUpperCase()}
                        </Badge>
                        <Badge variant={getCategoryBadgeColor(event.category)}>
                          {event.category}
                        </Badge>
                        <Badge variant="outline">{event.source}</Badge>
                        <span className="text-xs text-gray-500">
                          {event.timestamp.toLocaleString()}
                        </span>
                      </div>
                      {event.subscriptionId && (
                        <Badge variant="secondary" className="text-xs">
                          {event.subscriptionId.slice(-8)}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium">{event.message}</p>
                      {event.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer">
                            View Data
                          </summary>
                          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(event.data, null, 2)}
                          </pre>
                        </details>
                      )}
                      {event.metadata && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer">
                            View Metadata
                          </summary>
                          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
