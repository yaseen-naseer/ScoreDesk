/**
 * Version History Panel Component
 * Displays version history for an entity with timeline and comparison features
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  History, 
  RotateCcw, 
  Trash2, 
  Eye, 
  GitCompare, 
  Calendar,
  User,
  Tag,
  MoreHorizontal,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useEntityVersions, useVersionComparison } from '@/hooks/use-data-versioning'
import { DataVersion, VersionDiff } from '@/lib/services/data-versioning-service'
import { formatDistanceToNow, format } from 'date-fns'

interface VersionHistoryPanelProps {
  entityId: string
  entityType: string
  onVersionSelect?: (version: DataVersion) => void
  onVersionRestore?: (version: DataVersion) => Promise<void>
  compact?: boolean
  className?: string
}

export function VersionHistoryPanel({
  entityId,
  entityType,
  onVersionSelect,
  onVersionRestore,
  compact = false,
  className = ''
}: VersionHistoryPanelProps) {
  const [selectedVersion, setSelectedVersion] = useState<DataVersion | null>(null)
  const [compareVersion, setCompareVersion] = useState<DataVersion | null>(null)
  const [showComparison, setShowComparison] = useState(false)

  const {
    versions,
    currentVersion,
    history,
    loading,
    error,
    restoreToVersion,
    deleteVersion,
    clearHistory,
    refetch
  } = useEntityVersions(entityId, entityType)

  const {
    diff,
    loading: diffLoading,
    compareVersions,
    clearDiff
  } = useVersionComparison()

  const handleVersionSelect = (version: DataVersion) => {
    setSelectedVersion(version)
    onVersionSelect?.(version)
  }

  const handleCompare = async (version1: DataVersion, version2: DataVersion) => {
    try {
      await compareVersions(version1.id, version2.id)
      setShowComparison(true)
    } catch (error) {
      console.error('Failed to compare versions:', error)
    }
  }

  const handleRestore = async (version: DataVersion) => {
    try {
      await restoreToVersion(version.id, {
        changeDescription: `Restored to version ${version.version}`
      })
      onVersionRestore?.(version)
      setSelectedVersion(null)
    } catch (error) {
      console.error('Failed to restore version:', error)
    }
  }

  const handleDelete = async (version: DataVersion) => {
    try {
      await deleteVersion(version.id)
    } catch (error) {
      console.error('Failed to delete version:', error)
    }
  }

  const getVersionIcon = (version: DataVersion) => {
    switch (version.changeType) {
      case 'create': return '🆕'
      case 'update': return '✏️'
      case 'delete': return '🗑️'
      case 'restore': return '↩️'
      default: return '📝'
    }
  }

  const getVersionColor = (version: DataVersion) => {
    if (version.id === currentVersion?.id) return 'bg-green-100 text-green-800 border-green-200'
    
    switch (version.changeType) {
      case 'create': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'update': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'delete': return 'bg-red-100 text-red-800 border-red-200'
      case 'restore': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading version history...</span>
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
            <p>Failed to load version history</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refetch}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="text-sm font-medium">Version History</span>
            <Badge variant="secondary">{versions.length}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        <ScrollArea className="h-32">
          <div className="space-y-2">
            {versions.slice(0, 5).map((version) => (
              <div
                key={version.id}
                className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer hover:bg-gray-50 ${getVersionColor(version)}`}
                onClick={() => handleVersionSelect(version)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{getVersionIcon(version)}</span>
                  <div>
                    <div className="text-xs font-medium">v{version.version}</div>
                    <div className="text-xs opacity-75">
                      {formatDistanceToNow(version.timestamp, { addSuffix: true })}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {version.changeType}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {versions.length} versions
            </Badge>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {versions.map((version, index) => (
              <div
                key={version.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedVersion?.id === version.id ? 'ring-2 ring-blue-500' : ''
                } ${getVersionColor(version)}`}
                onClick={() => handleVersionSelect(version)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{getVersionIcon(version)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Version {version.version}</span>
                        {version.id === currentVersion?.id && (
                          <Badge variant="default" className="text-xs">Current</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {version.changeType}
                        </Badge>
                      </div>
                      
                      {version.changeDescription && (
                        <p className="text-sm text-gray-600 mb-2">
                          {version.changeDescription}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(version.timestamp, 'MMM d, yyyy HH:mm')}
                        </div>
                        {version.userId && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {version.userId}
                          </div>
                        )}
                        {version.metadata?.source && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {version.metadata.source}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleVersionSelect(version)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleCompare(version, currentVersion!)}
                        disabled={!currentVersion || version.id === currentVersion.id}
                      >
                        <GitCompare className="h-4 w-4 mr-2" />
                        Compare with Current
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleRestore(version)}
                        disabled={version.id === currentVersion?.id}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restore to This Version
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(version)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Version
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {versions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No version history available</p>
            <p className="text-sm">Changes will be tracked automatically</p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {history && (
                <>
                  Created {formatDistanceToNow(history.createdAt, { addSuffix: true })}
                  {history.lastModified && history.lastModified !== history.createdAt && (
                    <span> • Last modified {formatDistanceToNow(history.lastModified, { addSuffix: true })}</span>
                  )}
                </>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => clearHistory()}
              disabled={versions.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear History
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Version Comparison Dialog */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Version Comparison</DialogTitle>
            <DialogDescription>
              Compare changes between selected versions
            </DialogDescription>
          </DialogHeader>
          
          {diffLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Comparing versions...
            </div>
          ) : diff ? (
            <VersionComparison diff={diff} />
          ) : (
            <div className="text-center py-8 text-gray-500">
              No comparison data available
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// Version Comparison Component
function VersionComparison({ diff }: { diff: VersionDiff }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="font-medium">Added Fields</div>
          <div className="text-2xl font-bold text-green-600">{diff.summary.addedFields}</div>
        </div>
        <div className="text-center">
          <div className="font-medium">Modified Fields</div>
          <div className="text-2xl font-bold text-yellow-600">{diff.summary.modifiedFields}</div>
        </div>
        <div className="text-center">
          <div className="font-medium">Removed Fields</div>
          <div className="text-2xl font-bold text-red-600">{diff.summary.removedFields}</div>
        </div>
      </div>

      <Separator />

      <ScrollArea className="h-64">
        <div className="space-y-2">
          {diff.changes.map((change, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${
                change.changeType === 'added' ? 'bg-green-50 border-green-200' :
                change.changeType === 'modified' ? 'bg-yellow-50 border-yellow-200' :
                'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{change.field}</span>
                <Badge 
                  variant={
                    change.changeType === 'added' ? 'default' :
                    change.changeType === 'modified' ? 'secondary' : 'destructive'
                  }
                >
                  {change.changeType}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-600 mb-1">Old Value:</div>
                  <div className="bg-gray-100 p-2 rounded font-mono text-xs break-all">
                    {change.oldValue === undefined ? 'undefined' : JSON.stringify(change.oldValue)}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-600 mb-1">New Value:</div>
                  <div className="bg-gray-100 p-2 rounded font-mono text-xs break-all">
                    {change.newValue === undefined ? 'undefined' : JSON.stringify(change.newValue)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
