'use client'

import * as React from 'react'
import Link from 'next/link'
import { useOrganization } from '@/lib/contexts/organization-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Plus,
  Trophy,
  Users,
  Calendar,
  Settings,
  UserPlus,
  Play,
  BarChart3,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickAction {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  variant: 'default' | 'secondary' | 'outline'
  badge?: string
  permission?: string
}

export function QuickActionsWidget() {
  const { canManageOrganization, currentMembership } = useOrganization()

  const quickActions: QuickAction[] = [
    {
      title: 'Create Tournament',
      description: 'Start a new tournament',
      href: '/tournaments/create',
      icon: Trophy,
      variant: 'default',
      badge: 'New',
      permission: 'tournaments:create'
    },
    {
      title: 'Add Team',
      description: 'Register a new team',
      href: '/teams/create',
      icon: Users,
      variant: 'secondary',
      permission: 'teams:create'
    },
    {
      title: 'Schedule Match',
      description: 'Set up a new match',
      href: '/matches/create',
      icon: Calendar,
      variant: 'outline',
      permission: 'matches:create'
    },
    {
      title: 'Invite Members',
      description: 'Add team members',
      href: '/organizations/members/invite',
      icon: UserPlus,
      variant: 'outline',
      permission: 'organizations:invite'
    },
    {
      title: 'Live Match',
      description: 'Start match control',
      href: '/matches/live',
      icon: Play,
      variant: 'default',
      badge: 'Live',
      permission: 'matches:manage'
    },
    {
      title: 'View Reports',
      description: 'Analytics & insights',
      href: '/reports',
      icon: BarChart3,
      variant: 'outline',
      permission: 'reports:read'
    }
  ]

  // Admin-only actions
  const adminActions: QuickAction[] = [
    {
      title: 'Organization Settings',
      description: 'Manage preferences',
      href: '/organizations/settings',
      icon: Settings,
      variant: 'outline',
      permission: 'organizations:manage'
    }
  ]

  // Filter actions based on permissions
  const getAvailableActions = () => {
    const allActions = [...quickActions, ...(canManageOrganization ? adminActions : [])]
    
    // For now, we'll show all actions since we don't have detailed permission checking
    // In a real implementation, you'd check each permission against the user's role
    return allActions.filter(action => {
      // Basic role-based filtering
      if (action.permission === 'organizations:manage') {
        return canManageOrganization
      }
      
      // For other permissions, we'll allow if user has any role beyond viewer
      const userRole = currentMembership?.role
      if (userRole === 'viewer') {
        return action.permission === 'reports:read'
      }
      
      return true
    })
  }

  const availableActions = getAvailableActions()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          Common tasks and shortcuts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {availableActions.slice(0, 6).map((action) => {
            const Icon = action.icon
            
            return (
              <Button
                key={action.title}
                variant={action.variant}
                asChild
                className={cn(
                  "h-auto p-3 justify-start",
                  action.variant === 'default' && "bg-primary hover:bg-primary/90"
                )}
              >
                <Link href={action.href}>
                  <div className="flex items-center gap-3 w-full">
                    <div className={cn(
                      "flex items-center justify-center rounded-lg p-2",
                      action.variant === 'default' 
                        ? "bg-primary-foreground/10" 
                        : "bg-muted"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{action.title}</span>
                        {action.badge && (
                          <Badge 
                            variant="secondary" 
                            className="text-xs px-1.5 py-0.5 h-auto"
                          >
                            {action.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Link>
              </Button>
            )
          })}
        </div>
        
        {/* Additional Actions */}
        {availableActions.length > 6 && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="ghost" size="sm" asChild className="w-full">
              <Link href="/dashboard/actions">
                View More Actions
              </Link>
            </Button>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-4 pt-4 border-t">
          <div className="text-xs text-muted-foreground text-center">
            <p className="mb-2">Need help getting started?</p>
            <div className="flex gap-2 justify-center">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/help/getting-started">
                  <span className="text-xs">Quick Guide</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/support">
                  <span className="text-xs">Support</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
