'use client'

/**
 * Organization Switcher Component
 * Allows users to switch between their organizations with session management
 */

import React, { useState } from 'react'
import { Check, ChevronsUpDown, Plus, Building2, Users, Crown, Loader2, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useAuth } from '@/lib/auth/auth-context'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface OrganizationSwitcherProps {
  className?: string
  showCreateButton?: boolean
  showCurrentInfo?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'outline'
}

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  admin: 'Administrator', 
  manager: 'Manager',
  referee: 'Referee',
  stats_operator: 'Stats Operator',
  viewer: 'Viewer'
}

const roleColors: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  referee: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  stats_operator: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
}

export function OrganizationSwitcher({ 
  className, 
  showCreateButton = true, 
  showCurrentInfo = true,
  size = 'md',
  variant = 'outline'
}: OrganizationSwitcherProps) {
  const { 
    currentOrganization, 
    currentMembership,
    userOrganizations, 
    isLoadingOrganizations, 
    switchOrganization,
    refreshUserOrganizations
  } = useOrganization()
  const { logout } = useAuth()
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const handleSwitchOrganization = async (organizationId: string) => {
    if (organizationId === currentOrganization?.id) {
      setOpen(false)
      return
    }

    setIsSwitching(organizationId)
    try {
      await switchOrganization(organizationId)
      toast({
        title: 'Organization Switched',
        description: 'Successfully switched to the selected organization.',
      })
      setOpen(false)
    } catch (error) {
      console.error('Error switching organization:', error)
      toast({
        variant: 'destructive',
        title: 'Switch Failed',
        description: 'Failed to switch organization. Please try again.',
      })
    } finally {
      setIsSwitching(null)
    }
  }

  const handleRefresh = async () => {
    try {
      await refreshUserOrganizations()
      toast({
        title: 'Organizations Refreshed',
        description: 'Organization list has been updated.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Refresh Failed',
        description: 'Failed to refresh organizations.',
      })
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const buttonSizes = {
    sm: 'h-8 px-2 text-xs',
    md: 'h-10 px-3 text-sm',
    lg: 'h-12 px-4 text-base'
  }

  const avatarSizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  }

  if (!currentOrganization) {
    return (
      <Button
        variant={variant}
        className={cn(buttonSizes[size], className)}
        onClick={() => setCreateDialogOpen(true)}
      >
        <Plus className="mr-2 h-4 w-4" />
        Create Organization
      </Button>
    )
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={variant}
            role="combobox"
            aria-expanded={open}
            aria-label="Select organization"
            className={cn(
              'justify-between',
              buttonSizes[size],
              className
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className={avatarSizes[size]}>
                <AvatarImage 
                  src={currentOrganization.logo_url || undefined} 
                  alt={currentOrganization.name}
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(currentOrganization.name)}
                </AvatarFallback>
              </Avatar>
              {showCurrentInfo && (
                <div className="flex flex-col items-start min-w-0">
                  <span className="truncate font-medium">
                    {currentOrganization.name}
                  </span>
                  {currentMembership && size !== 'sm' && (
                    <span className="text-xs text-muted-foreground">
                      {roleLabels[currentMembership.role] || currentMembership.role}
                    </span>
                  )}
                </div>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search organizations..." />
            <CommandList>
              <CommandEmpty>
                {isLoadingOrganizations ? (
                  <div className="py-6 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading organizations...</p>
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No organizations found.</p>
                  </div>
                )}
              </CommandEmpty>
              
              {userOrganizations.length > 0 && (
                <CommandGroup heading="Your Organizations">
                  {userOrganizations.map((org) => (
                    <CommandItem
                      key={org.id}
                      value={org.name}
                      onSelect={() => handleSwitchOrganization(org.id)}
                      className="flex items-center gap-3 p-3"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={org.logo_url || undefined} alt={org.name} />
                        <AvatarFallback className="bg-muted text-xs">
                          {getInitials(org.name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{org.name}</span>
                          {org.membership.role === 'owner' && (
                            <Crown className="h-3 w-3 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className={cn('text-xs', roleColors[org.membership.role])}
                          >
                            {roleLabels[org.membership.role] || org.membership.role}
                          </Badge>
                          {org.description && (
                            <span className="text-xs text-muted-foreground truncate">
                              {org.description}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isSwitching === org.id && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        {currentOrganization?.id === org.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandSeparator />
              
              <CommandGroup>
                {showCreateButton && (
                  <CommandItem
                    onSelect={() => {
                      setOpen(false)
                      setCreateDialogOpen(true)
                    }}
                    className="flex items-center gap-3 p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed">
                      <Plus className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <span className="font-medium">Create Organization</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Start a new organization
                      </p>
                    </div>
                  </CommandItem>
                )}
                
                <CommandItem
                  onSelect={handleRefresh}
                  className="flex items-center gap-3 p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">Refresh Organizations</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Update organization list
                    </p>
                  </div>
                </CommandItem>

                <CommandSeparator />
                
                <CommandItem
                  onSelect={logout}
                  className="flex items-center gap-3 p-3 text-destructive"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">Sign Out</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sign out of your account
                    </p>
                  </div>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Create Organization Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Set up a new organization to manage your sports activities.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Organization creation form would go here.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Compact version for header/navbar
export function CompactOrganizationSwitcher({ className }: { className?: string }) {
  return (
    <OrganizationSwitcher
      className={className}
      size="sm"
      variant="ghost"
      showCurrentInfo={false}
      showCreateButton={false}
    />
  )
}

// Loading skeleton
export function OrganizationSwitcherSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Skeleton className="h-6 w-6 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

export default OrganizationSwitcher
