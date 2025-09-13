'use client'

import { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  Shield, 
  Users, 
  Clock, 
  MapPin, 
  UserCheck,
  Settings,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { TournamentRulesEnforcementService, RuleEnforcementResult, RuleViolation, TournamentRuleContext } from '@/lib/services/tournament-rules-enforcement-service'
import type { Database } from '@/lib/supabase/types'

type Tournament = Database['public']['Tables']['tournaments']['Row']
type Match = Database['public']['Tables']['matches']['Row']
type Team = Database['public']['Tables']['teams']['Row']
type Player = Database['public']['Tables']['players']['Row']
type Referee = Database['public']['Tables']['referees']['Row']
type Venue = Database['public']['Tables']['venues']['Row']
type TournamentTeam = Database['public']['Tables']['tournament_teams']['Row']

interface TournamentRulesEnforcementProps {
  tournamentId: string
  matchId?: string
  onComplianceChange?: (isCompliant: boolean) => void
}

export function TournamentRulesEnforcement({ 
  tournamentId, 
  matchId, 
  onComplianceChange 
}: TournamentRulesEnforcementProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [enforcementResult, setEnforcementResult] = useState<RuleEnforcementResult | null>(null)
  const [expandedViolations, setExpandedViolations] = useState<Set<string>>(new Set())
  const [showDetails, setShowDetails] = useState(false)

  const enforcementService = new TournamentRulesEnforcementService()

  useEffect(() => {
    if (tournamentId) {
      runRuleEnforcement()
    }
  }, [tournamentId, matchId])

  const runRuleEnforcement = async () => {
    try {
      setIsLoading(true)
      
      const context = await buildRuleContext()
      const result = await enforcementService.enforceTournamentRules(context)
      
      setEnforcementResult(result)
      onComplianceChange?.(result.is_compliant)
      
      if (!result.is_compliant) {
        toast({
          title: 'Rule Violations Detected',
          description: `${result.violations.length} critical violations must be resolved`,
          variant: 'destructive'
        })
      } else if (result.warnings.length > 0) {
        toast({
          title: 'Rule Warnings',
          description: `${result.warnings.length} warnings found`,
          variant: 'default'
        })
      } else {
        toast({
          title: 'All Rules Compliant',
          description: 'Tournament meets all rule requirements',
          variant: 'default'
        })
      }
    } catch (error) {
      console.error('Error running rule enforcement:', error)
      toast({
        title: 'Error',
        description: 'Failed to run rule enforcement',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const buildRuleContext = async (): Promise<TournamentRuleContext> => {
    // Get tournament details
    const { data: tournament } = await enforcementService.supabaseClient
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single()

    const context: TournamentRuleContext = { tournament: tournament! }

    // Get match details if matchId provided
    if (matchId) {
      const { data: match } = await enforcementService.supabaseClient
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()
      
      if (match) {
        context.match = match
      }
    }

    // Get teams and tournament teams
    const { data: tournamentTeams } = await enforcementService.supabaseClient
      .from('tournament_teams')
      .select(`
        *,
        team:teams(*)
      `)
      .eq('tournament_id', tournamentId)
      .eq('is_active', true)

    if (tournamentTeams) {
      context.tournament_teams = tournamentTeams
      context.teams = tournamentTeams.map(tt => tt.team).filter(Boolean) as Team[]
    }

    // Get players for all teams
    if (context.teams) {
      const teamIds = context.teams.map(t => t.id)
      const { data: players } = await enforcementService.supabaseClient
        .from('players')
        .select('*')
        .in('team_id', teamIds)
        .eq('is_active', true)
      
      if (players) {
        context.players = players
      }
    }

    // Get referees if match exists
    if (context.match) {
      const { data: officials } = await enforcementService.supabaseClient
        .from('match_officials')
        .select(`
          *,
          referee:referees(*)
        `)
        .eq('match_id', context.match.id)

      if (officials) {
        context.referees = officials.map(o => o.referee).filter(Boolean) as Referee[]
      }

      // Get venue
      if (context.match.venue_id) {
        const { data: venue } = await enforcementService.supabaseClient
          .from('venues')
          .select('*')
          .eq('id', context.match.venue_id)
          .single()
        
        if (venue) {
          context.venue = venue
        }
      }
    }

    return context
  }

  const toggleViolationExpansion = (violationId: string) => {
    const newExpanded = new Set(expandedViolations)
    if (newExpanded.has(violationId)) {
      newExpanded.delete(violationId)
    } else {
      newExpanded.add(violationId)
    }
    setExpandedViolations(newExpanded)
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'warning':
        return 'secondary'
      case 'info':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getRuleTypeIcon = (ruleType: string) => {
    switch (ruleType) {
      case 'team_size':
        return <Users className="h-4 w-4" />
      case 'age_limit':
        return <UserCheck className="h-4 w-4" />
      case 'match_duration':
        return <Clock className="h-4 w-4" />
      case 'officials_required':
        return <Shield className="h-4 w-4" />
      case 'venue_availability':
        return <MapPin className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Rule Enforcement
          </CardTitle>
          <CardDescription>
            Checking tournament compliance...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Running rule enforcement...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!enforcementResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Rule Enforcement
          </CardTitle>
          <CardDescription>
            No enforcement results available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runRuleEnforcement}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Run Rule Enforcement
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Rule Enforcement
            </CardTitle>
            <CardDescription>
              Tournament compliance and rule validation
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
            <Button variant="outline" size="sm" onClick={runRuleEnforcement}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Compliance Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {enforcementResult.is_compliant ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {enforcementResult.is_compliant ? 'Compliant' : 'Non-Compliant'}
              </span>
            </div>
            <Badge variant={enforcementResult.is_compliant ? 'default' : 'destructive'}>
              {enforcementResult.compliance_score}% Compliant
            </Badge>
          </div>
          
          <Progress value={enforcementResult.compliance_score} className="h-2" />
          
          {enforcementResult.can_proceed ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Tournament meets all requirements and can proceed.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {enforcementResult.blocking_issues.length} critical issue{enforcementResult.blocking_issues.length > 1 ? 's' : ''} must be resolved before proceeding.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Violations Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="font-medium">Critical</span>
              </div>
              <div className="text-2xl font-bold text-red-500 mt-1">
                {enforcementResult.violations.length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">Warnings</span>
              </div>
              <div className="text-2xl font-bold text-yellow-500 mt-1">
                {enforcementResult.warnings.length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Info className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Suggestions</span>
              </div>
              <div className="text-2xl font-bold text-blue-500 mt-1">
                {enforcementResult.suggestions.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Critical Violations */}
        {enforcementResult.violations.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-red-600">Critical Violations</h3>
            <div className="space-y-2">
              {enforcementResult.violations.map((violation) => (
                <Card key={violation.id} className="border-red-200">
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-red-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getSeverityIcon(violation.severity)}
                            {getRuleTypeIcon(violation.rule_type)}
                            <span className="font-medium">{violation.title}</span>
                          </div>
                          <Badge variant="destructive">Critical</Badge>
                        </div>
                        <CardDescription>{violation.description}</CardDescription>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div>
                            <span className="font-medium">Affected:</span> {violation.affected_entity_type} - {violation.affected_entity}
                          </div>
                          
                          <div>
                            <span className="font-medium">Suggested Actions:</span>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              {violation.suggested_actions.map((action, index) => (
                                <li key={index} className="text-sm text-muted-foreground">
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          {violation.metadata && showDetails && (
                            <div>
                              <span className="font-medium">Details:</span>
                              <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                                {JSON.stringify(violation.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {enforcementResult.warnings.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-yellow-600">Warnings</h3>
            <div className="space-y-2">
              {enforcementResult.warnings.map((violation) => (
                <Card key={violation.id} className="border-yellow-200">
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-yellow-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getSeverityIcon(violation.severity)}
                            {getRuleTypeIcon(violation.rule_type)}
                            <span className="font-medium">{violation.title}</span>
                          </div>
                          <Badge variant="secondary">Warning</Badge>
                        </div>
                        <CardDescription>{violation.description}</CardDescription>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div>
                            <span className="font-medium">Affected:</span> {violation.affected_entity_type} - {violation.affected_entity}
                          </div>
                          
                          <div>
                            <span className="font-medium">Suggested Actions:</span>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              {violation.suggested_actions.map((action, index) => (
                                <li key={index} className="text-sm text-muted-foreground">
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          {violation.metadata && showDetails && (
                            <div>
                              <span className="font-medium">Details:</span>
                              <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                                {JSON.stringify(violation.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {enforcementResult.suggestions.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-blue-600">Suggestions</h3>
            <div className="space-y-2">
              {enforcementResult.suggestions.map((suggestion, index) => (
                <Alert key={index}>
                  <Info className="h-4 w-4" />
                  <AlertDescription>{suggestion}</AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
