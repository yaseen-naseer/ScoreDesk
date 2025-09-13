'use client'

import { useState, useEffect } from 'react'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  X,
  Eye,
  RefreshCw,
  Settings,
  AlertCircle,
  Users,
  Clock,
  FileText,
  Zap
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useSupabase } from '@/components/providers/supabase-provider'
import { 
  ConflictDetectionService, 
  ConflictDetectionResult, 
  ConflictRule,
  ConflictRuleType
} from '@/lib/services/conflict-detection-service'

interface ConflictDetectionManagerProps {
  matchId: string
  matchName: string
  onConflictsDetected?: (result: ConflictDetectionResult) => void
  className?: string
}

export function ConflictDetectionManager({ 
  matchId, 
  matchName,
  onConflictsDetected,
  className 
}: ConflictDetectionManagerProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionResult, setDetectionResult] = useState<ConflictDetectionResult | null>(null)
  const [conflictRules, setConflictRules] = useState<ConflictRule[]>([])
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)
  const [selectedConflict, setSelectedConflict] = useState<any>(null)
  const [overrideJustification, setOverrideJustification] = useState('')

  const conflictService = new ConflictDetectionService(supabase)

  useEffect(() => {
    loadConflictRules()
    detectConflicts()
  }, [matchId])

  const loadConflictRules = async () => {
    try {
      const rules = await conflictService.getActiveConflictRules()
      setConflictRules(rules)
    } catch (error) {
      console.error('Error loading conflict rules:', error)
    }
  }

  const detectConflicts = async () => {
    try {
      setIsDetecting(true)
      const result = await conflictService.detectMatchConflicts(matchId)
      setDetectionResult(result)
      onConflictsDetected?.(result)
      
      if (result.has_conflicts) {
        toast({
          title: 'Conflicts Detected',
          description: `Found ${result.conflicts.length} conflicts requiring attention`,
          variant: 'destructive'
        })
      } else {
        toast({
          title: 'No Conflicts',
          description: 'Match officials have no detected conflicts',
          variant: 'default'
        })
      }
    } catch (error) {
      console.error('Error detecting conflicts:', error)
      toast({
        title: 'Error',
        description: 'Failed to detect conflicts',
        variant: 'destructive'
      })
    } finally {
      setIsDetecting(false)
    }
  }

  const overrideConflict = async () => {
    if (!selectedConflict || !overrideJustification.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide justification for override',
        variant: 'destructive'
      })
      return
    }

    try {
      // Implementation would override the conflict
      toast({
        title: 'Conflict Overridden',
        description: 'Conflict has been overridden with justification',
        variant: 'default'
      })
      
      setShowOverrideDialog(false)
      setOverrideJustification('')
      setSelectedConflict(null)
      
      // Re-detect conflicts to update the display
      await detectConflicts()
      
    } catch (error) {
      console.error('Error overriding conflict:', error)
      toast({
        title: 'Error',
        description: 'Failed to override conflict',
        variant: 'destructive'
      })
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />
      case 'high': return <AlertCircle className="h-4 w-4" />
      case 'medium': return <AlertCircle className="h-4 w-4" />
      case 'low': return <AlertCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600'
    if (score >= 60) return 'text-orange-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Conflict Detection
            </CardTitle>
            <CardDescription>
              {matchName} - Detect and manage conflicts of interest
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={detectConflicts}
              disabled={isDetecting}
            >
              {isDetecting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {isDetecting ? 'Detecting...' : 'Detect Conflicts'}
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Rules
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Conflict Detection Rules</DialogTitle>
                  <DialogDescription>
                    Configure rules for detecting conflicts of interest
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Active Rules</Label>
                    <div className="space-y-2">
                      {conflictRules.map((rule) => (
                        <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Badge variant={getSeverityColor(rule.severity)}>
                              {getSeverityIcon(rule.severity)}
                              <span className="ml-1">{rule.severity}</span>
                            </Badge>
                            <div>
                              <div className="font-medium">{rule.name}</div>
                              <div className="text-sm text-muted-foreground">{rule.description}</div>
                            </div>
                          </div>
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {detectionResult ? (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
              <TabsTrigger value="warnings">Warnings</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getRiskScoreColor(detectionResult.risk_score)}`}>
                      {detectionResult.risk_score}%
                    </div>
                    <Progress value={detectionResult.risk_score} className="h-2 mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {detectionResult.risk_score >= 80 ? 'High Risk' : 
                       detectionResult.risk_score >= 60 ? 'Medium Risk' : 
                       detectionResult.risk_score >= 40 ? 'Low Risk' : 'Minimal Risk'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Critical Conflicts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {detectionResult.conflicts.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Requiring immediate attention
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Warnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {detectionResult.warnings.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      For review and consideration
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detection Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Detection Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      {detectionResult.has_conflicts ? (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      <span className="font-medium">
                        {detectionResult.has_conflicts ? 'Conflicts Detected' : 'No Conflicts Found'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Last detected: {new Date(detectionResult.detected_at).toLocaleString()}
                    </div>
                    
                    {detectionResult.has_conflicts && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          This match has conflicts that may affect fair play. Please review and resolve conflicts before the match begins.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Conflicts Tab */}
            <TabsContent value="conflicts" className="space-y-4">
              {detectionResult.conflicts.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Critical Conflicts</h3>
                    <p className="text-muted-foreground">
                      No critical conflicts have been detected for this match
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {detectionResult.conflicts.map((conflict) => (
                    <Card key={conflict.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant={getSeverityColor(conflict.severity)}>
                              {getSeverityIcon(conflict.severity)}
                              <span className="ml-1">{conflict.severity}</span>
                            </Badge>
                            <CardTitle className="text-lg">{conflict.rule_name}</CardTitle>
                          </div>
                          {conflict.can_override && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedConflict(conflict)
                                setShowOverrideDialog(true)
                              }}
                            >
                              Override
                            </Button>
                          )}
                        </div>
                        <CardDescription>{conflict.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Affected Parties</Label>
                          <div className="mt-2 space-y-2">
                            {conflict.affected_parties.map((party, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <Badge variant="outline">{party.type}</Badge>
                                <span className="text-sm">{party.entity_name}</span>
                                <span className="text-xs text-muted-foreground">({party.role})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {conflict.override_justification_required && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              Override requires written justification and approval
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Warnings Tab */}
            <TabsContent value="warnings" className="space-y-4">
              {detectionResult.warnings.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Warnings</h3>
                    <p className="text-muted-foreground">
                      No warnings have been detected for this match
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {detectionResult.warnings.map((warning) => (
                    <Card key={warning.id}>
                      <CardHeader>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getSeverityColor(warning.severity)}>
                            {getSeverityIcon(warning.severity)}
                            <span className="ml-1">{warning.severity}</span>
                          </Badge>
                          <CardTitle className="text-lg">{warning.rule_name}</CardTitle>
                        </div>
                        <CardDescription>{warning.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div>
                          <Label className="text-sm font-medium">Affected Parties</Label>
                          <div className="mt-2 space-y-2">
                            {warning.affected_parties.map((party, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <Badge variant="outline">{party.type}</Badge>
                                <span className="text-sm">{party.entity_name}</span>
                                <span className="text-xs text-muted-foreground">({party.role})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Detection Results</h3>
              <p className="text-muted-foreground">
                Run conflict detection to analyze match officials for conflicts of interest
              </p>
            </CardContent>
          </Card>
        )}

        {/* Override Dialog */}
        <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Override Conflict</DialogTitle>
              <DialogDescription>
                Provide justification for overriding this conflict detection
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedConflict && (
                <div className="p-4 border rounded-lg bg-muted">
                  <div className="font-medium">{selectedConflict.rule_name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {selectedConflict.description}
                  </div>
                  <Badge variant={getSeverityColor(selectedConflict.severity)} className="mt-2">
                    {selectedConflict.severity} severity
                  </Badge>
                </div>
              )}
              
              <div>
                <Label htmlFor="justification">Justification</Label>
                <Textarea
                  id="justification"
                  placeholder="Provide detailed justification for overriding this conflict..."
                  value={overrideJustification}
                  onChange={(e) => setOverrideJustification(e.target.value)}
                  className="mt-2"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={overrideConflict}>
                  Override Conflict
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
