'use client'

import { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  Users, 
  Trophy,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import { useSupabase } from '@/components/providers/supabase-provider'
import { ConflictDetectionService, ConflictDetectionResult } from '@/lib/services/conflict-detection-service'

interface ConflictDetectionPanelProps {
  matchData: {
    tournament_id: string
    home_team_id: string
    away_team_id: string
    scheduled_date: string
    venue_id?: string
    venue?: string
    match_duration?: number
    referee_ids?: string[]
  }
  excludeMatchId?: string
  onConflictsResolved?: () => void
  onConflictsFound?: (conflicts: ConflictDetectionResult) => void
  className?: string
}

export function ConflictDetectionPanel({ 
  matchData, 
  excludeMatchId, 
  onConflictsResolved, 
  onConflictsFound,
  className 
}: ConflictDetectionPanelProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [isChecking, setIsChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [conflictResult, setConflictResult] = useState<ConflictDetectionResult | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['conflicts']))

  const conflictDetectionService = new ConflictDetectionService(supabase)

  useEffect(() => {
    if (matchData.tournament_id && matchData.home_team_id && matchData.away_team_id && matchData.scheduled_date) {
      checkConflicts()
    }
  }, [matchData, excludeMatchId])

  const checkConflicts = async () => {
    try {
      setIsChecking(true)
      const result = await conflictDetectionService.detectConflicts(matchData, excludeMatchId)
      setConflictResult(result)
      setLastChecked(new Date())

      if (result.has_conflicts) {
        onConflictsFound?.(result)
        toast({
          title: 'Conflicts Detected',
          description: `${result.conflicts.length} conflict(s) found`,
          variant: 'destructive'
        })
      } else {
        onConflictsResolved?.()
        toast({
          title: 'No Conflicts',
          description: 'Schedule is conflict-free',
          variant: 'default'
        })
      }
    } catch (error) {
      console.error('Error checking conflicts:', error)
      toast({
        title: 'Error',
        description: 'Failed to check for conflicts',
        variant: 'destructive'
      })
    } finally {
      setIsChecking(false)
    }
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const getConflictIcon = (type: string) => {
    switch (type) {
      case 'venue': return <MapPin className="h-4 w-4" />
      case 'referee': return <Users className="h-4 w-4" />
      case 'team': return <Trophy className="h-4 w-4" />
      case 'tournament': return <Trophy className="h-4 w-4" />
      case 'time': return <Clock className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'destructive'
      case 'warning': return 'default'
      default: return 'secondary'
    }
  }

  if (!matchData.tournament_id || !matchData.home_team_id || !matchData.away_team_id || !matchData.scheduled_date) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Conflict Detection
          </CardTitle>
          <CardDescription>
            Complete match details to check for conflicts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Info className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Please fill in tournament, teams, and schedule information to detect conflicts
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Conflict Detection
            </CardTitle>
            <CardDescription>
              {lastChecked 
                ? `Last checked: ${lastChecked.toLocaleTimeString()}`
                : 'Check for scheduling conflicts'
              }
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkConflicts}
            disabled={isChecking}
          >
            {isChecking ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isChecking ? 'Checking...' : 'Check Again'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isChecking && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Checking for conflicts...</span>
          </div>
        )}

        {!isChecking && conflictResult && (
          <>
            {/* Overall Status */}
            <div className="flex items-center space-x-2">
              {conflictResult.has_conflicts ? (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-semibold text-red-700">
                    {conflictResult.conflicts.length} Conflict(s) Found
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-semibold text-green-700">
                    No Conflicts Detected
                  </span>
                </>
              )}
            </div>

            {/* Conflicts Section */}
            {conflictResult.conflicts.length > 0 && (
              <Collapsible 
                open={expandedSections.has('conflicts')} 
                onOpenChange={() => toggleSection('conflicts')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <div className="flex items-center">
                      <XCircle className="h-4 w-4 mr-2 text-red-500" />
                      <span className="font-medium">Conflicts ({conflictResult.conflicts.length})</span>
                    </div>
                    <ArrowRight className={`h-4 w-4 transition-transform ${expandedSections.has('conflicts') ? 'rotate-90' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  <ScrollArea className="h-64">
                    {conflictResult.conflicts.map((conflict, index) => (
                      <Alert key={index} variant={getSeverityColor(conflict.severity)}>
                        <div className="flex items-start space-x-2">
                          {getConflictIcon(conflict.type)}
                          <div className="flex-1">
                            <AlertDescription>
                              <div className="font-medium">{conflict.message}</div>
                              <div className="text-sm opacity-80 mt-1">{conflict.details}</div>
                              {conflict.affected_entities.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-xs font-medium mb-1">Affected:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {conflict.affected_entities.map((entity, i) => (
                                      <Badge key={i} variant="outline" className="text-xs">
                                        {entity}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {conflict.suggested_solutions.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-xs font-medium mb-1">Suggested Solutions:</div>
                                  <ul className="text-xs space-y-1">
                                    {conflict.suggested_solutions.map((solution, i) => (
                                      <li key={i} className="flex items-center">
                                        <span className="w-1 h-1 bg-current rounded-full mr-2"></span>
                                        {solution}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Warnings Section */}
            {conflictResult.warnings.length > 0 && (
              <Collapsible 
                open={expandedSections.has('warnings')} 
                onOpenChange={() => toggleSection('warnings')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                      <span className="font-medium">Warnings ({conflictResult.warnings.length})</span>
                    </div>
                    <ArrowRight className={`h-4 w-4 transition-transform ${expandedSections.has('warnings') ? 'rotate-90' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  <ScrollArea className="h-48">
                    {conflictResult.warnings.map((warning, index) => (
                      <Alert key={index} variant="default">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-medium">{warning.message}</div>
                          <div className="text-sm opacity-80 mt-1">{warning.details}</div>
                          {warning.affected_entities.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs font-medium mb-1">Affected:</div>
                              <div className="flex flex-wrap gap-1">
                                {warning.affected_entities.map((entity, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {entity}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Suggestions Section */}
            {conflictResult.suggestions.length > 0 && (
              <Collapsible 
                open={expandedSections.has('suggestions')} 
                onOpenChange={() => toggleSection('suggestions')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <div className="flex items-center">
                      <Lightbulb className="h-4 w-4 mr-2 text-blue-500" />
                      <span className="font-medium">Optimization Suggestions ({conflictResult.suggestions.length})</span>
                    </div>
                    <ArrowRight className={`h-4 w-4 transition-transform ${expandedSections.has('suggestions') ? 'rotate-90' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  <ScrollArea className="h-48">
                    {conflictResult.suggestions.map((suggestion, index) => (
                      <Alert key={index} variant="default">
                        <Lightbulb className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{suggestion.message}</div>
                              <div className="text-sm opacity-80 mt-1">{suggestion.details}</div>
                            </div>
                            <div className="flex flex-col items-end space-y-1 ml-2">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  suggestion.implementation_effort === 'low' ? 'text-green-600' :
                                  suggestion.implementation_effort === 'medium' ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}
                              >
                                {suggestion.implementation_effort} effort
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  suggestion.impact === 'positive' ? 'text-green-600' :
                                  suggestion.impact === 'neutral' ? 'text-gray-600' :
                                  'text-red-600'
                                }`}
                              >
                                {suggestion.impact} impact
                              </Badge>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Summary */}
            <Separator />
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Total Conflicts:</span>
                <span className="font-medium">{conflictResult.conflicts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Warnings:</span>
                <span className="font-medium">{conflictResult.warnings.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Suggestions:</span>
                <span className="font-medium">{conflictResult.suggestions.length}</span>
              </div>
            </div>
          </>
        )}

        {!isChecking && !conflictResult && (
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Click "Check Again" to detect conflicts
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
