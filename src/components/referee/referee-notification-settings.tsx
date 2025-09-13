'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { RefereeNotificationService, NotificationSettings, NotificationChannel } from '@/lib/services/referee-notification-service'

interface RefereeNotificationSettingsProps {
  refereeId: string
  refereeName?: string
  onSettingsUpdated?: () => void
}

export function RefereeNotificationSettings({ 
  refereeId, 
  refereeName,
  onSettingsUpdated 
}: RefereeNotificationSettingsProps) {
  const { toast } = useToast()
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const notificationService = new RefereeNotificationService()

  useEffect(() => {
    loadSettings()
  }, [refereeId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await notificationService.getNotificationSettings(refereeId)
      setSettings(data)
    } catch (error) {
      console.error('Error loading notification settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load notification settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return

    try {
      setSaving(true)
      await notificationService.updateNotificationSettings(refereeId, settings)
      toast({
        title: 'Success',
        description: 'Notification settings updated successfully'
      })
      onSettingsUpdated?.()
    } catch (error) {
      console.error('Error saving notification settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to save notification settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading settings...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Failed to load settings</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Notification Settings
          {refereeName && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              for {refereeName}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Contact Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={settings.email_address || ''}
                onChange={(e) => updateSetting('email_address', e.target.value)}
                placeholder="referee@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={settings.phone_number || ''}
                onChange={(e) => updateSetting('phone_number', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={settings.timezone}
              onValueChange={(value) => updateSetting('timezone', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern Time</SelectItem>
                <SelectItem value="America/Chicago">Central Time</SelectItem>
                <SelectItem value="America/Denver">Mountain Time</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                <SelectItem value="Europe/London">London</SelectItem>
                <SelectItem value="Europe/Paris">Paris</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Channel Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Notification Channels</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                checked={settings.email_enabled}
                onCheckedChange={(checked) => updateSetting('email_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via text message
                </p>
              </div>
              <Switch
                checked={settings.sms_enabled}
                onCheckedChange={(checked) => updateSetting('sms_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications on mobile devices
                </p>
              </div>
              <Switch
                checked={settings.push_enabled}
                onCheckedChange={(checked) => updateSetting('push_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>In-App Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show notifications within the application
                </p>
              </div>
              <Switch
                checked={settings.in_app_enabled}
                onCheckedChange={(checked) => updateSetting('in_app_enabled', checked)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred-channel">Preferred Channel</Label>
            <Select
              value={settings.preferred_channel}
              onValueChange={(value: NotificationChannel) => updateSetting('preferred_channel', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select preferred channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="push">Push</SelectItem>
                <SelectItem value="in_app">In-App</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Quiet Hours</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiet-start">Start Time</Label>
              <Input
                id="quiet-start"
                type="time"
                value={settings.quiet_hours_start || ''}
                onChange={(e) => updateSetting('quiet_hours_start', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quiet-end">End Time</Label>
              <Input
                id="quiet-end"
                type="time"
                value={settings.quiet_hours_end || ''}
                onChange={(e) => updateSetting('quiet_hours_end', e.target.value)}
              />
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Notifications will be delayed during quiet hours (except urgent notifications)
          </p>
        </div>

        {/* Notification Types */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Notification Types</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Match Assignments</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications when assigned to matches
                </p>
              </div>
              <Switch
                checked={settings.match_assignment_notifications}
                onCheckedChange={(checked) => updateSetting('match_assignment_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Schedule Changes</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications when match schedules change
                </p>
              </div>
              <Switch
                checked={settings.schedule_change_notifications}
                onCheckedChange={(checked) => updateSetting('schedule_change_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Match Cancellations</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications when matches are cancelled
                </p>
              </div>
              <Switch
                checked={settings.cancellation_notifications}
                onCheckedChange={(checked) => updateSetting('cancellation_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Match Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Reminder notifications before matches
                </p>
              </div>
              <Switch
                checked={settings.reminder_notifications}
                onCheckedChange={(checked) => updateSetting('reminder_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Tournament Updates</Label>
                <p className="text-sm text-muted-foreground">
                  General tournament updates and announcements
                </p>
              </div>
              <Switch
                checked={settings.tournament_update_notifications}
                onCheckedChange={(checked) => updateSetting('tournament_update_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Payment Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Payment reminders and updates
                </p>
              </div>
              <Switch
                checked={settings.payment_notifications}
                onCheckedChange={(checked) => updateSetting('payment_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>System Announcements</Label>
                <p className="text-sm text-muted-foreground">
                  Important system-wide announcements
                </p>
              </div>
              <Switch
                checked={settings.system_announcement_notifications}
                onCheckedChange={(checked) => updateSetting('system_announcement_notifications', checked)}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
