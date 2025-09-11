'use client'

/**
 * Permission Management Dashboard
 * Comprehensive interface for managing user permissions and role capabilities
 */

import React, { useState, useMemo } from 'react'
import { 
  Shield, 
  Users, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  CheckCircle,
  Search,
  Filter,
  Eye,
  EyeOff,
  Settings,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  PERMISSIONS, 
  ROLE_PERMISSIONS, 
  PermissionManager,
  type Permission,
  type PermissionCategory 
} from '@/lib/auth/permission-matrix'
import type { Database } from '@/lib/supabase/types'

interface PermissionManagementDashboardProps {
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

const categoryIcons: Record<PermissionCategory, React.ComponentType<{ className?: string }>> = {
  organization: Settings,
  users: Users,
  tournaments: Shield,
  teams: Shield,
  players: Users,
  matches: Shield,
  statistics: Shield,
  reports: Shield,
  system: Settings
}

const levelColors: Record<string, string> = {
  read: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  write: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  admin: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
}

export function PermissionManagementDashboard({ className }: PermissionManagementDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<PermissionCategory | 'all'>('all')
  const [selectedRole, setSelectedRole] = useState<Database['public']['Enums']['user_role'] | 'all'>('all')
  const [showDescriptions, setShowDescriptions] = useState(true)
  const [comparisonMode, setComparisonMode] = useState(false)
  const [compareRoles, setCompareRoles] = useState<{
    from: Database['public']['Enums']['user_role']
    to: Database['public']['Enums']['user_role']
  }>({
    from: 'viewer',
    to: 'admin'
  })

  const categories = PermissionManager.getCategories()
  const roles = Object.keys(ROLE_PERMISSIONS) as Database['public']['Enums']['user_role'][]

  const filteredPermissions = useMemo(() => {
    return PERMISSIONS.filter(permission => {
      const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           permission.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || permission.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })
  }, [searchTerm, selectedCategory])

  const rolePermissionMatrix = useMemo(() => {
    const matrix: Record<string, Record<Database['public']['Enums']['user_role'], boolean>> = {}
    
    filteredPermissions.forEach(permission => {
      matrix[permission.id] = {}
      roles.forEach(role => {
        matrix[permission.id][role] = PermissionManager.hasPermission(role, permission.id)
      })
    })
    
    return matrix
  }, [filteredPermissions, roles])

  const roleComparison = useMemo(() => {
    if (!comparisonMode) return null
    return PermissionManager.compareRoles(compareRoles.from, compareRoles.to)
  }, [comparisonMode, compareRoles])

  const roleStats = useMemo(() => {
    return roles.map(role => ({
      role,
      totalPermissions: PermissionManager.getRolePermissions(role).length,
      byCategory: categories.map(category => ({
        category,
        count: PermissionManager.getPermissionsByCategory(category)
          .filter(p => PermissionManager.hasPermission(role, p.id)).length,
        total: PermissionManager.getPermissionsByCategory(category).length
      }))
    }))
  }, [roles, categories])

  return (
    <TooltipProvider>
      <div className={className}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Permission Management</h2>
            <p className="text-muted-foreground">
              Comprehensive overview of role-based permissions and access controls
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={comparisonMode ? "default" : "outline"}
              size="sm"
              onClick={() => setComparisonMode(!comparisonMode)}
            >
              <Shield className="mr-2 h-4 w-4" />
              Compare Roles
            </Button>
          </div>
        </div>

        <Tabs defaultValue="matrix" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
            <TabsTrigger value="roles">Role Overview</TabsTrigger>
            <TabsTrigger value="comparison">Role Comparison</TabsTrigger>
          </TabsList>

          {/* Permission Matrix Tab */}
          <TabsContent value="matrix" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-64">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search permissions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as any)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showDescriptions}
                      onCheckedChange={setShowDescriptions}
                    />
                    <span className="text-sm">Show Descriptions</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permission Matrix */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Permission Matrix
                </CardTitle>
                <CardDescription>
                  Role-based permission matrix showing access levels across all system features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-80">Permission</TableHead>
                        <TableHead className="w-24">Level</TableHead>
                        {roles.map(role => (
                          <TableHead key={role} className="text-center w-24">
                            <div className="flex flex-col items-center gap-1">
                              <Badge className={`${roleColors[role]} text-xs`}>
                                {roleLabels[role]}
                              </Badge>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPermissions.map(permission => {
                        const CategoryIcon = categoryIcons[permission.category]
                        return (
                          <TableRow key={permission.id}>
                            <TableCell>
                              <div className="flex items-start gap-3">
                                <div className="mt-1">
                                  <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium">{permission.name}</div>
                                  {showDescriptions && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {permission.description}
                                    </div>
                                  )}
                                  {permission.dependencies && (
                                    <div className="flex items-center gap-1 mt-2">
                                      <Info className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">
                                        Requires: {permission.dependencies.map(dep => 
                                          PERMISSIONS.find(p => p.id === dep)?.name
                                        ).join(', ')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={levelColors[permission.level]}>
                                {permission.level}
                              </Badge>
                            </TableCell>
                            {roles.map(role => (
                              <TableCell key={role} className="text-center">
                                {rolePermissionMatrix[permission.id]?.[role] ? (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {roleLabels[role]} has this permission
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {roleLabels[role]} does not have this permission
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Role Overview Tab */}
          <TabsContent value="roles" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {roleStats.map(({ role, totalPermissions, byCategory }) => (
                <Card key={role}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge className={roleColors[role]}>
                        {roleLabels[role]}
                      </Badge>
                      <span className="text-sm font-normal text-muted-foreground">
                        {totalPermissions} total permissions
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {byCategory.map(({ category, count, total }) => {
                        const CategoryIcon = categoryIcons[category]
                        const percentage = total > 0 ? Math.round((count / total) * 100) : 0
                        
                        return (
                          <div key={category} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm capitalize">{category}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {count}/{total}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {percentage}%
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Role Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Role Comparison</CardTitle>
                <CardDescription>
                  Compare permissions between different roles to understand privilege differences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">From:</label>
                    <Select 
                      value={compareRoles.from} 
                      onValueChange={(value) => setCompareRoles(prev => ({ ...prev, from: value as any }))}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => (
                          <SelectItem key={role} value={role}>
                            {roleLabels[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">To:</label>
                    <Select 
                      value={compareRoles.to} 
                      onValueChange={(value) => setCompareRoles(prev => ({ ...prev, to: value as any }))}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => (
                          <SelectItem key={role} value={role}>
                            {roleLabels[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {roleComparison && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Added Permissions */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          Added Permissions
                        </CardTitle>
                        <CardDescription>
                          Permissions gained when upgrading to {roleLabels[compareRoles.to]}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {roleComparison.added.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No additional permissions</p>
                          ) : (
                            roleComparison.added.map(permissionId => {
                              const permission = PermissionManager.getPermission(permissionId)
                              return permission ? (
                                <div key={permissionId} className="text-sm">
                                  <div className="font-medium">{permission.name}</div>
                                  <div className="text-muted-foreground text-xs">
                                    {permission.description}
                                  </div>
                                </div>
                              ) : null
                            })
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Removed Permissions */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-700">
                          <AlertTriangle className="h-4 w-4" />
                          Removed Permissions
                        </CardTitle>
                        <CardDescription>
                          Permissions lost when downgrading to {roleLabels[compareRoles.to]}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {roleComparison.removed.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No permissions removed</p>
                          ) : (
                            roleComparison.removed.map(permissionId => {
                              const permission = PermissionManager.getPermission(permissionId)
                              return permission ? (
                                <div key={permissionId} className="text-sm">
                                  <div className="font-medium">{permission.name}</div>
                                  <div className="text-muted-foreground text-xs">
                                    {permission.description}
                                  </div>
                                </div>
                              ) : null
                            })
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Unchanged Permissions */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-700">
                          <Lock className="h-4 w-4" />
                          Unchanged Permissions
                        </CardTitle>
                        <CardDescription>
                          Permissions that remain the same in both roles
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {roleComparison.unchanged.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No common permissions</p>
                          ) : (
                            <>
                              <p className="text-sm text-muted-foreground mb-2">
                                {roleComparison.unchanged.length} shared permissions
                              </p>
                              {roleComparison.unchanged.slice(0, 10).map(permissionId => {
                                const permission = PermissionManager.getPermission(permissionId)
                                return permission ? (
                                  <div key={permissionId} className="text-xs text-muted-foreground">
                                    {permission.name}
                                  </div>
                                ) : null
                              })}
                              {roleComparison.unchanged.length > 10 && (
                                <p className="text-xs text-muted-foreground">
                                  ... and {roleComparison.unchanged.length - 10} more
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}

export default PermissionManagementDashboard
