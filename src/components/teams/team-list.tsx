'use client'

/**
 * Team List Component
 * Advanced team list with search, filtering, pagination, and multiple view modes
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  SortAsc, 
  SortDesc, 
  Users, 
  MapPin, 
  Calendar,
  Trophy,
  Eye,
  Edit,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { teamService, type TeamProfile, type TeamSearchFilters } from '@/lib/services/team-service'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useAuth } from '@/lib/auth/auth-context'
import { hasPermission } from '@/lib/auth/permissions'
import { useToast } from '@/hooks/use-toast'
import { useDebounce } from '@/hooks/use-debounce'

interface TeamListProps {
  onTeamSelect?: (team: TeamProfile) => void
  className?: string
}

type ViewMode = 'grid' | 'list'
type SortField = 'name' | 'created_at' | 'founded_year' | 'player_count' | 'status'
type SortOrder = 'asc' | 'desc'

export function TeamList({ onTeamSelect, className }: TeamListProps) {
  const router = useRouter()
  const { currentOrganization, userRole } = useOrganization()
  const { user } = useAuth()
  const { toast } = useToast()

  // State
  const [teams, setTeams] = useState<TeamProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<TeamSearchFilters>({})
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  
  // Available filter options
  const [availableDivisions, setAvailableDivisions] = useState<string[]>([])
  
  // UI state
  const [filtersOpen, setFiltersOpen] = useState(false)

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const canManageTeams = userRole && hasPermission(userRole, 'teams:write')

  useEffect(() => {
    if (currentOrganization) {
      loadTeams()
      loadAvailableDivisions()
    }
  }, [
    currentOrganization, 
    debouncedSearchTerm, 
    filters, 
    sortField, 
    sortOrder, 
    currentPage, 
    pageSize
  ])

  const loadTeams = async () => {
    if (!currentOrganization) return

    try {
      setLoading(true)
      const searchFilters = {
        ...filters,
        search: debouncedSearchTerm || undefined
      }

      const result = await teamService.getOrganizationTeams(
        currentOrganization.id,
        searchFilters,
        {
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
          orderBy: { column: sortField, ascending: sortOrder === 'asc' }
        }
      )

      setTeams(result.teams)
      setTotalCount(result.totalCount)
    } catch (error) {
      console.error('Error loading teams:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load teams'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableDivisions = async () => {
    if (!currentOrganization) return

    try {
      const divisions = await teamService.getOrganizationDivisions(currentOrganization.id)
      setAvailableDivisions(divisions)
    } catch (error) {
      console.error('Error loading divisions:', error)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleFilterChange = (key: keyof TeamSearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setCurrentPage(1) // Reset to first page when sorting
  }

  const clearFilters = () => {
    setFilters({})
    setSearchTerm('')
    setCurrentPage(1)
  }

  const getTeamTypeLabel = (type: string) => {
    switch (type) {
      case 'football': return 'Football'
      case 'futsal': return 'Futsal'
      case 'both': return 'Both'
      default: return type
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'senior': return 'Senior'
      case 'youth': return 'Youth'
      case 'women': return 'Women'
      case 'mixed': return 'Mixed'
      default: return category
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  const hasActiveFilters = Object.values(filters).some(Boolean) || searchTerm

  // Render team card for grid view
  const renderTeamCard = (team: TeamProfile) => (
    <Card 
      key={team.id} 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onTeamSelect ? onTeamSelect(team) : router.push(`/teams/${team.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={team.logo_url || ''} />
            <AvatarFallback 
              style={{ backgroundColor: team.primary_color, color: team.secondary_color }}
            >
              {team.short_name || team.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{team.name}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              {team.short_name && <span>{team.short_name}</span>}
              <Badge variant="outline" className="text-xs">
                {getTeamTypeLabel(team.team_type)}
              </Badge>
            </CardDescription>
          </div>
          {canManageTeams && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/teams/${team.id}`)
                }}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/teams/${team.id}`)
                }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Team
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Team Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge className={getStatusColor(team.status)}>
              {team.status.charAt(0).toUpperCase() + team.status.slice(1)}
            </Badge>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted/50 rounded p-2">
              <div className="font-semibold">{team.playerCount || 0}</div>
              <div className="text-xs text-muted-foreground">Players</div>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <div className="font-semibold">{team.statistics?.totalMatches || 0}</div>
              <div className="text-xs text-muted-foreground">Matches</div>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <div className="font-semibold">{team.statistics?.wins || 0}</div>
              <div className="text-xs text-muted-foreground">Wins</div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Category</span>
              <span>{getCategoryLabel(team.category)}</span>
            </div>
            {team.division && (
              <div className="flex items-center justify-between">
                <span>Division</span>
                <span>{team.division}</span>
              </div>
            )}
            {team.home_venue && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{team.home_venue}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Render team row for list view
  const renderTeamRow = (team: TeamProfile) => (
    <Card 
      key={team.id} 
      className="hover:shadow-sm transition-shadow cursor-pointer"
      onClick={() => onTeamSelect ? onTeamSelect(team) : router.push(`/teams/${team.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={team.logo_url || ''} />
            <AvatarFallback 
              style={{ backgroundColor: team.primary_color, color: team.secondary_color }}
            >
              {team.short_name || team.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
            <div className="md:col-span-2">
              <h3 className="font-semibold truncate">{team.name}</h3>
              <p className="text-sm text-muted-foreground">
                {team.short_name && `${team.short_name} • `}
                {getTeamTypeLabel(team.team_type)}
              </p>
            </div>
            
            <div className="text-sm">
              <Badge className={getStatusColor(team.status)}>
                {team.status.charAt(0).toUpperCase() + team.status.slice(1)}
              </Badge>
            </div>
            
            <div className="text-sm">
              <div className="font-medium">{getCategoryLabel(team.category)}</div>
              {team.division && (
                <div className="text-muted-foreground">{team.division}</div>
              )}
            </div>
            
            <div className="text-sm">
              <div className="flex items-center gap-4">
                <span><strong>{team.playerCount || 0}</strong> players</span>
                <span><strong>{team.statistics?.totalMatches || 0}</strong> matches</span>
              </div>
            </div>
            
            <div className="flex justify-end">
              {canManageTeams && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/teams/${team.id}`)
                    }}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/teams/${team.id}`)
                    }}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className={className}>
      {/* Search and Controls */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teams by name, description, or venue..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Filter Sheet */}
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="relative">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                    {hasActiveFilters && (
                      <Badge className="ml-2 h-5 w-5 p-0 text-xs">
                        {Object.values(filters).filter(Boolean).length + (searchTerm ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filter Teams</SheetTitle>
                    <SheetDescription>
                      Refine your team list with advanced filters
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="space-y-6 mt-6">
                    {/* Team Type Filter */}
                    <div className="space-y-2">
                      <Label>Team Type</Label>
                      <Select 
                        value={filters.team_type || ''} 
                        onValueChange={(value) => handleFilterChange('team_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All types</SelectItem>
                          <SelectItem value="football">Football (11-a-side)</SelectItem>
                          <SelectItem value="futsal">Futsal (5-a-side)</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Category Filter */}
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select 
                        value={filters.category || ''} 
                        onValueChange={(value) => handleFilterChange('category', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All categories</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                          <SelectItem value="youth">Youth</SelectItem>
                          <SelectItem value="women">Women</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select 
                        value={filters.status || ''} 
                        onValueChange={(value) => handleFilterChange('status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All statuses</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Division Filter */}
                    {availableDivisions.length > 0 && (
                      <div className="space-y-2">
                        <Label>Division</Label>
                        <Select 
                          value={filters.division || ''} 
                          onValueChange={(value) => handleFilterChange('division', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All divisions" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All divisions</SelectItem>
                            {availableDivisions.map((division) => (
                              <SelectItem key={division} value={division}>
                                {division}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Founded Year Range */}
                    <div className="space-y-4">
                      <Label>Founded Year Range</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">From</Label>
                          <Input
                            type="number"
                            placeholder="1900"
                            value={filters.founded_year_min || ''}
                            onChange={(e) => handleFilterChange('founded_year_min', parseInt(e.target.value) || undefined)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">To</Label>
                          <Input
                            type="number"
                            placeholder={new Date().getFullYear().toString()}
                            value={filters.founded_year_max || ''}
                            onChange={(e) => handleFilterChange('founded_year_max', parseInt(e.target.value) || undefined)}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Clear Filters */}
                    <Button variant="outline" onClick={clearFilters} className="w-full">
                      Clear All Filters
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Sort Dropdown */}
              <Select value={`${sortField}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-') as [SortField, SortOrder]
                setSortField(field)
                setSortOrder(order)
              }}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="created_at-desc">Newest First</SelectItem>
                  <SelectItem value="created_at-asc">Oldest First</SelectItem>
                  <SelectItem value="founded_year-desc">Founded (Newest)</SelectItem>
                  <SelectItem value="founded_year-asc">Founded (Oldest)</SelectItem>
                  <SelectItem value="status-asc">Status</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Info */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Showing {totalCount > 0 ? startItem : 0}-{endItem} of {totalCount} teams
        </p>
        <Select value={pageSize.toString()} onValueChange={(value) => {
          setPageSize(parseInt(value))
          setCurrentPage(1)
        }}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">6 per page</SelectItem>
            <SelectItem value="12">12 per page</SelectItem>
            <SelectItem value="24">24 per page</SelectItem>
            <SelectItem value="48">48 per page</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Teams List */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {Array.from({ length: pageSize }).map((_, index) => (
            <Skeleton key={index} className={viewMode === 'grid' ? 'h-64' : 'h-24'} />
          ))}
        </div>
      ) : teams.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map(renderTeamCard)}
            </div>
          ) : (
            <div className="space-y-4">
              {teams.map(renderTeamRow)}
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {hasActiveFilters ? 'No teams match your filters' : 'No teams found'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters 
                  ? 'Try adjusting your search criteria or filters.'
                  : 'Get started by registering your first team.'
                }
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamList
