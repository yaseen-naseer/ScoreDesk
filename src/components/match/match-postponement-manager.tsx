'use client'

import { useState, useEffect } from 'react'
import { 
  Clock, 
  X, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  FileText,
  Send,
  Eye,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Info
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  MatchPostponementService, 
  PostponementRequest, 
  CancellationRequest, 
  PostponementImpact,
  PostponementReason,
  CancellationReason
} from '@/lib/services/match-postponement-service'

interface MatchPostponementManagerProps {
  matchId: string
  matchName: string
  tournamentId: string
  onPostponementCreated?: (request: PostponementRequest) => void
  onCancellationCreated?: (request: CancellationRequest) => void
  className?: string
}

export function MatchPostponementManager({ 
  matchId, 
  matchName,
  tournamentId,
  onPostponementCreated,
  onCancellationCreated,
  className 
}: MatchPostponementManagerProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [postponementRequests, setPostponementRequests] = useState<PostponementRequest[]>([])
  const [cancellationRequests, setCancellationRequests] = useState<CancellationRequest[]>([])
  const [impactAnalysis, setImpactAnalysis] = useState<PostponementImpact | null>(null)
  
  // Form states
  const [showPostponementForm, setShowPostponementForm] = useState(false)
  const [showCancellationForm, setShowCancellationForm] = useState(false)
  const [postponementForm, setPostponementForm] = useState({
    reason: '' as PostponementReason,
    reason_description: '',
    new_scheduled_date: '',
    new_venue_id: '',
    urgency_level: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    additional_notes: ''
  })
  const [cancellationForm, setCancellationForm] = useState({
    reason: '' as CancellationReason,
    reason_description: '',
    urgency_level: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    refund_required: false,
    refund_amount: '',
    additional_notes: ''
  })

  const postponementService = new MatchPostponementService()

  useEffect(() => {
    loadRequests()
    analyzeImpact()
  }, [matchId])

  const loadRequests = async () => {
    try {
      setIsLoading(true)
      
      const [postponements, cancellations] = await Promise.all([
        postponementService.getPostponementRequests(tournamentId),
        postponementService.getCancellationRequests(tournamentId)
      ])
      
      setPostponementRequests(postponements.filter(p => p.match_id === matchId))
      setCancellationRequests(cancellations.filter(c => c.match_id === matchId))
      
    } catch (error) {
      console.error('Error loading requests:', error)
      toast({
        title: 'Error',
        description: 'Failed to load postponement/cancellation requests',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const analyzeImpact = async () => {
    try {
      const impact = await postponementService.analyzePostponementImpact(matchId)
      setImpactAnalysis(impact)
    } catch (error) {
      console.error('Error analyzing impact:', error)
    }
  }

  const createPostponementRequest = async () => {
    try {
      setIsLoading(true)
      
      const request = await postponementService.createPostponementRequest({
        match_id: matchId,
        reason: postponementForm.reason,
        reason_description: postponementForm.reason_description,
        requested_by: 'current-user-id', // Would be replaced with actual user ID
        new_scheduled_date: postponementForm.new_scheduled_date || undefined,
        new_venue_id: postponementForm.new_venue_id || undefined,
        affected_parties: [], // Would be populated based on match details
        urgency_level: postponementForm.urgency_level,
        additional_notes: postponementForm.additional_notes || undefined
      })

      setPostponementRequests(prev => [request, ...prev])
      onPostponementCreated?.(request)
      
      toast({
        title: 'Success',
        description: 'Postponement request created successfully',
        variant: 'default'
      })

      setShowPostponementForm(false)
      resetPostponementForm()

    } catch (error) {
      console.error('Error creating postponement request:', error)
      toast({
        title: 'Error',
        description: 'Failed to create postponement request',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createCancellationRequest = async () => {
    try {
      setIsLoading(true)
      
      const request = await postponementService.createCancellationRequest({
        match_id: matchId,
        reason: cancellationForm.reason,
        reason_description: cancellationForm.reason_description,
        requested_by: 'current-user-id', // Would be replaced with actual user ID
        affected_parties: [], // Would be populated based on match details
        urgency_level: cancellationForm.urgency_level,
        refund_required: cancellationForm.refund_required,
        refund_amount: cancellationForm.refund_amount ? parseFloat(cancellationForm.refund_amount) : undefined,
        additional_notes: cancellationForm.additional_notes || undefined
      })

      setCancellationRequests(prev => [request, ...prev])
      onCancellationCreated?.(request)
      
      toast({
        title: 'Success',
        description: 'Cancellation request created successfully',
        variant: 'default'
      })

      setShowCancellationForm(false)
      resetCancellationForm()

    } catch (error) {
      console.error('Error creating cancellation request:', error)
      toast({
        title: 'Error',
        description: 'Failed to create cancellation request',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetPostponementForm = () => {
    setPostponementForm({
      reason: '' as PostponementReason,
      reason_description: '',
      new_scheduled_date: '',
      new_venue_id: '',
      urgency_level: 'medium',
      additional_notes: ''
    })
  }

  const resetCancellationForm = () => {
    setCancellationForm({
      reason: '' as CancellationReason,
      reason_description: '',
      urgency_level: 'medium',
      refund_required: false,
      refund_amount: '',
      additional_notes: ''
    })
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default'
      case 'rejected': return 'destructive'
      case 'pending': return 'secondary'
      case 'rescheduled': return 'default'
      case 'cancelled': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <X className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'rescheduled': return <RefreshCw className="h-4 w-4" />
      case 'cancelled': return <X className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Match Postponement & Cancellation
            </CardTitle>
            <CardDescription>
              {matchName} - Manage postponements and cancellations
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowPostponementForm(true)}
              disabled={isLoading}
            >
              <Clock className="h-4 w-4 mr-2" />
              Request Postponement
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowCancellationForm(true)}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Request Cancellation
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="postponements">Postponements</TabsTrigger>
            <TabsTrigger value="cancellations">Cancellations</TabsTrigger>
            <TabsTrigger value="impact">Impact Analysis</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Postponements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {postponementRequests.filter(p => p.status === 'pending').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pending approval
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Cancellations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {cancellationRequests.filter(c => c.status === 'pending').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pending approval
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {postponementRequests.length + cancellationRequests.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All time
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Requests */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...postponementRequests, ...cancellationRequests]
                    .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime())
                    .slice(0, 5)
                    .map((request, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {request.reason.includes('postponement') ? (
                          <Clock className="h-4 w-4 text-blue-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                        <div>
                          <div className="font-medium">
                            {request.reason.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(request.requested_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Badge variant={getStatusColor(request.status)}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1">{request.status}</span>
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Postponements Tab */}
          <TabsContent value="postponements" className="space-y-4">
            <div className="space-y-4">
              {postponementRequests.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Postponement Requests</h3>
                    <p className="text-muted-foreground">
                      No postponement requests have been made for this match
                    </p>
                  </CardContent>
                </Card>
              ) : (
                postponementRequests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-5 w-5 text-blue-500" />
                          <CardTitle className="text-lg">
                            Postponement Request
                          </CardTitle>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getUrgencyColor(request.urgency_level)}>
                            {request.urgency_level}
                          </Badge>
                          <Badge variant={getStatusColor(request.status)}>
                            {getStatusIcon(request.status)}
                            <span className="ml-1">{request.status}</span>
                          </Badge>
                        </div>
                      </div>
                      <CardDescription>
                        Requested on {new Date(request.requested_at).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Reason</Label>
                          <p className="text-sm text-muted-foreground">
                            {request.reason.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Description</Label>
                          <p className="text-sm text-muted-foreground">
                            {request.reason_description}
                          </p>
                        </div>
                      </div>
                      
                      {request.new_scheduled_date && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">New Scheduled Date</Label>
                            <p className="text-sm text-muted-foreground">
                              {new Date(request.new_scheduled_date).toLocaleString()}
                            </p>
                          </div>
                          {request.new_venue_id && (
                            <div>
                              <Label className="text-sm font-medium">New Venue</Label>
                              <p className="text-sm text-muted-foreground">
                                Venue ID: {request.new_venue_id}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {request.additional_notes && (
                        <div>
                          <Label className="text-sm font-medium">Additional Notes</Label>
                          <p className="text-sm text-muted-foreground">
                            {request.additional_notes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Cancellations Tab */}
          <TabsContent value="cancellations" className="space-y-4">
            <div className="space-y-4">
              {cancellationRequests.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <X className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Cancellation Requests</h3>
                    <p className="text-muted-foreground">
                      No cancellation requests have been made for this match
                    </p>
                  </CardContent>
                </Card>
              ) : (
                cancellationRequests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <X className="h-5 w-5 text-red-500" />
                          <CardTitle className="text-lg">
                            Cancellation Request
                          </CardTitle>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getUrgencyColor(request.urgency_level)}>
                            {request.urgency_level}
                          </Badge>
                          <Badge variant={getStatusColor(request.status)}>
                            {getStatusIcon(request.status)}
                            <span className="ml-1">{request.status}</span>
                          </Badge>
                        </div>
                      </div>
                      <CardDescription>
                        Requested on {new Date(request.requested_at).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Reason</Label>
                          <p className="text-sm text-muted-foreground">
                            {request.reason.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Description</Label>
                          <p className="text-sm text-muted-foreground">
                            {request.reason_description}
                          </p>
                        </div>
                      </div>
                      
                      {request.refund_required && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Refund Required</Label>
                            <p className="text-sm text-muted-foreground">
                              {request.refund_required ? 'Yes' : 'No'}
                            </p>
                          </div>
                          {request.refund_amount && (
                            <div>
                              <Label className="text-sm font-medium">Refund Amount</Label>
                              <p className="text-sm text-muted-foreground">
                                ${request.refund_amount}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {request.additional_notes && (
                        <div>
                          <Label className="text-sm font-medium">Additional Notes</Label>
                          <p className="text-sm text-muted-foreground">
                            {request.additional_notes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Impact Analysis Tab */}
          <TabsContent value="impact" className="space-y-4">
            {impactAnalysis ? (
              <div className="space-y-4">
                {/* Tournament Impact */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Tournament Impact
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {impactAnalysis.tournament_impact.subsequent_matches_affected}
                        </div>
                        <div className="text-sm text-muted-foreground">Affected Matches</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {impactAnalysis.tournament_impact.tournament_completion_delay}h
                        </div>
                        <div className="text-sm text-muted-foreground">Delay</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {impactAnalysis.tournament_impact.tournament_delay ? 'Yes' : 'No'}
                        </div>
                        <div className="text-sm text-muted-foreground">Tournament Delay</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Impact */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="h-5 w-5 mr-2" />
                      Financial Impact
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          ${impactAnalysis.financial_impact.estimated_cost}
                        </div>
                        <div className="text-sm text-muted-foreground">Estimated Cost</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          ${impactAnalysis.financial_impact.additional_costs}
                        </div>
                        <div className="text-sm text-muted-foreground">Additional Costs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {impactAnalysis.financial_impact.refund_required ? 'Yes' : 'No'}
                        </div>
                        <div className="text-sm text-muted-foreground">Refund Required</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Impact Analysis</h3>
                  <p className="text-muted-foreground">
                    Impact analysis will be available once postponement is requested
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Postponement Request Dialog */}
        <Dialog open={showPostponementForm} onOpenChange={setShowPostponementForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Request Match Postponement</DialogTitle>
              <DialogDescription>
                Request to postpone the match with new scheduling details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reason">Reason for Postponement</Label>
                  <Select value={postponementForm.reason} onValueChange={(value) => setPostponementForm(prev => ({ ...prev, reason: value as PostponementReason }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weather_conditions">Weather Conditions</SelectItem>
                      <SelectItem value="venue_unavailable">Venue Unavailable</SelectItem>
                      <SelectItem value="referee_unavailable">Referee Unavailable</SelectItem>
                      <SelectItem value="team_unavailable">Team Unavailable</SelectItem>
                      <SelectItem value="security_concerns">Security Concerns</SelectItem>
                      <SelectItem value="technical_issues">Technical Issues</SelectItem>
                      <SelectItem value="force_majeure">Force Majeure</SelectItem>
                      <SelectItem value="scheduling_conflict">Scheduling Conflict</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="urgency">Urgency Level</Label>
                  <Select value={postponementForm.urgency_level} onValueChange={(value) => setPostponementForm(prev => ({ ...prev, urgency_level: value as any }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Reason Description</Label>
                <Textarea
                  id="description"
                  placeholder="Provide detailed description of the postponement reason"
                  value={postponementForm.reason_description}
                  onChange={(e) => setPostponementForm(prev => ({ ...prev, reason_description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new_date">New Scheduled Date</Label>
                  <Input
                    id="new_date"
                    type="datetime-local"
                    value={postponementForm.new_scheduled_date}
                    onChange={(e) => setPostponementForm(prev => ({ ...prev, new_scheduled_date: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="new_venue">New Venue ID (Optional)</Label>
                  <Input
                    id="new_venue"
                    placeholder="Enter venue ID"
                    value={postponementForm.new_venue_id}
                    onChange={(e) => setPostponementForm(prev => ({ ...prev, new_venue_id: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information or special requirements"
                  value={postponementForm.additional_notes}
                  onChange={(e) => setPostponementForm(prev => ({ ...prev, additional_notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowPostponementForm(false)}>
                  Cancel
                </Button>
                <Button onClick={createPostponementRequest} disabled={isLoading || !postponementForm.reason || !postponementForm.reason_description}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancellation Request Dialog */}
        <Dialog open={showCancellationForm} onOpenChange={setShowCancellationForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Request Match Cancellation</DialogTitle>
              <DialogDescription>
                Request to cancel the match permanently
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cancel_reason">Reason for Cancellation</Label>
                  <Select value={cancellationForm.reason} onValueChange={(value) => setCancellationForm(prev => ({ ...prev, reason: value as CancellationReason }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weather_conditions">Weather Conditions</SelectItem>
                      <SelectItem value="venue_damage">Venue Damage</SelectItem>
                      <SelectItem value="team_withdrawal">Team Withdrawal</SelectItem>
                      <SelectItem value="referee_unavailable">Referee Unavailable</SelectItem>
                      <SelectItem value="security_incident">Security Incident</SelectItem>
                      <SelectItem value="force_majeure">Force Majeure</SelectItem>
                      <SelectItem value="tournament_cancellation">Tournament Cancellation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="cancel_urgency">Urgency Level</Label>
                  <Select value={cancellationForm.urgency_level} onValueChange={(value) => setCancellationForm(prev => ({ ...prev, urgency_level: value as any }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="cancel_description">Cancellation Description</Label>
                <Textarea
                  id="cancel_description"
                  placeholder="Provide detailed description of the cancellation reason"
                  value={cancellationForm.reason_description}
                  onChange={(e) => setCancellationForm(prev => ({ ...prev, reason_description: e.target.value }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="refund_required"
                  checked={cancellationForm.refund_required}
                  onCheckedChange={(checked) => setCancellationForm(prev => ({ ...prev, refund_required: checked }))}
                />
                <Label htmlFor="refund_required">Refund Required</Label>
              </div>

              {cancellationForm.refund_required && (
                <div>
                  <Label htmlFor="refund_amount">Refund Amount ($)</Label>
                  <Input
                    id="refund_amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cancellationForm.refund_amount}
                    onChange={(e) => setCancellationForm(prev => ({ ...prev, refund_amount: e.target.value }))}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="cancel_notes">Additional Notes</Label>
                <Textarea
                  id="cancel_notes"
                  placeholder="Any additional information about the cancellation"
                  value={cancellationForm.additional_notes}
                  onChange={(e) => setCancellationForm(prev => ({ ...prev, additional_notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCancellationForm(false)}>
                  Cancel
                </Button>
                <Button onClick={createCancellationRequest} disabled={isLoading || !cancellationForm.reason || !cancellationForm.reason_description}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
