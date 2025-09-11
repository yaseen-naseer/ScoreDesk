/**
 * Invitation Acceptance Page
 * Handles invitation token validation and acceptance flow
 */

import React from 'react'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { InvitationAcceptance } from '@/components/invitations/invitation-acceptance'
import { invitationService } from '@/lib/services/invitation-service'

interface InvitationPageProps {
  params: {
    token: string
  }
}

export async function generateMetadata({ params }: InvitationPageProps): Promise<Metadata> {
  try {
    const invitation = await invitationService.getInvitationByToken(params.token)
    
    if (invitation) {
      return {
        title: `Join ${invitation.organizationName} - ScoreDesk`,
        description: `You've been invited to join ${invitation.organizationName} on ScoreDesk as a ${invitation.role}.`
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
  }

  return {
    title: 'Invalid Invitation - ScoreDesk',
    description: 'This invitation link is invalid or has expired.'
  }
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { token } = params

  // Validate token format (basic check)
  if (!token || token.length !== 64) {
    redirect('/auth/login?error=invalid_invitation')
  }

  try {
    // Pre-fetch invitation data on server
    const invitation = await invitationService.getInvitationByToken(token)
    
    if (!invitation) {
      redirect('/auth/login?error=invitation_not_found')
    }

    // Check if invitation is expired
    if (new Date() > new Date(invitation.expiresAt)) {
      redirect('/auth/login?error=invitation_expired')
    }

    // Check if invitation is not pending
    if (invitation.status !== 'pending') {
      redirect('/auth/login?error=invitation_already_processed')
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <InvitationAcceptance token={token} invitation={invitation} />
      </div>
    )
  } catch (error) {
    console.error('Error loading invitation:', error)
    redirect('/auth/login?error=invitation_error')
  }
}

// Enable static generation for better performance
export const dynamic = 'force-dynamic'
