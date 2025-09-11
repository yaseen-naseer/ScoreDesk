'use client'

import { useOrganization } from '@/lib/contexts/organization-context'
import { OrganizationOnboarding } from '@/components/organization'
import { OrganizationDashboard } from '@/components/dashboard'
import { AppShell } from '@/components/layout'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardContent() {
  const { currentOrganization, isLoading } = useOrganization()

  // Show loading state
  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    )
  }

  // Show onboarding if no organization is selected
  if (!currentOrganization) {
    return <OrganizationOnboarding />
  }

  return (
    <AppShell>
      <OrganizationDashboard />
    </AppShell>
  )
}