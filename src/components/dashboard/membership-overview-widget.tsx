'use client'

import * as React from 'react'
import Link from 'next/link'
import { useMembershipOverview } from '@/hooks/use-organization-dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Users,
  UserPlus,
  Crown,
  Shield,
  User,
  Eye,
  Settings,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

const roleConfig = {
  owner: {
    icon: Crown,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    label: 'Owner'
  },
  admin: {
    icon: Shield,
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    label: 'Admin'
  },
  manager: {
    icon: Settings,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    label: 'Manager'
  },
  referee: {
    icon: Eye,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    label: 'Referee'
  },
  stats_operator: {
    icon: User,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    label: 'Stats Operator'
  },
  viewer: {
    icon: Eye,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    label: 'Viewer'
  }
}

export function MembershipOverviewWidget() {
  const { overview, isLoading } = useMembershipOverview()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <Skeleton className="h-6 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
              <div className="text-center">
                <Skeleton className="h-6 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!overview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membership
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2" />
            <p>No membership data</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const membersByRole = overview.membersByRole || {}
  const totalMembers = overview.totalMembers || 0
  const activeMembers = overview.activeMembers || 0
  const activePercentage = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0

  // Sort roles by priority and count
  const sortedRoles = Object.entries(membersByRole)
    .sort(([roleA, countA], [roleB, countB]) => {
      // First by role priority
      const rolePriority = { owner: 6, admin: 5, manager: 4, referee: 3, stats_operator: 2, viewer: 1 }
      const priorityA = rolePriority[roleA as keyof typeof rolePriority] || 0
      const priorityB = rolePriority[roleB as keyof typeof rolePriority] || 0
      if (priorityA !== priorityB) return priorityB - priorityA
      
      // Then by count
      return countB - countA
    })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membership
            </CardTitle>
            <CardDescription>
              Organization members and roles
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/organizations/members">
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Member Overview */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold">{totalMembers}</div>
              <div className="text-xs text-muted-foreground">Total Members</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{activeMembers}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
          </div>

          {/* Activity Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Member Activity</span>
              <span className="font-medium">{activePercentage}%</span>
            </div>
            <Progress value={activePercentage} className="h-2" />
          </div>

          {/* Role Distribution */}
          {sortedRoles.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Role Distribution</h4>
              <div className="space-y-2">
                {sortedRoles.map(([role, count]) => {
                  const roleInfo = roleConfig[role as keyof typeof roleConfig]
                  if (!roleInfo) return null
                  
                  const RoleIcon = roleInfo.icon
                  const percentage = totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0

                  return (
                    <div key={role} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-xs", roleInfo.color)}>
                          <RoleIcon className="mr-1 h-3 w-3" />
                          {roleInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{count}</span>
                        <span className="text-muted-foreground">({percentage}%)</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Users className="h-6 w-6 mx-auto mb-2" />
              <p className="text-sm">No role assignments</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t space-y-2">
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href="/organizations/members/invite">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Members
              </Link>
            </Button>
            
            <Button variant="ghost" size="sm" asChild className="w-full">
              <Link href="/organizations/members">
                <ArrowRight className="mr-2 h-4 w-4" />
                Manage All Members
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
