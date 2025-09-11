'use client'

/**
 * Role Management Dashboard Component
 * Overview and management of all user roles in the organization
 */

import React, { useState, useEffect } from 'react'
import { Shield, Users, Crown, Settings, Eye, Timer, BarChart3, Plus, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'
import { useOrganization } from '@/lib/contexts/organization-context'

interface RoleStats {
  role: Database['public']['Enums']['user_role']
  count: number
  percentage: number
  recentGrowth: number
}

interface RoleInfo {
  value: Database['public']['Enums']['user_role']
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  isAdministrative: boolean
}

const roleDefinitions: RoleInfo[] = [
  {
    value: 'owner',
    label: 'Owner',
    description: 'Complete organizational control',
    icon: Crown,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800',
    isAdministrative: true
  },
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Advanced administrative access',
    icon: Shield,
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
    isAdministrative: true
  },
  {
    value: 'manager',
    label: 'Manager',
    description: 'Operational management',
    icon: Settings,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
    isAdministrative: false
  },
  {
    value: 'referee',
    label: 'Referee',
    description: 'Match officiating',
    icon: Timer,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800',
    isAdministrative: false
  },
  {
    value: 'stats_operator',
    label: 'Stats Operator',
    description: 'Statistics management',
    icon: BarChart3,
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
    isAdministrative: false
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'View-only access',
    icon: Eye,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800',
    isAdministrative: false
  }
]

interface RoleManagementDashboardProps {
  onInviteUser?: () => void
  className?: string
}

export function RoleManagementDashboard({ onInviteUser, className }: RoleManagementDashboardProps) {
  const { currentOrganization } = useOrganization()
  const [roleStats, setRoleStats] = useState<RoleStats[]>([])
  const [totalMembers, setTotalMembers] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient<Database>()

  const loadRoleStats = async () => {
    if (!currentOrganization) return

    setIsLoading(true)
    setError(null)

    try {
      // Get role distribution
      const { data: memberships, error: membershipsError } = await supabase
        .from('organization_memberships')
        .select('role')
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active')

      if (membershipsError) {
        throw membershipsError
      }

      const total = memberships?.length || 0
      setTotalMembers(total)

      // Calculate role statistics
      const roleCounts = roleDefinitions.map(roleInfo => {
        const count = memberships?.filter(m => m.role === roleInfo.value).length || 0
        return {
          role: roleInfo.value,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
          recentGrowth: Math.floor(Math.random() * 20) - 10 // Mock data for demo
        }
      })

      setRoleStats(roleCounts)
    } catch (err) {
      console.error('Error loading role stats:', err)
      setError('Failed to load role statistics')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRoleStats()
  }, [currentOrganization])

  const administrativeRoles = roleStats.filter(stat => 
    roleDefinitions.find(def => def.value === stat.role)?.isAdministrative
  )
  const operationalRoles = roleStats.filter(stat => 
    !roleDefinitions.find(def => def.value === stat.role)?.isAdministrative
  )

  const totalAdministrative = administrativeRoles.reduce((sum, role) => sum + role.count, 0)
  const totalOperational = operationalRoles.reduce((sum, role) => sum + role.count, 0)

  if (!currentOrganization) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Please select an organization to view role management.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Role Management</h2>
          <p className="text-muted-foreground">
            Overview and management of user roles in {currentOrganization.name}
          </p>
        </div>
        {onInviteUser && (
          <Button onClick={onInviteUser}>
            <Plus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <Shield className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalMembers}</p>
                <p className="text-xs text-muted-foreground">Total Members</p>
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalAdministrative}</p>
                <p className="text-xs text-muted-foreground">Administrative</p>
              </div>
              <Shield className="h-4 w-4 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalOperational}</p>
                <p className="text-xs text-muted-foreground">Operational</p>
              </div>
              <Settings className="h-4 w-4 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {totalMembers > 0 ? Math.round((totalAdministrative / totalMembers) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Admin Ratio</p>
              </div>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Administrative Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              Administrative Roles
            </CardTitle>
            <CardDescription>
              Users with administrative and management privileges
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-3/4" />
                </div>
              ))
            ) : (
              administrativeRoles.map((roleStat) => {
                const roleInfo = roleDefinitions.find(def => def.value === roleStat.role)!
                const RoleIcon = roleInfo.icon

                return (
                  <div key={roleStat.role} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-md ${roleInfo.bgColor}`}>
                          <RoleIcon className={`h-3 w-3 ${roleInfo.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{roleInfo.label}</p>
                          <p className="text-xs text-muted-foreground">{roleInfo.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{roleStat.count}</p>
                        <p className="text-xs text-muted-foreground">{roleStat.percentage}%</p>
                      </div>
                    </div>
                    <Progress value={roleStat.percentage} className="h-2" />
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Operational Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              Operational Roles
            </CardTitle>
            <CardDescription>
              Users with specialized operational responsibilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-3/4" />
                </div>
              ))
            ) : (
              operationalRoles.map((roleStat) => {
                const roleInfo = roleDefinitions.find(def => def.value === roleStat.role)!
                const RoleIcon = roleInfo.icon

                return (
                  <div key={roleStat.role} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-md ${roleInfo.bgColor}`}>
                          <RoleIcon className={`h-3 w-3 ${roleInfo.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{roleInfo.label}</p>
                          <p className="text-xs text-muted-foreground">{roleInfo.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{roleStat.count}</p>
                        <p className="text-xs text-muted-foreground">{roleStat.percentage}%</p>
                      </div>
                    </div>
                    <Progress value={roleStat.percentage} className="h-2" />
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Role Recommendations */}
      {totalMembers > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Role Distribution Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {totalAdministrative === 0 && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>No Administrators:</strong> Consider assigning administrative roles to trusted members for better organization management.
                  </AlertDescription>
                </Alert>
              )}
              
              {totalAdministrative > totalMembers * 0.3 && totalMembers > 5 && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>High Admin Ratio:</strong> {Math.round((totalAdministrative / totalMembers) * 100)}% of members have administrative privileges. Consider if this aligns with your security requirements.
                  </AlertDescription>
                </Alert>
              )}
              
              {roleStats.find(r => r.role === 'viewer')?.count === totalMembers && totalMembers > 1 && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>All Viewers:</strong> All members have viewer roles. Consider assigning operational roles based on responsibilities.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default RoleManagementDashboard
