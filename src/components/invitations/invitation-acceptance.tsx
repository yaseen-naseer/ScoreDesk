'use client'

/**
 * Invitation Acceptance Component
 * Handles the invitation acceptance flow for both authenticated and unauthenticated users
 */

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { 
  Building2, 
  UserCheck, 
  Mail, 
  Calendar, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ArrowRight,
  LogIn
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { invitationService, type InvitationDetails } from '@/lib/services/invitation-service'
import { useAuth } from '@/lib/auth/auth-context'
import { useToast } from '@/hooks/use-toast'

interface InvitationAcceptanceProps {
  token: string
  invitation: InvitationDetails
}

const roleDescriptions: Record<string, string> = {
  owner: 'Full administrative access to the organization',
  admin: 'Administrative access with user management capabilities',
  manager: 'Manage teams, players, and tournaments',
  referee: 'Control match timing and officiating',
  stats_operator: 'Record and manage match statistics',
  viewer: 'View-only access to organization data'
}

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  manager: 'Manager',
  referee: 'Referee',
  stats_operator: 'Stats Operator',
  viewer: 'Viewer'
}

export function InvitationAcceptance({ token, invitation }: InvitationAcceptanceProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [isAccepting, setIsAccepting] = useState(false)
  const [acceptanceComplete, setAcceptanceComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isExpired = new Date() > new Date(invitation.expiresAt)
  const isWrongEmail = user && user.email !== invitation.email

  useEffect(() => {
    // Redirect if already accepted
    if (invitation.status === 'accepted') {
      setAcceptanceComplete(true)
    }
  }, [invitation.status])

  const handleAcceptInvitation = async () => {
    if (!user) {
      // Redirect to login with invitation token
      router.push(`/auth/login?invitation=${token}&email=${encodeURIComponent(invitation.email)}`)
      return
    }

    setIsAccepting(true)
    setError(null)

    try {
      const result = await invitationService.acceptInvitation(token)

      if (result.success) {
        setAcceptanceComplete(true)
        toast({
          title: 'Invitation Accepted!',
          description: `Welcome to ${invitation.organizationName}!`,
        })
        
        // Redirect to organization dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setError(result.error || 'Failed to accept invitation')
      }
    } catch (err) {
      console.error('Error accepting invitation:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsAccepting(false)
    }
  }

  const handleSignIn = () => {
    router.push(`/auth/login?invitation=${token}&email=${encodeURIComponent(invitation.email)}`)
  }

  const handleSignUp = () => {
    router.push(`/auth/register?invitation=${token}&email=${encodeURIComponent(invitation.email)}`)
  }

  if (authLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (acceptanceComplete) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-green-600">Welcome to {invitation.organizationName}!</CardTitle>
          <CardDescription>
            Your invitation has been accepted successfully. You'll be redirected to your dashboard shortly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isExpired) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-red-600">Invitation Expired</CardTitle>
          <CardDescription>
            This invitation expired on {format(new Date(invitation.expiresAt), 'MMMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please contact {invitation.invitedByName} to request a new invitation.
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => router.push('/auth/login')}>
              Sign In to ScoreDesk
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
          <UserCheck className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle>You're Invited!</CardTitle>
        <CardDescription>
          {invitation.invitedByName} has invited you to join their organization on ScoreDesk
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Organization Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{invitation.organizationName}</p>
              <p className="text-sm text-muted-foreground">Organization</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {roleLabels[invitation.role] || invitation.role}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {roleDescriptions[invitation.role] || 'Role description not available'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{invitation.email}</p>
              <p className="text-sm text-muted-foreground">Invitation sent to</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {format(new Date(invitation.expiresAt), 'MMMM d, yyyy')}
              </p>
              <p className="text-sm text-muted-foreground">Expires on</p>
            </div>
          </div>
        </div>

        {/* Personal Message */}
        {invitation.message && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-2">Personal Message:</p>
              <p className="text-sm text-muted-foreground italic">
                "{invitation.message}"
              </p>
            </div>
          </>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Wrong Email Alert */}
        {isWrongEmail && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This invitation was sent to {invitation.email}, but you're signed in as {user?.email}. 
              Please sign in with the correct email address.
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-3">
          {!user ? (
            // User not authenticated
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                To accept this invitation, please sign in or create an account
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleSignIn}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
                <Button onClick={handleSignUp}>
                  Sign Up
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : isWrongEmail ? (
            // Wrong email
            <div className="space-y-3">
              <Button variant="outline" onClick={handleSignIn} className="w-full">
                Sign In with Correct Email
              </Button>
            </div>
          ) : (
            // User authenticated with correct email
            <Button 
              onClick={handleAcceptInvitation} 
              disabled={isAccepting}
              className="w-full"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accept Invitation
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default InvitationAcceptance
