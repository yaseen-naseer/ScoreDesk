'use client'

import * as React from 'react'
import Link from 'next/link'
import { useOrganization } from '@/lib/contexts/organization-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Building2, 
  MapPin, 
  Globe, 
  Mail, 
  Phone, 
  Calendar,
  Users,
  Trophy,
  Target,
  BarChart3,
  Settings,
  Edit,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrganizationInfoProps {
  showStats?: boolean
  showActions?: boolean
  compact?: boolean
  className?: string
}

export function OrganizationInfo({ 
  showStats = true, 
  showActions = true, 
  compact = false,
  className 
}: OrganizationInfoProps) {
  const { 
    currentOrganization, 
    organizationStats, 
    isLoading, 
    isLoadingStats,
    canManageOrganization 
  } = useOrganization()

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardHeader>
        {!compact && (
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        )}
      </Card>
    )
  }

  if (!currentOrganization) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No organization selected</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className={cn("h-16 w-16", compact && "h-12 w-12")}>
              <AvatarImage 
                src={currentOrganization.logo_url || undefined} 
                alt={currentOrganization.name}
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {currentOrganization.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className={cn("flex items-center gap-2", compact && "text-lg")}>
                {currentOrganization.name}
                <Badge variant="outline" className="text-xs">
                  @{currentOrganization.slug}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                {currentOrganization.description || 'Sports organization'}
              </CardDescription>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Member since {new Date(currentOrganization.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
          
          {showActions && canManageOrganization && (
            <Button asChild variant="outline" size="sm">
              <Link href="/organizations/profile">
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>

      {!compact && (
        <CardContent>
          <div className="space-y-6">
            {/* Contact Information */}
            <div>
              <h4 className="text-sm font-medium mb-3">Contact Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentOrganization.contact_info?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`mailto:${currentOrganization.contact_info.email}`}
                      className="text-primary hover:underline"
                    >
                      {currentOrganization.contact_info.email}
                    </a>
                  </div>
                )}
                
                {currentOrganization.contact_info?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`tel:${currentOrganization.contact_info.phone}`}
                      className="text-primary hover:underline"
                    >
                      {currentOrganization.contact_info.phone}
                    </a>
                  </div>
                )}
                
                {currentOrganization.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={currentOrganization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                
                {currentOrganization.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div>{currentOrganization.address.street}</div>
                      <div>
                        {currentOrganization.address.city}, {currentOrganization.address.state} {currentOrganization.address.postalCode}
                      </div>
                      <div>{currentOrganization.address.country}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Statistics */}
            {showStats && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Organization Statistics</h4>
                  {isLoadingStats ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="text-center">
                          <Skeleton className="h-8 w-8 mx-auto mb-2" />
                          <Skeleton className="h-4 w-12 mx-auto mb-1" />
                          <Skeleton className="h-3 w-16 mx-auto" />
                        </div>
                      ))}
                    </div>
                  ) : organizationStats ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-2xl font-bold">{organizationStats.totalMembers}</div>
                        <div className="text-xs text-muted-foreground">Members</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <Trophy className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-2xl font-bold">{organizationStats.totalTeams}</div>
                        <div className="text-xs text-muted-foreground">Teams</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <Target className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-2xl font-bold">{organizationStats.totalPlayers}</div>
                        <div className="text-xs text-muted-foreground">Players</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <BarChart3 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-2xl font-bold">{organizationStats.totalMatches}</div>
                        <div className="text-xs text-muted-foreground">Matches</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No statistics available</p>
                  )}
                </div>
              </>
            )}

            {/* Social Links */}
            {currentOrganization.social_links && Object.values(currentOrganization.social_links).some(link => link) && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Social Media</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentOrganization.social_links.facebook && (
                      <Button asChild variant="outline" size="sm">
                        <a 
                          href={currentOrganization.social_links.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Facebook
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    
                    {currentOrganization.social_links.twitter && (
                      <Button asChild variant="outline" size="sm">
                        <a 
                          href={currentOrganization.social_links.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Twitter
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    
                    {currentOrganization.social_links.instagram && (
                      <Button asChild variant="outline" size="sm">
                        <a 
                          href={currentOrganization.social_links.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Instagram
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    
                    {currentOrganization.social_links.youtube && (
                      <Button asChild variant="outline" size="sm">
                        <a 
                          href={currentOrganization.social_links.youtube}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          YouTube
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Quick Actions */}
            {showActions && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {canManageOrganization && (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/organizations/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </Button>
                  )}
                  
                  <Button asChild variant="outline" size="sm">
                    <Link href="/organizations/members">
                      <Users className="mr-2 h-4 w-4" />
                      View Members
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" size="sm">
                    <Link href="/teams">
                      <Trophy className="mr-2 h-4 w-4" />
                      View Teams
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Compact version for headers and sidebars
export function OrganizationInfoCompact({ className }: { className?: string }) {
  return (
    <OrganizationInfo 
      showStats={false}
      showActions={false}
      compact
      className={className}
    />
  )
}
