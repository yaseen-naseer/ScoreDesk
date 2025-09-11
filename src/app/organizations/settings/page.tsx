import { Metadata } from 'next'
import { AppShell } from '@/components/layout'
import { OrganizationSettingsForm } from '@/components/forms/organization-settings-form'
import { WithOrganizationAccess } from '@/lib/contexts/organization-context'
import ProtectedRoute from '@/components/auth/protected-route'

export const metadata: Metadata = {
  title: 'Organization Settings - ScoreDesk',
  description: 'Manage your organization settings, timezone, preferences, and policies',
}

export default function OrganizationSettingsPage() {
  return (
    <ProtectedRoute>
      <WithOrganizationAccess requiredPermission="organization:manage">
        <AppShell>
          <div className="max-w-4xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Organization Settings</h1>
              <p className="text-muted-foreground">
                Configure your organization's preferences, timezone, match policies, and advanced features
              </p>
            </div>
            
            <OrganizationSettingsForm 
              onSuccess={() => {
                // Could show a toast notification
                console.log('Settings updated successfully')
              }}
            />
          </div>
        </AppShell>
      </WithOrganizationAccess>
    </ProtectedRoute>
  )
}
