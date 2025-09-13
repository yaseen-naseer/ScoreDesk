/**
 * Version Timeline Component
 * Displays a visual timeline of version history with interactive features
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Clock, 
  User, 
  Tag, 
  GitBranch,
  RotateCcw,
  Eye,
  MoreHorizontal,
  Calendar,
  Activity,
  Filter
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useVersionTimeline } from '@/hooks/use-data-versioning'
import { DataVersion } from '@/lib/services/data-versioning-service'
import { formatDistanceToNow, format } from 'date-fns'

interface VersionTimelineProps {
  entityId: string
  entityType: string
  onVersionSelect?: (version: DataVersion) => void
  onVersionRestore?: (version: DataVersion) => Promise<void>
  includeSnapshots?: boolean
  limit?: number
  className?: string
}

export function VersionTimeline({
  entityId,
  entityType,
  onVersionSelect,
  onVersionRestore,
  includeSnapshots = true,
  limit = 50,
  className = ''
}: VersionTimelineProps) {
  const [selectedVersion, setSelectedVersion] = useState<DataVersion | null>(null)
  const [showSnapshots, setShowSnapshots] = useState(includeSnapshots)

  const {
    timeline,
    loading,
    error,
    refetch
  } = useVersionTimeline(entityId, entityType, {
    includeSnapshots: showSnapshots,
    limit
  })

  const handleVersionSelect = (version: DataVersion) => {
    setSelectedVersion(version)
    onVersionSelect?.(version)
  }

  const handleRestore = async (version: DataVersion) => {
    try {
      await onVersionRestore?.(version)
    } catch (error) {
      console.error('Failed to restore version:', error)
    }
  }

  const getVersionIcon = (item: any) => {
    if (item.type === 'snapshot') {
      return '📸'
    }

    switch (item.data.changeType) {
      case 'create': return '🆕'
      case 'update': return '✏️'
      case 'delete': return '🗑️'
      case 'restore': return '↩️'
      default: return '📝'
    }
  }

  const getVersionColor = (item: any) => {
    if (item.type === 'snapshot') {
      return 'bg-gray-100 text-gray-800 border-gray-200'
    }

    const version = item.data as DataVersion
    
    switch (version.changeType) {
      case 'create': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'update': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'delete': return 'bg-red-100 text-red-800 border-red-200'
      case 'restore': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const groupTimelineByDate = (timeline: typeof timeline.timeline) => {
    const groups: Record<string, typeof timeline.timeline> = {}
    
    timeline.forEach(item => {
      const date = format(item.timestamp, 'yyyy-MM-dd')
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(item)
    })

    return groups
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="h-6 w-6 animate-spin mr-2" />
            <span>Loading timeline...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Failed to load timeline</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const groupedTimeline = groupTimelineByDate(timeline.timeline)

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Version Timeline
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={showSnapshots ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSnapshots(!showSnapshots)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showSnapshots ? 'Hide' : 'Show'} Snapshots
            </Button>
            <Button variant="outline" size="sm" onClick={refetch}>
              <Activity className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96">
          {Object.keys(groupedTimeline).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No timeline data available</p>
              <p className="text-sm">Changes will appear here as they're tracked</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTimeline)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, items]) => (
                  <div key={date} className="relative">
                    {/* Date Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-700">
                          {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex-1 h-px bg-gray-200" />
                      <Badge variant="secondary">{items.length} items</Badge>
                    </div>

                    {/* Timeline Items */}
                    <div className="relative">
                      {/* Timeline Line */}
                      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
                      
                      <div className="space-y-4">
                        {items.map((item, index) => (
                          <div key={`${item.type}-${item.timestamp.getTime()}-${index}`} className="relative flex items-start gap-4">
                            {/* Timeline Dot */}
                            <div className={`relative z-10 w-8 h-8 rounded-full border-2 bg-white flex items-center justify-center ${
                              item.type === 'snapshot' ? 'border-gray-300' : 'border-blue-500'
                            }`}>
                              <span className="text-xs">{getVersionIcon(item)}</span>
                            </div>

                            {/* Content */}
                            <div className={`flex-1 p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                              selectedVersion?.id === item.data.id ? 'ring-2 ring-blue-500' : ''
                            } ${getVersionColor(item)}`}
                            onClick={() => item.type === 'version' && handleVersionSelect(item.data)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-medium">
                                      {item.type === 'snapshot' ? 'Snapshot' : `Version ${item.data.version}`}
                                    </span>
                                    {item.type === 'version' && (
                                      <Badge variant="outline" className="text-xs">
                                        {item.data.changeType}
                                      </Badge>
                                    )}
                                    <Badge variant="secondary" className="text-xs">
                                      {item.type}
                                    </Badge>
                                  </div>

                                  {item.type === 'version' && item.data.changeDescription && (
                                    <p className="text-sm text-gray-600 mb-2">
                                      {item.data.changeDescription}
                                    </p>
                                  )}

                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {format(item.timestamp, 'HH:mm:ss')}
                                    </div>
                                    
                                    {item.type === 'version' && item.data.userId && (
                                      <div className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {item.data.userId}
                                      </div>
                                    )}
                                    
                                    {item.type === 'version' && item.data.metadata?.source && (
                                      <div className="flex items-center gap-1">
                                        <Tag className="h-3 w-3" />
                                        {item.data.metadata.source}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {item.type === 'version' && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleVersionSelect(item.data)}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleRestore(item.data)}>
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        Restore to This Version
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </ScrollArea>

        {/* Timeline Stats */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-600">{timeline.versions.length}</div>
              <div className="text-sm text-gray-600">Versions</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-600">{timeline.snapshots.length}</div>
              <div className="text-sm text-gray-600">Snapshots</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">{timeline.timeline.length}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
