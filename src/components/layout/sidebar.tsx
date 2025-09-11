'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useOrganization } from '@/lib/contexts/organization-context'
import { PermissionGate } from '@/components/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { OrganizationSwitcher } from '@/components/organization/organization-switcher'
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
  ChevronDown,
  ChevronRight,
  Circle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  className?: string
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permissions?: string[]
  badge?: string | number
  children?: NavItem[]
}

interface CollapsibleSectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className="space-y-1">
      <Button
        variant="ghost"
        className="w-full justify-between h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </div>
        {isOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </Button>
      {isOpen && (
        <div className="space-y-1 pl-2">
          {children}
        </div>
      )}
    </div>
  )
}

// Organization Header Component
function OrganizationHeader() {
  const { currentOrganization, currentMembership } = useOrganization()

  if (!currentOrganization || !currentMembership) {
    return (
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-muted-foreground">
              No Organization
            </h2>
            <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
              <Link href="/organizations">Select Organization</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border-b">
      <OrganizationSwitcher 
        className="w-full"
        showCurrentInfo={true}
        showCreateButton={true}
      />
    </div>
  )
}

export function Sidebar({ isOpen = true, onClose, className }: SidebarProps) {
  const pathname = usePathname()
  const { profile } = useAuth()

  // Navigation structure
  const navigation: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: Home,
    },
    {
      title: 'Live Match',
      href: '/live',
      icon: Play,
      badge: 'LIVE',
      permissions: ['matches:manage', 'matches:view']
    }
  ]

  const organizationNavigation: NavItem[] = [
    {
      title: 'Organizations',
      href: '/organizations',
      icon: Building2,
      permissions: ['organizations:read']
    },
    {
      title: 'Members',
      href: '/organizations/members',
      icon: Users,
      permissions: ['members:read']
    },
    {
      title: 'Settings',
      href: '/organization-settings',
      icon: Settings,
      permissions: ['organizations:manage']
    }
  ]

  const sportsNavigation: NavItem[] = [
    {
      title: 'Tournaments',
      href: '/tournaments',
      icon: Trophy,
      permissions: ['tournaments:read']
    },
    {
      title: 'Teams',
      href: '/teams',
      icon: Shield,
      permissions: ['teams:read']
    },
    {
      title: 'Players',
      href: '/players',
      icon: UserPlus,
      permissions: ['players:read']
    },
    {
      title: 'Matches',
      href: '/matches',
      icon: Calendar,
      permissions: ['matches:read']
    }
  ]

  const analyticsNavigation: NavItem[] = [
    {
      title: 'Statistics',
      href: '/stats',
      icon: BarChart3,
      permissions: ['stats:read']
    },
    {
      title: 'Reports',
      href: '/reports',
      icon: FileText,
      permissions: ['reports:read']
    },
    {
      title: 'Performance',
      href: '/performance',
      icon: Target,
      permissions: ['stats:read']
    },
    {
      title: 'Rankings',
      href: '/rankings',
      icon: Medal,
      permissions: ['stats:read']
    }
  ]

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    
    const navButton = (
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start h-9 px-3",
          isActive && "bg-secondary text-secondary-foreground font-medium"
        )}
        asChild
      >
        <Link href={item.href} onClick={onClose}>
          <item.icon className="mr-2 h-4 w-4" />
          {item.title}
          {item.badge && (
            <Badge 
              variant={item.badge === 'LIVE' ? 'destructive' : 'secondary'}
              className="ml-auto text-xs"
            >
              {item.badge}
            </Badge>
          )}
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
  }

  return (
    <TooltipProvider>
      <aside className={cn(
        "flex h-full w-64 flex-col border-r bg-background",
        className
      )}>
        {/* Organization selector */}
        <OrganizationHeader />

        {/* Main navigation */}
        <nav className="flex-1 space-y-6 p-4 overflow-y-auto">
          {/* Quick access */}
          <div className="space-y-1">
            {navigation.map(renderNavItem)}
          </div>

          <Separator />

          {/* Organization management */}
          <CollapsibleSection title="Organization" icon={Building2}>
            {organizationNavigation.map(renderNavItem)}
          </CollapsibleSection>

          <Separator />

          {/* Sports management */}
          <CollapsibleSection title="Sports Management" icon={Trophy}>
            {sportsNavigation.map(renderNavItem)}
          </CollapsibleSection>

          <Separator />

          {/* Analytics & Reports */}
          <CollapsibleSection title="Analytics" icon={BarChart3}>
            {analyticsNavigation.map(renderNavItem)}
          </CollapsibleSection>
        </nav>

        {/* Footer - Current match indicator */}
        <div className="p-4 border-t">
          <PermissionGate permissions={['matches:view']}>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Circle className="h-2 w-2 fill-current text-green-500" />
                <span>No active matches</span>
              </div>
              
              {/* Quick match controls when live */}
              {/* This would be conditionally rendered based on active matches */}
              {false && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">Team A vs Team B</span>
                    <Badge variant="destructive" className="text-xs">LIVE</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>45:23</span>
                    <span className="ml-auto">2-1</span>
                  </div>
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs">
                    <Play className="mr-1 h-3 w-3" />
                    Control Match
                  </Button>
                </div>
              )}
            </div>
          </PermissionGate>
        </div>
      </aside>
    </TooltipProvider>
  )
}
