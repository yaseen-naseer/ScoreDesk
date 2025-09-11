'use client'

/**
 * Role Assignment Dialog Component
 * Enhanced interface for assigning and managing user roles
 */

import React, { useState } from 'react'
import { Check, Shield, Crown, Settings, Eye, Timer, BarChart3, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import type { Database } from '@/lib/supabase/types'

interface RoleAssignmentDialogProps {
  isOpen: boolean
  onClose: () => void
  member: {
    id: string
    userId: string
    email: string
    fullName: string
    role: Database['public']['Enums']['user_role']
    avatarUrl?: string
  }
  currentUserRole: Database['public']['Enums']['user_role']
  onRoleChange: (newRole: Database['public']['Enums']['user_role']) => Promise<void>
}

interface RoleInfo {
  value: Database['public']['Enums']['user_role']
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  permissions: string[]
  color: string
  bgColor: string
  canAssign: (currentUserRole: Database['public']['Enums']['user_role']) => boolean
  isHighPrivilege: boolean
}

const roleDefinitions: RoleInfo[] = [
  {
    value: 'owner',
    label: 'Owner',
    description: 'Complete control over the organization with all administrative privileges',
    icon: Crown,
    permissions: [
      'Full administrative access',
      'Delete organization',
      'Manage all users and roles',
      'Access all features and data',
      'Billing and subscription management'
    ],
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800',
    canAssign: () => false, // Only existing owners can assign owner role
    isHighPrivilege: true
  },
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Advanced administrative access with user management capabilities',
    icon: Shield,
    permissions: [
      'Manage organization settings',
      'Invite and manage users',
      'Assign roles (except Owner)',
      'Access all tournaments and matches',
      'View all statistics and reports'
    ],
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
    canAssign: (currentUserRole) => ['owner'].includes(currentUserRole),
    isHighPrivilege: true
  },
  {
    value: 'manager',
    label: 'Manager',
    description: 'Manage tournaments, teams, and players with operational control',
    icon: Settings,
    permissions: [
      'Create and manage tournaments',
      'Register and manage teams',
      'Manage player rosters',
      'Schedule matches',
      'Access match statistics'
    ],
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
    canAssign: (currentUserRole) => ['owner', 'admin'].includes(currentUserRole),
    isHighPrivilege: false
  },
  {
    value: 'referee',
    label: 'Referee',
    description: 'Control match timing, officiating, and real-time match management',
    icon: Timer,
    permissions: [
      'Start and stop match timing',
      'Record match events',
      'Manage match officiating',
      'Control scoreboard display',
      'Issue cards and penalties'
    ],
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800',
    canAssign: (currentUserRole) => ['owner', 'admin', 'manager'].includes(currentUserRole),
    isHighPrivilege: false
  },
  {
    value: 'stats_operator',
    label: 'Stats Operator',
    description: 'Record and manage detailed match statistics and performance data',
    icon: BarChart3,
    permissions: [
      'Record match statistics',
      'Track player performance',
      'Manage possession data',
      'Record shots and fouls',
      'Generate match reports'
    ],
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
    canAssign: (currentUserRole) => ['owner', 'admin', 'manager'].includes(currentUserRole),
    isHighPrivilege: false
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'View-only access to organization data and statistics',
    icon: Eye,
    permissions: [
      'View tournaments and matches',
      'Access team and player profiles',
      'View match statistics',
      'Download reports',
      'Access organization dashboard'
    ],
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800',
    canAssign: (currentUserRole) => ['owner', 'admin', 'manager'].includes(currentUserRole),
    isHighPrivilege: false
  }
]

export function RoleAssignmentDialog({
  isOpen,
  onClose,
  member,
  currentUserRole,
  onRoleChange
}: RoleAssignmentDialogProps) {
  const [selectedRole, setSelectedRole] = useState<Database['public']['Enums']['user_role']>(member.role)
  const [isAssigning, setIsAssigning] = useState(false)

  const availableRoles = roleDefinitions.filter(role => 
    role.canAssign(currentUserRole) || role.value === member.role
  )

  const selectedRoleInfo = roleDefinitions.find(role => role.value === selectedRole)
  const currentRoleInfo = roleDefinitions.find(role => role.value === member.role)
  const isRoleChanged = selectedRole !== member.role

  const handleAssignRole = async () => {
    if (!isRoleChanged) {
      onClose()
      return
    }

    setIsAssigning(true)
    try {
      await onRoleChange(selectedRole)
      onClose()
    } catch (error) {
      console.error('Error assigning role:', error)
    } finally {
      setIsAssigning(false)
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Shield className="h-5 w-5" />
            Assign Role
          </DialogTitle>
          <DialogDescription>
            Choose a role for {member.fullName} in your organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Member Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={member.avatarUrl} alt={member.fullName} />
                  <AvatarFallback>{getInitials(member.fullName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">{member.fullName}</h3>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">Current role:</span>
                    <Badge className={`${currentRoleInfo?.color} text-xs`}>
                      {currentRoleInfo?.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role Selection */}
          <div className="space-y-3">
            <h4 className="font-medium">Select Role</h4>
            <div className="grid gap-3">
              {availableRoles.map((role) => {
                const isSelected = selectedRole === role.value
                const isCurrent = member.role === role.value
                const canSelect = role.canAssign(currentUserRole) || isCurrent
                const RoleIcon = role.icon

                return (
                  <Card
                    key={role.value}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? role.bgColor
                        : 'hover:bg-muted/50'
                    } ${
                      !canSelect && !isCurrent
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                    onClick={() => canSelect && setSelectedRole(role.value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${role.bgColor}`}>
                          <RoleIcon className={`h-4 w-4 ${role.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-medium">{role.label}</h5>
                            {isSelected && (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                            {isCurrent && (
                              <Badge variant="outline" className="text-xs">
                                Current
                              </Badge>
                            )}
                            {role.isHighPrivilege && (
                              <Badge variant="secondary" className="text-xs">
                                High Privilege
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {role.description}
                          </p>
                          <div className="space-y-1">
                            {role.permissions.slice(0, 3).map((permission, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                                <span className="text-xs text-muted-foreground">
                                  {permission}
                                </span>
                              </div>
                            ))}
                            {role.permissions.length > 3 && (
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                                <span className="text-xs text-muted-foreground">
                                  +{role.permissions.length - 3} more permissions
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Role Change Warning */}
          {isRoleChanged && selectedRoleInfo && (
            <>
              <Separator />
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Role Change Confirmation</strong>
                  <br />
                  You are about to change {member.fullName}'s role from{' '}
                  <strong>{currentRoleInfo?.label}</strong> to{' '}
                  <strong>{selectedRoleInfo.label}</strong>.
                  {selectedRoleInfo.isHighPrivilege && (
                    <>
                      <br />
                      <strong>Warning:</strong> This role has high-level privileges and administrative access.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            </>
          )}

          {/* Selected Role Details */}
          {selectedRoleInfo && (
            <Card className={selectedRoleInfo.bgColor}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <selectedRoleInfo.icon className={`h-4 w-4 ${selectedRoleInfo.color}`} />
                  {selectedRoleInfo.label} Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {selectedRoleInfo.permissions.map((permission, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-600" />
                      <span className="text-sm">{permission}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAssigning}>
            Cancel
          </Button>
          <Button onClick={handleAssignRole} disabled={isAssigning || !isRoleChanged}>
            {isAssigning
              ? 'Assigning...'
              : isRoleChanged
              ? `Assign ${selectedRoleInfo?.label} Role`
              : 'No Changes'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RoleAssignmentDialog
