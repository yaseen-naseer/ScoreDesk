/**
 * Team Detail Page
 * Comprehensive team profile with customization options
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Settings, 
  Users, 
  Calendar, 
  Trophy, 
  Edit,
  Share2,
  MoreVertical,
  MapPin,
  Phone,
  Mail,
  Globe,
  Facebook,
  Twitter,
  Instagram,
  Youtube
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { AppShell } from '@/components/layout/app-shell'
import { TeamCustomizationForm } from '@/components/teams/team-customization-form'
import { TeamStatisticsOverview } from '@/components/teams/team-statistics-overview'
import { TeamPerformanceDashboard } from '@/components/teams/team-performance-dashboard'
import { teamService, type TeamProfile } from '@/lib/services/team-service'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useAuth } from '@/lib/auth/auth-context'
import { hasPermission } from '@/lib/auth/permissions'
import { useToast } from '@/hooks/use-toast'

export default function TeamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { currentOrganization, userRole } = useOrganization()
  const { user } = useAuth()
  const { toast } = useToast()
  const [team, setTeam] = useState<TeamProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [customizationDialogOpen, setCustomizationDialogOpen] = useState(false)

  const teamId = params.id as string
  const canManageTeams = userRole && hasPermission(userRole, 'teams:write')

  useEffect(() => {
    loadTeam()
  }, [teamId])

  const loadTeam = async () => {
    try {
      setLoading(true)
      const teamData = await teamService.getTeam(teamId)
      if (teamData) {
        setTeam(teamData)
      } else {
        toast({
          variant: 'destructive',
          title: 'Team Not Found',
          description: 'The requested team could not be found'
        })
        router.push('/teams')
      }
    } catch (error) {
      console.error('Error loading team:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load team information'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTeamUpdate = (updatedTeam: TeamProfile) => {
    setTeam(updatedTeam)
    setCustomizationDialogOpen(false)
  }

  const getTeamTypeLabel = (type: string) => {
    switch (type) {
      case 'football': return 'Football (11-a-side)'
      case 'futsal': return 'Futsal (5-a-side)'
      case 'both': return 'Football & Futsal'
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

  const socialLinks = team?.social_media ? [
    { icon: Facebook, label: 'Facebook', url: team.social_media.facebook },
    { icon: Twitter, label: 'Twitter', url: team.social_media.twitter },
    { icon: Instagram, label: 'Instagram', url: team.social_media.instagram },
    { icon: Youtube, label: 'YouTube', url: team.social_media.youtube },
  ].filter(link => link.url) : []

  if (loading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-64" />
                <Skeleton className="h-40" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-48" />
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  if (!team) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertDescription>
              Team not found or you don't have permission to view it.
            </AlertDescription>
          </Alert>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/teams')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Teams
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={team.logo_url || ''} />
                <AvatarFallback 
                  style={{ backgroundColor: team.primary_color, color: team.secondary_color }}
                >
                  {team.short_name || team.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{team.name}</h1>
                <p className="text-muted-foreground">
                  {team.short_name && `${team.short_name} • `}
                  {getTeamTypeLabel(team.team_type)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            {canManageTeams && (
              <>
                <Dialog open={customizationDialogOpen} onOpenChange={setCustomizationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Customize
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Team Customization</DialogTitle>
                      <DialogDescription>
                        Customize {team.name}'s branding, colors, and venue information
                      </DialogDescription>
                    </DialogHeader>
                    <TeamCustomizationForm 
                      team={team}
                      onUpdate={handleTeamUpdate}
                    />
                  </DialogContent>
                </Dialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Team Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Team Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Team Colors Preview */}
                <div className="space-y-3">
                  <h4 className="font-medium">Team Colors</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex">
                      <div
                        className="w-12 h-12 rounded-l-lg border flex items-center justify-center text-white font-bold text-xs"
                        style={{ 
                          backgroundColor: team.primary_color,
                          color: team.secondary_color 
                        }}
                      >
                        {team.short_name || 'T'}
                      </div>
                      <div
                        className="w-12 h-12 rounded-r-lg border flex items-center justify-center font-bold text-xs"
                        style={{ 
                          backgroundColor: team.secondary_color,
                          color: team.primary_color 
                        }}
                      >
                        {team.short_name || 'T'}
                      </div>
                    </div>
                    <div className="text-sm">
                      <p><strong>Primary:</strong> {team.primary_color}</p>
                      <p><strong>Secondary:</strong> {team.secondary_color}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {team.description && (
                  <div className="space-y-2">
                    <h4 className="font-medium">About</h4>
                    <p className="text-muted-foreground">{team.description}</p>
                  </div>
                )}

                {/* Team Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{team.playerCount || 0}</div>
                    <div className="text-xs text-muted-foreground">Players</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{team.statistics?.totalMatches || 0}</div>
                    <div className="text-xs text-muted-foreground">Matches</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{team.statistics?.wins || 0}</div>
                    <div className="text-xs text-muted-foreground">Wins</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">
                      {team.statistics?.winPercentage || 0}%
                    </div>
                    <div className="text-xs text-muted-foreground">Win Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for additional content */}
            <Tabs defaultValue="statistics" className="w-full">
              <TabsList>
                <TabsTrigger value="statistics">Statistics</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="roster">Roster</TabsTrigger>
                <TabsTrigger value="matches">Matches</TabsTrigger>
              </TabsList>
              
              <TabsContent value="statistics">
                <TeamStatisticsOverview team={team} />
              </TabsContent>
              
              <TabsContent value="performance">
                <TeamPerformanceDashboard teamId={team.id} />
              </TabsContent>
              
              <TabsContent value="roster">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Team Roster
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No players registered yet</p>
                      <Button className="mt-4" variant="outline" onClick={() => router.push(`/teams/${team.id}/players`)}>
                        Manage Players
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="matches">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Match History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No matches scheduled yet</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Team Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Team Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className={getStatusColor(team.status)}>
                      {team.status.charAt(0).toUpperCase() + team.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <span className="text-sm font-medium">{getTeamTypeLabel(team.team_type)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <span className="text-sm font-medium">{getCategoryLabel(team.category)}</span>
                  </div>
                  {team.division && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Division</span>
                      <span className="text-sm font-medium">{team.division}</span>
                    </div>
                  )}
                  {team.founded_year && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Founded</span>
                      <span className="text-sm font-medium">{team.founded_year}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Venue Information */}
            {(team.home_venue || team.venue_address) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Home Venue
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {team.home_venue && (
                    <div>
                      <p className="font-medium">{team.home_venue}</p>
                    </div>
                  )}
                  {team.venue_address && (
                    <div>
                      <p className="text-sm text-muted-foreground">{team.venue_address}</p>
                    </div>
                  )}
                  {team.venue_capacity && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Capacity</span>
                      <span className="text-sm font-medium">
                        {team.venue_capacity.toLocaleString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Contact Information */}
            {(team.contact_email || team.contact_phone || team.website_url || socialLinks.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>Contact & Social</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {team.contact_email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`mailto:${team.contact_email}`}
                        className="text-sm hover:underline"
                      >
                        {team.contact_email}
                      </a>
                    </div>
                  )}
                  {team.contact_phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`tel:${team.contact_phone}`}
                        className="text-sm hover:underline"
                      >
                        {team.contact_phone}
                      </a>
                    </div>
                  )}
                  {team.website_url && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={team.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm hover:underline"
                      >
                        Website
                      </a>
                    </div>
                  )}
                  {socialLinks.length > 0 && (
                    <div className="pt-2">
                      <div className="flex gap-2">
                        {socialLinks.map((link) => {
                          const Icon = link.icon
                          return (
                            <a
                              key={link.label}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                              title={link.label}
                            >
                              <Icon className="h-4 w-4" />
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
