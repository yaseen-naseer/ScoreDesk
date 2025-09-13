'use client'

import { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Users, 
  MapPin, 
  Shield, 
  Settings, 
  Truck,
  Camera,
  FileText,
  RefreshCw,
  Upload,
  Eye,
  ChevronDown,
  ChevronRight,
  Star,
  StarOff
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useSupabase } from '@/components/providers/supabase-provider'
import { PreMatchValidationService, ValidationResult, ValidationCheck, ValidationEvidence } from '@/lib/services/pre-match-validation-service'

interface PreMatchValidationChecklistProps {
  matchId: string
  matchData: {
    home_team_id: string
    away_team_id: string
    venue_id?: string
    scheduled_date: string
    match_duration: number
    tournament_id: string
  }
  onValidationComplete?: (result: ValidationResult) => void
  className?: string
}

const CATEGORY_ICONS = {
  teams: Users,
  venue: MapPin,
  officials: Users,
  equipment: Settings,
  safety: Shield,
  compliance: FileText,
  logistics: Truck
}

const CATEGORY_COLORS = {
  teams: 'bg-blue-100 text-blue-800',
  venue: 'bg-green-100 text-green-800',
  officials: 'bg-purple-100 text-purple-800',
  equipment: 'bg-orange-100 text-orange-800',
  safety: 'bg-red-100 text-red-800',
  compliance: 'bg-yellow-100 text-yellow-800',
  logistics: 'bg-gray-100 text-gray-800'
}

export function PreMatchValidationChecklist({ 
  matchId, 
  matchData, 
  onValidationComplete,
  className 
}: PreMatchValidationChecklistProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isValidating, setIsValidating] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [selectedCheck, setSelectedCheck] = useState<ValidationCheck | null>(null)
  const [completionDetails, setCompletionDetails] = useState('')
  const [isCompletingCheck, setIsCompletingCheck] = useState(false)

  const validationService = new PreMatchValidationService(supabase)

  useEffect(() => {
    loadValidationResult()
  }, [matchId])

  const loadValidationResult = async () => {
    try {
      setIsLoading(true)
      const result = await validationService.getValidationSummary(matchId)
      setValidationResult(result)
      onValidationComplete?.(result || {
        is_valid: false,
        validation_score: 0,
        completed_checks: 0,
        total_checks: 0,
        checklist: [],
        critical_issues: [],
        warnings: [],
        suggestions: []
      })
    } catch (error) {
      console.error('Error loading validation result:', error)
      toast({
        title: 'Error',
        description: 'Failed to load validation checklist',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const runValidation = async () => {
    try {
      setIsValidating(true)
      const result = await validationService.validateMatch({
        match_id: matchId,
        ...matchData
      })
      setValidationResult(result)
      onValidationComplete?.(result)
      
      toast({
        title: 'Validation Complete',
        description: `Validation score: ${result.validation_score}%`,
        variant: result.is_valid ? 'default' : 'destructive'
      })
    } catch (error) {
      console.error('Error running validation:', error)
      toast({
        title: 'Error',
        description: 'Failed to run validation',
        variant: 'destructive'
      })
    } finally {
      setIsValidating(false)
    }
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      case 'in_progress': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'skipped': return <StarOff className="h-4 w-4 text-gray-400" />
      default: return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'skipped': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const completeCheck = async (check: ValidationCheck, status: 'completed' | 'failed') => {
    try {
      setIsCompletingCheck(true)
      
      const success = status === 'completed' 
        ? await validationService.completeValidationCheck(matchId, check.id, 'current_user', completionDetails)
        : await validationService.failValidationCheck(matchId, check.id, 'current_user', completionDetails)

      if (success) {
        toast({
          title: 'Check Updated',
          description: `Validation check marked as ${status}`,
          variant: 'default'
        })
        await loadValidationResult()
        setSelectedCheck(null)
        setCompletionDetails('')
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update validation check',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error completing check:', error)
      toast({
        title: 'Error',
        description: 'Failed to update validation check',
        variant: 'destructive'
      })
    } finally {
      setIsCompletingCheck(false)
    }
  }

  const groupedChecks = validationResult?.checklist.reduce((acc, check) => {
    if (!acc[check.category]) {
      acc[check.category] = []
    }
    acc[check.category].push(check)
    return acc
  }, {} as Record<string, ValidationCheck[]>) || {}

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
            Pre-Match Validation Checklist
          </CardTitle>
          <CardDescription>
            Loading validation checklist...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
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
              <Shield className="h-5 w-5 mr-2" />
              Pre-Match Validation Checklist
            </CardTitle>
            <CardDescription>
              Ensure all requirements are met before the match begins
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            onClick={runValidation}
            disabled={isValidating}
          >
            {isValidating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isValidating ? 'Validating...' : 'Run Validation'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Summary */}
        {validationResult && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {validationResult.validation_score}%
                </div>
                <div className="text-sm text-muted-foreground">Validation Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {validationResult.completed_checks}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {validationResult.critical_issues.length}
                </div>
                <div className="text-sm text-muted-foreground">Critical Issues</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {validationResult.warnings.length}
                </div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{validationResult.completed_checks}/{validationResult.total_checks} checks</span>
              </div>
              <Progress 
                value={(validationResult.completed_checks / validationResult.total_checks) * 100} 
                className="h-2"
              />
            </div>

            {/* Critical Issues */}
            {validationResult.critical_issues.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{validationResult.critical_issues.length} critical issue(s) found:</strong>
                  <ul className="mt-2 space-y-1">
                    {validationResult.critical_issues.map((issue, index) => (
                      <li key={index} className="text-sm">
                        • {issue.title}: {issue.description}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Validation Status */}
            <div className="flex items-center space-x-2">
              {validationResult.is_valid ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-semibold text-green-700">
                    Match Ready - All validations passed
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-semibold text-red-700">
                    Match Not Ready - Critical issues must be resolved
                  </span>
                </>
              )}
            </div>

            <Separator />

            {/* Checklist by Category */}
            <div className="space-y-4">
              {Object.entries(groupedChecks).map(([category, checks]) => {
                const CategoryIcon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]
                const completedInCategory = checks.filter(c => c.status === 'completed').length
                const totalInCategory = checks.filter(c => c.required).length
                const isExpanded = expandedCategories.has(category)

                return (
                  <Collapsible 
                    key={category}
                    open={isExpanded} 
                    onOpenChange={() => toggleCategory(category)}
                  >
                    <CollapsibleTrigger asChild>
                      <Card className="cursor-pointer hover:bg-gray-50">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <CategoryIcon className="h-5 w-5" />
                              <div>
                                <CardTitle className="text-lg capitalize">
                                  {category} Validation
                                </CardTitle>
                                <CardDescription>
                                  {completedInCategory}/{totalInCategory} checks completed
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]}>
                                {Math.round((completedInCategory / totalInCategory) * 100)}%
                              </Badge>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                          <Progress 
                            value={(completedInCategory / totalInCategory) * 100} 
                            className="h-1"
                          />
                        </CardHeader>
                      </Card>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <Card className="mt-2">
                        <CardContent className="pt-4">
                          <ScrollArea className="h-64">
                            <div className="space-y-3">
                              {checks.map((check) => (
                                <div key={check.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div className="flex items-center space-x-3 flex-1">
                                    {getStatusIcon(check.status)}
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium">{check.title}</span>
                                        {check.required && (
                                          <Badge variant="outline" className="text-xs">
                                            Required
                                          </Badge>
                                        )}
                                        <Badge className={getStatusColor(check.status)}>
                                          {check.status}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {check.description}
                                      </p>
                                      {check.details && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {check.details}
                                        </p>
                                      )}
                                      {check.completed_by && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Completed by: {check.completed_by} at {check.completed_at}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => setSelectedCheck(check)}
                                        >
                                          <Eye className="h-4 w-4 mr-1" />
                                          Details
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>{check.title}</DialogTitle>
                                          <DialogDescription>
                                            {check.description}
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <Label>Status</Label>
                                              <Badge className={getStatusColor(check.status)}>
                                                {check.status}
                                              </Badge>
                                            </div>
                                            <div>
                                              <Label>Weight</Label>
                                              <Badge variant="outline">{check.weight}</Badge>
                                            </div>
                                          </div>
                                          
                                          {check.details && (
                                            <div>
                                              <Label>Details</Label>
                                              <p className="text-sm text-muted-foreground">{check.details}</p>
                                            </div>
                                          )}

                                          <div>
                                            <Label htmlFor="completion-details">Completion Details</Label>
                                            <Textarea
                                              id="completion-details"
                                              value={completionDetails}
                                              onChange={(e) => setCompletionDetails(e.target.value)}
                                              placeholder="Enter details about this validation check..."
                                              rows={3}
                                            />
                                          </div>

                                          <div className="flex space-x-2">
                                            <Button
                                              onClick={() => completeCheck(check, 'completed')}
                                              disabled={isCompletingCheck}
                                              className="flex-1"
                                            >
                                              <CheckCircle className="h-4 w-4 mr-2" />
                                              Mark Complete
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              onClick={() => completeCheck(check, 'failed')}
                                              disabled={isCompletingCheck}
                                              className="flex-1"
                                            >
                                              <XCircle className="h-4 w-4 mr-2" />
                                              Mark Failed
                                            </Button>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
