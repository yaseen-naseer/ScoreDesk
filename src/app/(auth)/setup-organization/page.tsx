import { Metadata } from 'next'
import { OrganizationRegistrationForm } from '@/components/forms/organization-registration-form'
import ProtectedRoute from '@/components/auth/protected-route'

export const metadata: Metadata = {
  title: 'Setup Organization - ScoreDesk',
  description: 'Create your sports organization to start managing teams and tournaments',
}

export default function SetupOrganizationPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Welcome to ScoreDesk!</h1>
            <p className="text-muted-foreground mt-2">
              Let's set up your organization to get started with sports management
            </p>
          </div>
          
          <OrganizationRegistrationForm />
        </div>
      </div>
    </ProtectedRoute>
  )
}
