'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  RefreshCw,
  Merge,
  Download,
  Upload,
  Zap
} from 'lucide-react'
import { useConflict, useConflictResolution } from '@/hooks/use-conflict-detection'
import { ConflictInfo, ResolutionStrategy } from '@/lib/services/sync-conflict-detector'
import { ResolutionContext } from '@/lib/services/conflict-resolution-service'
import { formatDistanceToNow } from 'date-fns'

interface ConflictResolutionDialogProps {
  conflictId: string
  isOpen: boolean
  onClose: () => void
  onResolved?: (conflictId: string, result: any) => void
  userId?: string
  organizationId?: string
  matchId?: string
  tournamentId?: string
}

export function ConflictResolutionDialog({
  conflictId,
  isOpen,
  onClose,
  onResolved,
  userId,
  organizationId,
  matchId,
  tournamentId
}: ConflictResolutionDialogProps) {
  const { conflict, strategies, isResolving, resolve, getDefaultStrategy, canAutoResolve, requiresUserInput } = useConflict(conflictId)
  const [selectedStrategy, setSelectedStrategy] = useState<string>('')
  const [userInput, setUserInput] = useState<any>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (conflict && strategies.length > 0) {
      const defaultStrategy = getDefaultStrategy()
      setSelectedStrategy(defaultStrategy || strategies[0].id)
      
      // Set initial user input based on conflict
      if (requiresUserInput) {
        setUserInput(conflict.remoteValue) // Default to remote value
      }
    }
  }, [conflict, strategies, getDefaultStrategy, requiresUserInput])

  const handleResolve = async () => {
    if (!conflict || !selectedStrategy) return

    try {
      const context: ResolutionContext = {
        conflictId,
        userId,
        organizationId,
        matchId,
        tournamentId
      }

      const result = await resolve(selectedStrategy, context, userInput)
      
      if (onResolved) {
        onResolved(conflictId, result)
      }
      
      onClose()
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
    }
  }

  const getStrategyIcon = (strategy: ResolutionStrategy) => {
    switch (strategy.id) {
      case 'last_write_wins':
        return <Clock className="h-4 w-4" />
      case 'user_resolution':
        return <User className="h-4 w-4" />
      case 'merge':
        return <Merge className="h-4 w-4" />
      case 'automatic':
        return <Zap className="h-4 w-4" />
      case 'remote_wins':
        return <Download className="h-4 w-4" />
      case 'local_wins':
        return <Upload className="h-4 w-4" />
      default:
        return <RefreshCw className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: ConflictInfo['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getTypeIcon = (type: ConflictInfo['type']) => {
    switch (type) {
      case 'field': return '🔧'
      case 'record': return '📄'
      case 'relationship': return '🔗'
      case 'timestamp': return '⏰'
      case 'version': return '🔢'
      default: return '❓'
    }
  }

  if (!conflict) {
    return null
  }

  const selectedStrategyData = strategies.find(s => s.id === selectedStrategy)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Conflict Resolution
          </DialogTitle>
          <DialogDescription>
            Resolve data conflicts between local and remote versions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conflict Overview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {getTypeIcon(conflict.type)} {conflict.field || 'Record Conflict'}
                </CardTitle>
                <Badge className={getSeverityColor(conflict.severity)}>
                  {conflict.severity}
                </Badge>
              </div>
              <CardDescription>
                {conflict.conflictReason}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Conflict Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Local Value</h4>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(conflict.localValue, null, 2)}
                    </pre>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(conflict.localTimestamp, { addSuffix: true })}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Remote Value</h4>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(conflict.remoteValue, null, 2)}
                    </pre>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(conflict.remoteTimestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Metadata */}
              {conflict.metadata && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Metadata</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {conflict.metadata.fieldType && (
                      <div>
                        <span className="text-muted-foreground">Field Type:</span>
                        <span className="ml-2 font-medium">{conflict.metadata.fieldType}</span>
                      </div>
                    )}
                    {conflict.metadata.dataType && (
                      <div>
                        <span className="text-muted-foreground">Data Type:</span>
                        <span className="ml-2 font-medium">{conflict.metadata.dataType}</span>
                      </div>
                    )}
                    {conflict.localVersion && (
                      <div>
                        <span className="text-muted-foreground">Local Version:</span>
                        <span className="ml-2 font-medium">{conflict.localVersion}</span>
                      </div>
                    )}
                    {conflict.remoteVersion && (
                      <div>
                        <span className="text-muted-foreground">Remote Version:</span>
                        <span className="ml-2 font-medium">{conflict.remoteVersion}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resolution Strategy Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resolution Strategy</CardTitle>
              <CardDescription>
                Choose how to resolve this conflict
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {strategies.map((strategy) => (
                  <div
                    key={strategy.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedStrategy === strategy.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedStrategy(strategy.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        selectedStrategy === strategy.id ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        {getStrategyIcon(strategy)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{strategy.name}</h4>
                          {strategy.isAutomatic && (
                            <Badge variant="secondary" className="text-xs">Automatic</Badge>
                          )}
                          {strategy.requiresUserInput && (
                            <Badge variant="outline" className="text-xs">User Input Required</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {strategy.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* User Input Section */}
              {selectedStrategyData?.requiresUserInput && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Choose Value</h4>
                  <div className="space-y-3">
                    <div
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        userInput === conflict.localValue
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setUserInput(conflict.localValue)}
                    >
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        <span className="font-medium">Use Local Value</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Keep your local changes
                      </p>
                    </div>
                    
                    <div
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        userInput === conflict.remoteValue
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setUserInput(conflict.remoteValue)}
                    >
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        <span className="font-medium">Use Remote Value</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Accept remote changes
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resolution Preview */}
          {selectedStrategyData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resolution Preview</CardTitle>
                <CardDescription>
                  This is how the conflict will be resolved
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Using <strong>{selectedStrategyData.name}</strong> strategy.
                    {selectedStrategyData.isAutomatic && ' This will be resolved automatically.'}
                    {selectedStrategyData.requiresUserInput && ' Please select a value above.'}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isResolving}>
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={isResolving || (selectedStrategyData?.requiresUserInput && userInput === null)}
            >
              {isResolving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve Conflict
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ConflictResolutionDialog
