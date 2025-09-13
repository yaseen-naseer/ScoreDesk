'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, DollarSign, AlertTriangle, CheckCircle, XCircle, Plus, Minus, Settings } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { TournamentRegistrationDeadlineService, RegistrationDeadlineStatus, DeadlineExtension, RegistrationPayment } from '@/lib/services/tournament-registration-deadline-service'

interface RegistrationDeadlineManagerProps {
  tournamentId: string
  tournamentName: string
  onDeadlineChange?: () => void
}

export function RegistrationDeadlineManager({ 
  tournamentId, 
  tournamentName,
  onDeadlineChange 
}: RegistrationDeadlineManagerProps) {
  const { toast } = useToast()
  const [deadlineStatus, setDeadlineStatus] = useState<RegistrationDeadlineStatus | null>(null)
  const [deadlineExtensions, setDeadlineExtensions] = useState<DeadlineExtension[]>([])
  const [paymentHistory, setPaymentHistory] = useState<RegistrationPayment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExtending, setIsExtending] = useState(false)
  const [showExtensionDialog, setShowExtensionDialog] = useState(false)
  
  // Extension form state
  const [extensionForm, setExtensionForm] = useState({
    newDeadline: '',
    reason: '',
    durationHours: 24
  })

  useEffect(() => {
    loadDeadlineData()
  }, [tournamentId])

  const loadDeadlineData = async () => {
    try {
      setIsLoading(true)
      const [status, extensions, payments] = await Promise.all([
        tournamentRegistrationDeadlineService.getRegistrationDeadlineStatus(tournamentId),
        tournamentRegistrationDeadlineService.getDeadlineExtensionHistory(tournamentId),
        tournamentRegistrationDeadlineService.getPaymentHistory(tournamentId)
      ])
      setDeadlineStatus(status)
      setDeadlineExtensions(extensions)
      setPaymentHistory(payments)
    } catch (error) {
      console.error('Error loading deadline data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load registration deadline data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExtendDeadline = async () => {
    if (!extensionForm.newDeadline || !extensionForm.reason) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsExtending(true)
      const success = await tournamentRegistrationDeadlineService.extendRegistrationDeadline(
        tournamentId,
        extensionForm.newDeadline,
        extensionForm.reason,
        'current-user-id', // This should come from auth context
        extensionForm.durationHours
      )

      if (success) {
        toast({
          title: 'Success',
          description: 'Registration deadline extended successfully'
        })
        setShowExtensionDialog(false)
        setExtensionForm({ newDeadline: '', reason: '', durationHours: 24 })
        await loadDeadlineData()
        onDeadlineChange?.()
      } else {
        throw new Error('Failed to extend deadline')
      }
    } catch (error) {
      console.error('Error extending deadline:', error)
      toast({
        title: 'Error',
        description: 'Failed to extend registration deadline',
        variant: 'destructive'
      })
    } finally {
      setIsExtending(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'closed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'extended':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-600" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'default'
      case 'closed':
        return 'destructive'
      case 'extended':
        return 'secondary'
      case 'cancelled':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registration Deadline Management</CardTitle>
          <CardDescription>Loading deadline information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!deadlineStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registration Deadline Management</CardTitle>
          <CardDescription>Unable to load deadline information</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load registration deadline data. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Registration Status</span>
            {getStatusIcon(deadlineStatus.current_status)}
          </CardTitle>
          <CardDescription>
            Current registration deadline status and key information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={getStatusColor(deadlineStatus.current_status)}>
                  {deadlineStatus.current_status}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Days Until Deadline:</span>
                <span className={deadlineStatus.days_until_deadline <= 7 ? 'text-red-600 font-semibold' : ''}>
                  {deadlineStatus.days_until_deadline}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Registrations:</span>
                <span>{deadlineStatus.registration_count}</span>
                {deadlineStatus.max_registrations && (
                  <span className="text-muted-foreground">/ {deadlineStatus.max_registrations}</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Full:</span>
                <Badge variant={deadlineStatus.is_full ? 'destructive' : 'outline'}>
                  {deadlineStatus.is_full ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Entry Fee:</span>
                <span>{formatCurrency(deadlineStatus.fee_structure.entry_fee, deadlineStatus.fee_structure.currency)}</span>
              </div>
              {deadlineStatus.can_get_early_bird && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Early Bird:</span>
                  <Badge variant="outline" className="text-green-600">
                    {formatCurrency(deadlineStatus.fee_structure.early_bird_discount_amount || 0)}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Registration Capabilities */}
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Can Register:</span>
                <Badge variant={deadlineStatus.can_register ? 'default' : 'secondary'}>
                  {deadlineStatus.can_register ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Late Registration:</span>
                <Badge variant={deadlineStatus.can_register_late ? 'secondary' : 'outline'}>
                  {deadlineStatus.can_register_late ? 'Yes' : 'No'}
                </Badge>
              </div>
              {deadlineStatus.grace_period_active && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Grace Period:</span>
                  <Badge variant="secondary">
                    Active
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Next Deadline */}
          {deadlineStatus.next_deadline && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Next Important Deadline:</strong> {formatDate(deadlineStatus.next_deadline)}
              </AlertDescription>
            </Alert>
          )}

          {/* Extension Button */}
          {deadlineStatus.current_status === 'open' && (
            <Dialog open={showExtensionDialog} onOpenChange={setShowExtensionDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Extend Deadline</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Extend Registration Deadline</DialogTitle>
                  <DialogDescription>
                    Extend the registration deadline for {tournamentName}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newDeadline">New Deadline</Label>
                    <Input
                      id="newDeadline"
                      type="datetime-local"
                      value={extensionForm.newDeadline}
                      onChange={(e) => setExtensionForm(prev => ({ ...prev, newDeadline: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Extension Reason</Label>
                    <Textarea
                      id="reason"
                      placeholder="Explain why the deadline is being extended..."
                      value={extensionForm.reason}
                      onChange={(e) => setExtensionForm(prev => ({ ...prev, reason: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Extension Duration (hours)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      max="168"
                      value={extensionForm.durationHours}
                      onChange={(e) => setExtensionForm(prev => ({ ...prev, durationHours: parseInt(e.target.value) || 24 }))}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowExtensionDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleExtendDeadline} disabled={isExtending}>
                      {isExtending ? 'Extending...' : 'Extend Deadline'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      {/* Fee Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Fee Structure</span>
          </CardTitle>
          <CardDescription>
            Registration fees and payment information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Base Fees</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Entry Fee:</span>
                    <span className="font-medium">
                      {formatCurrency(deadlineStatus.fee_structure.entry_fee, deadlineStatus.fee_structure.currency)}
                    </span>
                  </div>
                  {deadlineStatus.fee_structure.late_registration_fee && deadlineStatus.fee_structure.late_registration_fee > 0 && (
                    <div className="flex justify-between">
                      <span>Late Registration Fee:</span>
                      <span className="font-medium text-red-600">
                        +{formatCurrency(deadlineStatus.fee_structure.late_registration_fee, deadlineStatus.fee_structure.currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Discounts</h4>
                <div className="space-y-2">
                  {deadlineStatus.fee_structure.early_bird_discount_amount && deadlineStatus.fee_structure.early_bird_discount_amount > 0 && (
                    <div className="flex justify-between">
                      <span>Early Bird Discount:</span>
                      <span className="font-medium text-green-600">
                        -{formatCurrency(deadlineStatus.fee_structure.early_bird_discount_amount, deadlineStatus.fee_structure.currency)}
                      </span>
                    </div>
                  )}
                  {deadlineStatus.days_until_early_bird_ends !== undefined && (
                    <div className="text-sm text-muted-foreground">
                      Early bird ends in {deadlineStatus.days_until_early_bird_ends} days
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Refund Policy</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Full Refund:</strong> {deadlineStatus.fee_structure.refund_policy.full_refund_before}</p>
                  <p><strong>Partial Refund:</strong> {deadlineStatus.fee_structure.refund_policy.partial_refund_before}</p>
                  <p><strong>No Refund:</strong> {deadlineStatus.fee_structure.refund_policy.no_refund_after}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deadline Extensions History */}
      {deadlineExtensions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Deadline Extensions</span>
            </CardTitle>
            <CardDescription>
              History of registration deadline extensions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deadlineExtensions.map((extension, index) => (
                <div key={extension.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">Extension #{deadlineExtensions.length - index}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(extension.created_at)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Extended by: User {extension.extended_by.slice(0, 8)}...
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Original Deadline:</span>
                      <p>{formatDate(extension.original_deadline)}</p>
                    </div>
                    <div>
                      <span className="font-medium">New Deadline:</span>
                      <p>{formatDate(extension.new_deadline)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Extension Duration:</span>
                      <p>{extension.extension_duration_hours} hours</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="font-medium">Reason:</span>
                    <p className="text-sm text-muted-foreground">{extension.extension_reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Payment History</span>
            </CardTitle>
            <CardDescription>
              Registration payments and transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentHistory.map((payment) => (
                <div key={payment.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        payment.payment_status === 'paid' ? 'default' :
                        payment.payment_status === 'refunded' ? 'secondary' :
                        payment.payment_status === 'cancelled' ? 'destructive' : 'outline'
                      }>
                        {payment.payment_status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(payment.created_at)}
                      </span>
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(payment.amount, payment.currency)}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Fee Type:</span>
                      <p className="capitalize">{payment.fee_type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="font-medium">Payment Method:</span>
                      <p>{payment.payment_method || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Transaction ID:</span>
                      <p className="font-mono text-xs">{payment.transaction_id || 'N/A'}</p>
                    </div>
                  </div>
                  {payment.refunded_at && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      <span className="font-medium">Refunded:</span> {formatDate(payment.refunded_at)}
                      {payment.refund_reason && (
                        <p className="text-muted-foreground">Reason: {payment.refund_reason}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
