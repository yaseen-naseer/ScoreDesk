'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle, 
  RefreshCw,
  TrendingUp,
  BarChart3,
  Settings,
  Zap
} from 'lucide-react'
import { useConflictDetection, useConflictAnalytics } from '@/hooks/use-conflict-detection'
import { ConflictResolutionDialog } from './conflict-resolution-dialog'
import { formatDistanceToNow } from 'date-fns'

interface ConflictStatusDashboardProps {
  showDetails?: boolean
  compact?: boolean
  className?: string
  userId?: string
  organizationId?: string
  matchId?: string
  tournamentId?: string
}

export function ConflictStatusDashboard({
  showDetails = false,
  compact = false,
  className = '',
  userId,
  organizationId,
  matchId,
  tournamentId
}: ConflictStatusDashboardProps) {
  const { conflicts, stats, isLoading, clearOldConflicts } = useConflictDetection()
  const { conflictTrends, topConflictFields, severityDistribution, strategyUsage } = useConflictAnalytics()
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />
      case 'high': return <AlertTriangle className="h-4 w-4" />
      case 'medium': return <Clock className="h-4 w-4" />
      case 'low': return <CheckCircle className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'field': return '🔧'
      case 'record': return '📄'
      case 'relationship': return '🔗'
      case 'timestamp': return '⏰'
      case 'version': return '🔢'
      default: return '❓'
    }
  }

  const handleConflictResolved = (conflictId: string, result: any) => {
    console.log('Conflict resolved:', conflictId, result)
    setSelectedConflictId(null)
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <span className="text-sm font-medium">
          {conflicts.length} conflicts
        </span>
        {conflicts.length > 0 && (
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            {conflicts.filter(c => c.severity === 'critical').length} critical
          </Badge>
        )}
      </div>
    )
  }

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <span className="text-sm font-medium">
          {conflicts.length} conflicts
        </span>
        {conflicts.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('conflicts')}
            className="h-6 px-2 text-xs"
          >
            View
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Conflict Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Total Conflicts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalConflicts}</div>
                <p className="text-sm text-muted-foreground">
                  {stats.pendingConflicts} pending, {stats.resolvedConflicts} resolved
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Resolution Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{conflictTrends.resolutionRate.toFixed(1)}%</div>
                <p className="text-sm text-muted-foreground">
                  {conflictTrends.resolvedConflicts} of {conflictTrends.totalConflicts} resolved
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Avg Resolution Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {conflictTrends.averageResolutionTime > 0 
                    ? `${(conflictTrends.averageResolutionTime / 1000).toFixed(1)}s`
                    : 'N/A'
                  }
                </div>
                <p className="text-sm text-muted-foreground">
                  Time to resolve conflicts
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Severity Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Conflict Severity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {severityDistribution.map(({ severity, count }) => (
                  <div key={severity} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(severity)}
                        <span className="text-sm font-medium capitalize">{severity}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                    <Progress 
                      value={(count / stats.totalConflicts) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Conflict Fields */}
          {topConflictFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Conflict Fields</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topConflictFields.slice(0, 5).map(({ field, count }) => (
                    <div key={field} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{field}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading conflicts...</span>
            </div>
          ) : conflicts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Conflicts</h3>
                <p className="text-muted-foreground">
                  All data is synchronized and up to date.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {conflicts.map((conflict) => (
                <Card key={conflict.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{getTypeIcon(conflict.type)}</div>
                        <div>
                          <h4 className="font-medium">{conflict.field || 'Record Conflict'}</h4>
                          <p className="text-sm text-muted-foreground">
                            {conflict.conflictReason}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(conflict.severity)}>
                          {conflict.severity}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedConflictId(conflict.id)}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Detected {formatDistanceToNow(conflict.localTimestamp, { addSuffix: true })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Resolution Strategy Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {strategyUsage.map(({ strategy, count }) => (
                  <div key={strategy} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {strategy.replace('_', ' ')}
                    </span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conflict Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Conflicts:</span>
                  <p className="font-medium">{conflictTrends.totalConflicts}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Resolution Rate:</span>
                  <p className="font-medium">{conflictTrends.resolutionRate.toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Pending:</span>
                  <p className="font-medium">{conflictTrends.pendingConflicts}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg Resolution Time:</span>
                  <p className="font-medium">
                    {conflictTrends.averageResolutionTime > 0 
                      ? `${(conflictTrends.averageResolutionTime / 1000).toFixed(1)}s`
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Conflict Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Clear Old Conflicts</h4>
                  <p className="text-sm text-muted-foreground">
                    Remove conflicts older than 24 hours
                  </p>
                </div>
                <Button variant="outline" onClick={clearOldConflicts}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Conflict Resolution Dialog */}
      {selectedConflictId && (
        <ConflictResolutionDialog
          conflictId={selectedConflictId}
          isOpen={!!selectedConflictId}
          onClose={() => setSelectedConflictId(null)}
          onResolved={handleConflictResolved}
          userId={userId}
          organizationId={organizationId}
          matchId={matchId}
          tournamentId={tournamentId}
        />
      )}
    </div>
  )
}

export default ConflictStatusDashboard
