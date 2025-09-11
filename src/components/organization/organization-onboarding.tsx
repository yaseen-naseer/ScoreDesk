'use client'

import * as React from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/auth-context'
import { OrganizationService } from '@/lib/services/organization-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Building2, 
  Plus, 
  Search, 
  Users, 
  Trophy, 
  Shield,
  Mail,
  UserPlus,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  membership?: {
    role: string
    status: string
  }
}

export function OrganizationOnboarding() {
  const { user, profile } = useAuth()
  const [organizations, setOrganizations] = React.useState<Organization[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [joinCode, setJoinCode] = React.useState('')
  const [joiningOrg, setJoiningOrg] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const organizationService = new OrganizationService()

  React.useEffect(() => {
    loadUserOrganizations()
  }, [])

  const loadUserOrganizations = async () => {
    try {
      const userOrgs = await organizationService.getUserOrganizations()
      setOrganizations(userOrgs)
    } catch (error) {
      console.error('Error loading organizations:', error)
      setError('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchOrganization = async (organizationId: string) => {
    setJoiningOrg(organizationId)
    try {
      await organizationService.switchOrganization(organizationId)
      window.location.href = '/dashboard'
    } catch (error) {
      setError('Failed to switch organization')
      setJoiningOrg(null)
    }
  }

  const handleJoinWithCode = async () => {
    if (!joinCode.trim()) return

    setJoiningOrg('code')
    try {
      // This would be implemented as part of invitation system
      // For now, just show error
      throw new Error('Join with code feature coming soon')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to join organization')
      setJoiningOrg(null)
    }
  }

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading organizations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Building2 className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Choose Your Organization</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            {organizations.length > 0 
              ? "Select an organization to continue, or create a new one to get started with sports management"
              : "Welcome to ScoreDesk! Let's get you set up with an organization to start managing your sports activities"
            }
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Existing Organizations */}
        {organizations.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Your Organizations</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search organizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {filteredOrganizations.map((org) => (
                <Card key={org.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {org.logo_url ? (
                          <img 
                            src={org.logo_url} 
                            alt={`${org.name} logo`}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <Building2 className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base">{org.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">@{org.slug}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {org.membership?.role?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {org.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {org.description}
                      </p>
                    )}
                    <Button 
                      className="w-full"
                      onClick={() => handleSwitchOrganization(org.id)}
                      disabled={joiningOrg === org.id}
                    >
                      {joiningOrg === org.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Switching...
                        </>
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator />
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create New Organization */}
          <Card className="border-2 border-dashed border-primary/25 hover:border-primary/50 transition-colors">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
              </div>
              <CardTitle>Create New Organization</CardTitle>
              <CardDescription>
                Set up your own sports organization and invite team members
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Full administrative control</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Unlimited teams and players</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Tournament management</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Live match control</span>
                </div>
                
                <Button asChild className="w-full">
                  <Link href="/setup-organization">
                    Create Organization
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Join Organization */}
          <Card>
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <UserPlus className="h-6 w-6" />
                </div>
              </div>
              <CardTitle>Join Organization</CardTitle>
              <CardDescription>
                Enter an invitation code to join an existing organization
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="joinCode">Invitation Code</Label>
                  <Input
                    id="joinCode"
                    placeholder="Enter invitation code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ask your organization admin for an invitation code
                  </p>
                </div>
                
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={handleJoinWithCode}
                  disabled={!joinCode.trim() || joiningOrg === 'code'}
                >
                  {joiningOrg === 'code' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Join with Code
                    </>
                  )}
                </Button>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground text-center">
                    Don't have an invitation code?{' '}
                    <Link href="/contact" className="text-primary hover:underline">
                      Contact support
                    </Link>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features showcase */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold text-center mb-6">
            What you can do with ScoreDesk
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
              </div>
              <h4 className="font-medium mb-2">Team Management</h4>
              <p className="text-sm text-muted-foreground">
                Create and manage teams, track player information, and handle roster changes
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
              </div>
              <h4 className="font-medium mb-2">Tournament Control</h4>
              <p className="text-sm text-muted-foreground">
                Organize tournaments, manage schedules, and track standings automatically
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
              <h4 className="font-medium mb-2">Live Match Stats</h4>
              <p className="text-sm text-muted-foreground">
                Control live matches with real-time statistics and collaborative tools
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
