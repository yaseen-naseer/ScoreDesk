import { Metadata } from 'next'
import { OrganizationOnboarding } from '@/components/organization/organization-onboarding'
import ProtectedRoute from '@/components/auth/protected-route'

export const metadata: Metadata = {
  title: 'Organizations - ScoreDesk',
  description: 'Choose or create your sports organization',
}

export default function OrganizationsPage() {
  return (
    <ProtectedRoute>
      <OrganizationOnboarding />
    </ProtectedRoute>
  )
}
