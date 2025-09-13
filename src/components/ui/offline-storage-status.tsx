'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Database, 
  Download, 
  Trash2, 
  RefreshCw, 
  HardDrive,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useOfflineStorage, useSyncQueue } from '@/hooks/use-offline-storage'
import { formatDistanceToNow } from 'date-fns'

interface OfflineStorageStatusProps {
  showDetails?: boolean
  compact?: boolean
  className?: string
}

export function OfflineStorageStatus({ 
  showDetails = false, 
  compact = false, 
  className = '' 
}: OfflineStorageStatusProps) {
  const { stats, availableMatches, isLoading, clearAllData, refresh } = useOfflineStorage()
  const { pendingItems, clearCompletedItems } = useSyncQueue()

  const getStorageUsagePercentage = () => {
    if (!stats || stats.storageSize === 0) return 0
    // Estimate storage quota (5MB for demo purposes)
    const estimatedQuota = 5 * 1024 * 1024 // 5MB
    return Math.min((stats.storageSize / estimatedQuota) * 100, 100)
  }

  const getStorageUsageText = () => {
    if (!stats) return '0 KB'
    const sizeKB = Math.round(stats.storageSize / 1024)
    if (sizeKB < 1024) return `${sizeKB} KB`
    const sizeMB = (sizeKB / 1024).toFixed(1)
    return `${sizeMB} MB`
  }

  const getLastSyncText = () => {
    if (!stats?.lastSyncTime) return 'Never'
    return formatDistanceToNow(stats.lastSyncTime, { addSuffix: true })
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Database className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium">
          {stats ? `${stats.totalMatches} matches offline` : 'Loading...'}
        </span>
        {stats && stats.pendingSyncItems > 0 && (
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            {stats.pendingSyncItems} pending
          </Badge>
        )}
      </div>
    )
  }

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Database className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium">
          {stats ? `${stats.totalMatches} matches` : 'Loading...'}
        </span>
        {stats && (
          <span className="text-xs text-muted-foreground">
            ({getStorageUsageText()})
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isLoading}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            <CardTitle className="text-lg">Offline Storage</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllData}
              disabled={isLoading}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>
        <CardDescription>
          Local offline storage for matches, events, and statistics
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading storage data...</span>
          </div>
        ) : stats ? (
          <>
            {/* Storage Usage */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Storage Usage</span>
                <span className="text-sm text-muted-foreground">{getStorageUsageText()}</span>
              </div>
              <Progress value={getStorageUsagePercentage()} className="h-2" />
            </div>

            {/* Data Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Matches</span>
                </div>
                <p className="text-2xl font-bold">{stats.totalMatches}</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Events</span>
                </div>
                <p className="text-2xl font-bold">{stats.totalEvents}</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Statistics</span>
                </div>
                <p className="text-2xl font-bold">{stats.totalStatistics}</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Players</span>
                </div>
                <p className="text-2xl font-bold">{stats.totalPlayers}</p>
              </div>
            </div>

            {/* Sync Status */}
            <div className="p-4 border rounded-lg">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Synchronization Status
              </h4>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Sync:</span>
                  <span className="text-sm text-muted-foreground">{getLastSyncText()}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending Sync:</span>
                  <div className="flex items-center gap-2">
                    {stats.pendingSyncItems > 0 ? (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {stats.pendingSyncItems}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        None
                      </Badge>
                    )}
                  </div>
                </div>

                {stats.failedSyncItems > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Failed Sync:</span>
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      <XCircle className="h-3 w-3 mr-1" />
                      {stats.failedSyncItems}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Clear completed sync items */}
              {pendingItems.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCompletedItems}
                    className="w-full"
                  >
                    Clear Completed Sync Items
                  </Button>
                </div>
              )}
            </div>

            {/* Available Matches */}
            {availableMatches.length > 0 && (
              <div className="p-4 border rounded-lg">
                <h4 className="text-sm font-medium mb-3">Available Offline Matches</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {availableMatches.slice(0, 5).map((match) => (
                    <div key={match.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <span className="font-medium">{match.home_team_name} vs {match.away_team_name}</span>
                      <span className="text-muted-foreground">
                        {new Date(match.match_date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  {availableMatches.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      And {availableMatches.length - 5} more matches...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Storage Statistics */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Storage Statistics</h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Items:</span>
                  <p className="font-medium">
                    {stats.totalMatches + stats.totalEvents + stats.totalStatistics + stats.totalPlayers + stats.totalTeams}
                  </p>
                </div>
                
                <div>
                  <span className="text-muted-foreground">Storage Size:</span>
                  <p className="font-medium">{getStorageUsageText()}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground">No offline data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default OfflineStorageStatus
