'use client'

import * as React from 'react'
import Link from 'next/link'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useOrganizationPreferences } from '@/hooks/use-organization-preferences'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Settings,
  Globe,
  Clock,
  Calendar,
  DollarSign,
  Trophy,
  Users,
  Bell,
  Shield,
  Eye,
  Edit,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrganizationSettingsSummaryProps {
  showActions?: boolean
  compact?: boolean
  className?: string
}

export function OrganizationSettingsSummary({ 
  showActions = true, 
  compact = false,
  className 
}: OrganizationSettingsSummaryProps) {
  const { currentOrganization, canManageOrganization } = useOrganization()
  const { preferences, utils, isLoading } = useOrganizationPreferences()

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </CardHeader>
        {!compact && (
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
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
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No organization selected</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const StatusIcon = ({ enabled }: { enabled: boolean }) => (
    enabled ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-muted-foreground" />
    )
  )

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className={cn("text-lg", compact && "text-base")}>
                Organization Settings
              </CardTitle>
              <CardDescription>
                Current configuration and preferences
              </CardDescription>
            </div>
          </div>
          
          {showActions && canManageOrganization && (
            <Button asChild variant="outline" size="sm">
              <Link href="/organizations/settings">
                <Edit className="mr-2 h-4 w-4" />
                Edit Settings
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>

      {!compact && (
        <CardContent>
          <div className="space-y-6">
            {/* General Settings */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                General Settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Default Sport:</span>
                  <Badge variant="outline" className="capitalize">
                    {preferences.defaultSport}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Language:</span>
                  <span className="font-medium">{preferences.language.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timezone:</span>
                  <span className="font-medium">{utils.timezoneLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currency:</span>
                  <span className="font-medium">{preferences.currency}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Date & Time Formatting */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date & Time Format
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date Format:</span>
                  <span className="font-medium">{preferences.dateFormat}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time Format:</span>
                  <span className="font-medium">{preferences.timeFormat} Hour</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Time:</span>
                  <span className="font-medium">{utils.formatTime(utils.getCurrentTime())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Today's Date:</span>
                  <span className="font-medium">{utils.formatDate(new Date())}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Match Settings */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Match Settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Match Duration:</span>
                  <span className="font-medium">{utils.formatMatchDuration(preferences.defaultMatchDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Halftime:</span>
                  <span className="font-medium">{utils.formatMatchDuration(preferences.defaultHalftimeDuration)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Extra Time:</span>
                  <div className="flex items-center gap-2">
                    <StatusIcon enabled={preferences.allowExtraTime} />
                    {preferences.allowExtraTime && (
                      <span className="font-medium">{utils.formatMatchDuration(preferences.defaultExtraTimeDuration)}</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Penalty Shootouts:</span>
                  <StatusIcon enabled={preferences.allowPenaltyShootouts} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Team Settings */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Teams/Tournament:</span>
                  <span className="font-medium">{preferences.maxTeamsPerTournament}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Players/Team:</span>
                  <span className="font-medium">{preferences.maxPlayersPerTeam}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Require Player Photos:</span>
                  <StatusIcon enabled={preferences.requirePlayerPhotos} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Require Medical Info:</span>
                  <StatusIcon enabled={preferences.requireMedicalInfo} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Feature Flags */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Features & Policies
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Auto-approve Teams:</span>
                  <StatusIcon enabled={preferences.autoApproveTeams} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Require Referee Approval:</span>
                  <StatusIcon enabled={preferences.requireRefereeApproval} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Live Streaming:</span>
                  <StatusIcon enabled={preferences.enableLiveStreaming} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Stats Export:</span>
                  <StatusIcon enabled={preferences.enableStatsExport} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Notifications & Privacy */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications & Privacy
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Email Notifications:</span>
                  <StatusIcon enabled={preferences.emailNotifications} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Match Reminders:</span>
                  <StatusIcon enabled={preferences.matchStartReminders} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Public Profile:</span>
                  <StatusIcon enabled={preferences.publicProfile} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Show Statistics:</span>
                  <StatusIcon enabled={preferences.showStatistics} />
                </div>
              </div>
            </div>

            {/* Configuration Status */}
            <div className="pt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Last updated: {currentOrganization.updated_at ? new Date(currentOrganization.updated_at).toLocaleDateString() : 'Unknown'}</span>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span>Configuration valid</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Compact version for smaller spaces
export function OrganizationSettingsCompact({ className }: { className?: string }) {
  return (
    <OrganizationSettingsSummary 
      showActions={false}
      compact
      className={className}
    />
  )
}
