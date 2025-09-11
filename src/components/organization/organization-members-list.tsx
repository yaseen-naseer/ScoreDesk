'use client'

/**
 * Organization Members List Component
 * Displays and manages organization members with role management
 */

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { 
  Users, 
  Shield, 
  Mail, 
  Calendar, 
  MoreHorizontal,
  Crown,
  Settings,
  UserX,
  RefreshCw,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'
import { useAuth } from '@/lib/auth/auth-context'
import { useToast } from '@/hooks/use-toast'
import { hasPermission } from '@/lib/auth/permissions'
import { RoleAssignmentDialog } from './role-assignment-dialog'

interface OrganizationMember {
  id: string
  userId: string
  email: string
  fullName: string
  role: Database['public']['Enums']['user_role']
  status: 'active' | 'inactive'
  joinedAt: string
  avatarUrl?: string
  lastActiveAt?: string
}

interface OrganizationMembersListProps {
  organizationId: string
  onMemberUpdate?: () => void
  className?: string
}

const roleLabels: Record<Database['public']['Enums']['user_role'], string> = {
  owner: 'Owner',
  admin: 'Administrator',
  manager: 'Manager',
  referee: 'Referee',
  stats_operator: 'Stats Operator',
  viewer: 'Viewer'
}

const roleColors: Record<Database['public']['Enums']['user_role'], string> = {
  owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  referee: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  stats_operator: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
}

export function OrganizationMembersList({ 
  organizationId, 
  onMemberUpdate, 
  className 
}: OrganizationMembersListProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null)
  const supabase = createClientComponentClient<Database>()

  const loadMembers = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('organization_memberships')
        .select(`
          id,
          user_id,
          role,
          status,
          joined_at,
          user_profiles!inner(
            id,
            email,
            full_name,
            avatar_url,
            last_active_at
          )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true })

      if (error) {
        throw error
      }

      const formattedMembers: OrganizationMember[] = data?.map(member => ({
        id: member.id,
        userId: member.user_id,
        email: (member.user_profiles as any).email,
        fullName: (member.user_profiles as any).full_name,
        role: member.role,
        status: member.status as 'active' | 'inactive',
        joinedAt: member.joined_at,
        avatarUrl: (member.user_profiles as any).avatar_url,
        lastActiveAt: (member.user_profiles as any).last_active_at
      })) || []

      setMembers(formattedMembers)
    } catch (err) {
      console.error('Error loading members:', err)
      setError('Failed to load organization members')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [organizationId])

  const handleRemoveMember = async (member: OrganizationMember) => {
    if (member.userId === user?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You cannot remove yourself from the organization',
      })
      return
    }

    setActionLoading(member.id)
    try {
      const { error } = await supabase
        .from('organization_memberships')
        .update({ status: 'inactive' })
        .eq('id', member.id)

      if (error) {
        throw error
      }

      toast({
        title: 'Member Removed',
        description: `${member.fullName} has been removed from the organization`,
      })
      
      loadMembers()
      onMemberUpdate?.()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove member',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleChangeRole = async (member: OrganizationMember, newRole: Database['public']['Enums']['user_role']) => {
    if (member.userId === user?.id && newRole !== member.role) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You cannot change your own role',
      })
      return
    }

    setActionLoading(member.id)
    try {
      const { error } = await supabase
        .from('organization_memberships')
        .update({ role: newRole })
        .eq('id', member.id)

      if (error) {
        throw error
      }

      toast({
        title: 'Role Updated',
        description: `${member.fullName}'s role has been changed to ${roleLabels[newRole]}`,
      })
      
      loadMembers()
      onMemberUpdate?.()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update member role',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleOpenRoleDialog = (member: OrganizationMember) => {
    setSelectedMember(member)
    setRoleDialogOpen(true)
  }

  const handleRoleAssignment = async (newRole: Database['public']['Enums']['user_role']) => {
    if (selectedMember) {
      await handleChangeRole(selectedMember, newRole)
    }
  }

  const filteredMembers = members.filter(member =>
    member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const canManageMembers = members.find(m => m.userId === user?.id)?.role && 
    hasPermission(members.find(m => m.userId === user?.id)?.role!, 'manage_members')

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Shield className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={className}>
      {/* Search and Refresh */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative w-64">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadMembers}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Members Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">
            {searchTerm ? 'No members found' : 'No members yet'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm 
              ? 'Try adjusting your search criteria.'
              : 'Invite your first member to get started.'}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last Active</TableHead>
              {canManageMembers && <TableHead className="w-[70px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatarUrl} alt={member.fullName} />
                      <AvatarFallback>{getInitials(member.fullName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {member.fullName}
                        {member.role === 'owner' && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                        {member.userId === user?.id && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{member.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={roleColors[member.role]}>
                    {roleLabels[member.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {format(new Date(member.joinedAt), 'MMM d, yyyy')}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {member.lastActiveAt 
                      ? format(new Date(member.lastActiveAt), 'MMM d, yyyy')
                      : 'Never'}
                  </div>
                </TableCell>
                {canManageMembers && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading === member.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Role Change Options */}
                        {member.role !== 'owner' && member.userId !== user?.id && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleOpenRoleDialog(member)}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleChangeRole(member, 'admin')}
                              disabled={member.role === 'admin'}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Make Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleChangeRole(member, 'manager')}
                              disabled={member.role === 'manager'}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Make Manager
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleChangeRole(member, 'referee')}
                              disabled={member.role === 'referee'}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Make Referee
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleChangeRole(member, 'stats_operator')}
                              disabled={member.role === 'stats_operator'}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Make Stats Operator
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleChangeRole(member, 'viewer')}
                              disabled={member.role === 'viewer'}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Make Viewer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {/* Remove Member */}
                        {member.role !== 'owner' && member.userId !== user?.id && (
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member)}
                            className="text-destructive"
                            disabled={actionLoading === member.id}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Remove Member
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Role Assignment Dialog */}
      {selectedMember && (
        <RoleAssignmentDialog
          isOpen={roleDialogOpen}
          onClose={() => {
            setRoleDialogOpen(false)
            setSelectedMember(null)
          }}
          member={selectedMember}
          currentUserRole={members.find(m => m.userId === user?.id)?.role || 'viewer'}
          onRoleChange={handleRoleAssignment}
        />
      )}
    </div>
  )
}

export default OrganizationMembersList
