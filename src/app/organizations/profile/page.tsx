import { Metadata } from 'next'
import { AppShell } from '@/components/layout'
import { OrganizationProfileForm } from '@/components/forms/organization-profile-form'
import { WithOrganizationAccess } from '@/lib/contexts/organization-context'
import ProtectedRoute from '@/components/auth/protected-route'

export const metadata: Metadata = {
  title: 'Organization Profile - ScoreDesk',
  description: 'Manage your organization profile, logo, and contact information',
}

export default function OrganizationProfilePage() {
  return (
    <ProtectedRoute>
      <WithOrganizationAccess requiredPermission="organization:manage">
        <AppShell>
          <div className="max-w-4xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Organization Profile</h1>
              <p className="text-muted-foreground">
                Manage your organization's profile information, logo, and contact details
              </p>
            </div>
            
            <OrganizationProfileForm 
              onSuccess={() => {
                // Could show a toast notification or redirect
                console.log('Profile updated successfully')
              }}
            />
          </div>
        </AppShell>
      </WithOrganizationAccess>
    </ProtectedRoute>
  )
}
