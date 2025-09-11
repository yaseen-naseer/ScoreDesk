'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionGate } from '@/components/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Home,
  Users,
  Trophy,
  Shield,
  Building2,
  Calendar,
  BarChart3,
  Settings,
  FileText,
  Play,
  Clock,
  Target,
  UserPlus,
  Medal,
  Menu,
  Search,
  Bell,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permissions?: string[]
  badge?: string | number
  description?: string
}

export function MobileNav({ isOpen, onOpenChange }: MobileNavProps) {
  const pathname = usePathname()
  const { profile } = useAuth()

  // Close nav when route changes
  React.useEffect(() => {
    onOpenChange(false)
  }, [pathname, onOpenChange])

  const mainNavigation: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      description: 'Overview and quick access'
    },
    {
      title: 'Live Match',
      href: '/live',
      icon: Play,
      badge: 'LIVE',
      permissions: ['matches:manage', 'matches:view'],
      description: 'Control active matches'
    }
  ]

  const sportsNavigation: NavItem[] = [
    {
      title: 'Tournaments',
      href: '/tournaments',
      icon: Trophy,
      permissions: ['tournaments:read'],
      description: 'Manage competitions'
    },
    {
      title: 'Teams',
      href: '/teams',
      icon: Shield,
      permissions: ['teams:read'],
      description: 'Team management'
    },
    {
      title: 'Players',
      href: '/players',
      icon: UserPlus,
      permissions: ['players:read'],
      description: 'Player profiles'
    },
    {
      title: 'Matches',
      href: '/matches',
      icon: Calendar,
      permissions: ['matches:read'],
      description: 'Schedule and results'
    }
  ]

  const analyticsNavigation: NavItem[] = [
    {
      title: 'Statistics',
      href: '/stats',
      icon: BarChart3,
      permissions: ['stats:read'],
      description: 'Performance analytics'
    },
    {
      title: 'Reports',
      href: '/reports',
      icon: FileText,
      permissions: ['reports:read'],
      description: 'Generated reports'
    },
    {
      title: 'Rankings',
      href: '/rankings',
      icon: Medal,
      permissions: ['stats:read'],
      description: 'Team and player rankings'
    }
  ]

  const organizationNavigation: NavItem[] = [
    {
      title: 'Organizations',
      href: '/organizations',
      icon: Building2,
      permissions: ['organizations:read'],
      description: 'Organization settings'
    },
    {
      title: 'Members',
      href: '/members',
      icon: Users,
      permissions: ['members:read'],
      description: 'User management'
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
      description: 'App preferences'
    }
  ]

  const renderNavSection = (title: string, items: NavItem[]) => (
    <div className="space-y-3">
      <div className="px-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          
          const navButton = (
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start h-auto p-3 text-left",
                isActive && "bg-secondary text-secondary-foreground"
              )}
              asChild
            >
              <Link href={item.href}>
                <div className="flex items-start gap-3 w-full">
                  <item.icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.title}</span>
                      {item.badge && (
                        <Badge 
                          variant={item.badge === 'LIVE' ? 'destructive' : 'secondary'}
                          className="text-xs ml-2"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </Button>
          )

          if (item.permissions) {
            return (
              <PermissionGate key={item.href} permissions={item.permissions}>
                {navButton}
              </PermissionGate>
            )
          }

          return <div key={item.href}>{navButton}</div>
        })}
      </div>
    </div>
  )

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-left">Navigation</SheetTitle>
              <SheetDescription className="text-left">
                {profile?.current_organization || 'ScoreDesk'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] px-6 py-4">
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button size="sm" variant="outline">
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Main Navigation */}
            {renderNavSection('Main', mainNavigation)}

            <Separator />

            {/* Sports Management */}
            {renderNavSection('Sports', sportsNavigation)}

            <Separator />

            {/* Analytics */}
            {renderNavSection('Analytics', analyticsNavigation)}

            <Separator />

            {/* Organization & Settings */}
            {renderNavSection('Organization', organizationNavigation)}

            {/* Current match status */}
            <PermissionGate permissions={['matches:view']}>
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Match Status</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  No active matches
                </p>
              </div>
            </PermissionGate>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

// Bottom navigation for mobile devices
interface BottomNavProps {
  className?: string
}

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname()

  const bottomNavItems = [
    { href: '/dashboard', icon: Home, label: 'Home' },
    { href: '/matches', icon: Calendar, label: 'Matches', permissions: ['matches:read'] },
    { href: '/live', icon: Play, label: 'Live', permissions: ['matches:view'] },
    { href: '/stats', icon: BarChart3, label: 'Stats', permissions: ['stats:read'] },
    { href: '/teams', icon: Shield, label: 'Teams', permissions: ['teams:read'] },
  ]

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-background border-t",
      "flex items-center justify-around h-16 px-2",
      "md:hidden", // Only show on mobile
      className
    )}>
      {bottomNavItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        
        const navButton = (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "flex-1 flex-col h-12 gap-1",
              isActive && "text-primary"
            )}
            asChild
          >
            <Link href={item.href}>
              <item.icon className={cn("h-4 w-4", isActive && "fill-current")} />
              <span className="text-xs">{item.label}</span>
            </Link>
          </Button>
        )

        if (item.permissions) {
          return (
            <PermissionGate key={item.href} permissions={item.permissions}>
              {navButton}
            </PermissionGate>
          )
        }

        return <div key={item.href}>{navButton}</div>
      })}
    </nav>
  )
}

// Floating Action Button for quick match control
export function MatchControlFAB() {
  const [hasActiveMatch, setHasActiveMatch] = React.useState(false)

  // This would connect to real-time match data
  React.useEffect(() => {
    // Placeholder for real-time match detection
  }, [])

  if (!hasActiveMatch) return null

  return (
    <PermissionGate permissions={['matches:manage']}>
      <Button
        size="lg"
        className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg md:hidden"
        asChild
      >
        <Link href="/live">
          <Play className="h-6 w-6" />
        </Link>
      </Button>
    </PermissionGate>
  )
}
