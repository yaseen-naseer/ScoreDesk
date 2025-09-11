import { Metadata } from 'next'
import { AppShell } from '@/components/layout'
import { OrganizationDashboard } from '@/components/dashboard'
import { WithOrganizationAccess } from '@/lib/contexts/organization-context'
import ProtectedRoute from '@/components/auth/protected-route'

export const metadata: Metadata = {
  title: 'Organization Dashboard - ScoreDesk',
  description: 'Comprehensive dashboard with organization metrics, analytics, and insights',
}

export default function OrganizationDashboardPage() {
  return (
    <ProtectedRoute>
      <WithOrganizationAccess requiredPermission="dashboard:read">
        <AppShell>
          <OrganizationDashboard />
        </AppShell>
      </WithOrganizationAccess>
    </ProtectedRoute>
  )
}
