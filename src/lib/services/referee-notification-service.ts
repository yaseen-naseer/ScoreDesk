import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

type Referee = Database['public']['Tables']['referees']['Row']
type Match = Database['public']['Tables']['matches']['Row']
type Tournament = Database['public']['Tables']['tournaments']['Row']

export interface NotificationTemplate {
  id: string
  name: string
  type: NotificationType
  subject: string
  email_body: string
  sms_body: string
  variables: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface NotificationRequest {
  referee_id: string
  match_id?: string
  tournament_id?: string
  notification_type: NotificationType
  priority: 'low' | 'medium' | 'high' | 'urgent'
  channels: NotificationChannel[]
  template_id?: string
  custom_data?: Record<string, any>
  scheduled_for?: string
  expires_at?: string
  retry_count?: number
  max_retries?: number
}

export interface NotificationRecord {
  id: string
  referee_id: string
  match_id?: string
  tournament_id?: string
  notification_type: NotificationType
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'expired'
  channels_requested: NotificationChannel[]
  channels_sent: NotificationChannel[]
  channels_delivered: NotificationChannel[]
  channels_failed: NotificationChannel[]
  template_id?: string
  subject?: string
  message_body?: string
  custom_data?: Record<string, any>
  scheduled_for?: string
  sent_at?: string
  delivered_at?: string
  failed_at?: string
  expires_at?: string
  retry_count: number
  max_retries: number
  error_message?: string
  created_at: string
  updated_at: string
}

export type NotificationType = 
  | 'match_assignment'
  | 'match_schedule_change'
  | 'match_cancellation'
  | 'match_postponement'
  | 'match_reminder'
  | 'tournament_update'
  | 'payment_reminder'
  | 'availability_request'
  | 'training_session'
  | 'meeting_reminder'
  | 'system_announcement'

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app'

export interface NotificationSettings {
  referee_id: string
  email_enabled: boolean
  sms_enabled: boolean
  push_enabled: boolean
  in_app_enabled: boolean
  email_address?: string
  phone_number?: string
  preferred_channel: NotificationChannel
  quiet_hours_start?: string
  quiet_hours_end?: string
  timezone: string
  match_assignment_notifications: boolean
  schedule_change_notifications: boolean
  cancellation_notifications: boolean
  reminder_notifications: boolean
  tournament_update_notifications: boolean
  payment_notifications: boolean
  system_announcement_notifications: boolean
}

export interface BulkNotificationRequest {
  referee_ids: string[]
  notification_type: NotificationType
  priority: 'low' | 'medium' | 'high' | 'urgent'
  channels: NotificationChannel[]
  template_id?: string
  custom_data?: Record<string, any>
  scheduled_for?: string
  expires_at?: string
  match_id?: string
  tournament_id?: string
}

export interface NotificationDeliveryReport {
  total_sent: number
  total_delivered: number
  total_failed: number
  delivery_rate: number
  channel_breakdown: {
    email: { sent: number; delivered: number; failed: number }
    sms: { sent: number; delivered: number; failed: number }
    push: { sent: number; delivered: number; failed: number }
    in_app: { sent: number; delivered: number; failed: number }
  }
  failures: Array<{
    notification_id: string
    channel: NotificationChannel
    error_message: string
    retry_count: number
  }>
}

export interface NotificationAnalytics {
  total_notifications: number
  delivery_rate: number
  average_delivery_time: number
  channel_performance: {
    email: { count: number; success_rate: number; avg_delivery_time: number }
    sms: { count: number; success_rate: number; avg_delivery_time: number }
    push: { count: number; success_rate: number; avg_delivery_time: number }
    in_app: { count: number; success_rate: number; avg_delivery_time: number }
  }
  type_performance: {
    [key in NotificationType]: {
      count: number
      success_rate: number
      avg_delivery_time: number
    }
  }
  recent_trends: Array<{
    date: string
    sent: number
    delivered: number
    failed: number
  }>
}

export class RefereeNotificationService {
  private supabase = createClientComponentClient<Database>()

  constructor() {}

  /**
   * Send notification to a single referee
   */
  async sendNotification(request: NotificationRequest): Promise<NotificationRecord> {
    try {
      // Validate referee and get settings
      const referee = await this.getReferee(request.referee_id)
      if (!referee) {
        throw new Error('Referee not found')
      }

      const settings = await this.getNotificationSettings(request.referee_id)
      if (!settings) {
        throw new Error('Notification settings not found')
      }

      // Filter channels based on referee preferences
      const allowedChannels = this.filterAllowedChannels(request.channels, settings)
      if (allowedChannels.length === 0) {
        throw new Error('No notification channels allowed for this referee')
      }

      // Check quiet hours
      if (this.isQuietHours(settings)) {
        throw new Error('Notification blocked due to quiet hours')
      }

      // Get or create notification record
      const notification = await this.createNotificationRecord({
        ...request,
        channels_requested: request.channels,
        channels_sent: allowedChannels
      })

      // Process notification through each channel
      const results = await Promise.allSettled(
        allowedChannels.map(channel => this.sendNotificationByChannel(notification, channel, referee, settings))
      )

      // Update notification record with results
      await this.updateNotificationResults(notification.id, results, allowedChannels)

      return await this.getNotification(notification.id)

    } catch (error) {
      console.error('Error sending notification:', error)
      throw error
    }
  }

  /**
   * Send bulk notifications to multiple referees
   */
  async sendBulkNotification(request: BulkNotificationRequest): Promise<NotificationDeliveryReport> {
    try {
      const results = await Promise.allSettled(
        request.referee_ids.map(refereeId => 
          this.sendNotification({
            referee_id: refereeId,
            match_id: request.match_id,
            tournament_id: request.tournament_id,
            notification_type: request.notification_type,
            priority: request.priority,
            channels: request.channels,
            template_id: request.template_id,
            custom_data: request.custom_data,
            scheduled_for: request.scheduled_for,
            expires_at: request.expires_at
          })
        )
      )

      return this.generateDeliveryReport(results)

    } catch (error) {
      console.error('Error sending bulk notifications:', error)
      throw error
    }
  }

  /**
   * Send match assignment notification
   */
  async sendMatchAssignmentNotification(
    refereeId: string, 
    matchId: string, 
    channels: NotificationChannel[] = ['email', 'in_app']
  ): Promise<NotificationRecord> {
    const match = await this.getMatchDetails(matchId)
    if (!match) {
      throw new Error('Match not found')
    }

    return this.sendNotification({
      referee_id: refereeId,
      match_id: matchId,
      notification_type: 'match_assignment',
      priority: 'medium',
      channels,
      custom_data: {
        match_date: match.scheduled_date,
        match_venue: match.venue?.name,
        tournament_name: match.tournament?.name,
        home_team: match.home_team_details?.name,
        away_team: match.away_team_details?.name
      }
    })
  }

  /**
   * Send match schedule change notification
   */
  async sendScheduleChangeNotification(
    refereeId: string,
    matchId: string,
    changeDetails: {
      original_date: string
      new_date: string
      original_venue?: string
      new_venue?: string
    },
    channels: NotificationChannel[] = ['email', 'sms', 'in_app']
  ): Promise<NotificationRecord> {
    return this.sendNotification({
      referee_id: refereeId,
      match_id: matchId,
      notification_type: 'match_schedule_change',
      priority: 'high',
      channels,
      custom_data: changeDetails
    })
  }

  /**
   * Send match reminder notification
   */
  async sendMatchReminderNotification(
    refereeId: string,
    matchId: string,
    reminderType: '24_hours' | '2_hours' | '30_minutes',
    channels: NotificationChannel[] = ['email', 'sms']
  ): Promise<NotificationRecord> {
    const priority = reminderType === '30_minutes' ? 'urgent' : 'medium'

    return this.sendNotification({
      referee_id: refereeId,
      match_id: matchId,
      notification_type: 'match_reminder',
      priority,
      channels,
      custom_data: {
        reminder_type: reminderType,
        reminder_time: reminderType
      }
    })
  }

  /**
   * Send tournament update notification
   */
  async sendTournamentUpdateNotification(
    refereeIds: string[],
    tournamentId: string,
    updateType: 'schedule_change' | 'rule_change' | 'venue_change' | 'general_update',
    message: string,
    channels: NotificationChannel[] = ['email', 'in_app']
  ): Promise<NotificationDeliveryReport> {
    return this.sendBulkNotification({
      referee_ids: refereeIds,
      tournament_id: tournamentId,
      notification_type: 'tournament_update',
      priority: 'medium',
      channels,
      custom_data: {
        update_type: updateType,
        message
      }
    })
  }

  /**
   * Get notification settings for a referee
   */
  async getNotificationSettings(refereeId: string): Promise<NotificationSettings | null> {
    try {
      const { data } = await this.supabase
        .from('referee_notification_settings')
        .select('*')
        .eq('referee_id', refereeId)
        .single()

      return data

    } catch (error) {
      console.error('Error getting notification settings:', error)
      return null
    }
  }

  /**
   * Update notification settings for a referee
   */
  async updateNotificationSettings(
    refereeId: string, 
    settings: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    try {
      const { data, error } = await this.supabase
        .from('referee_notification_settings')
        .upsert({
          referee_id: refereeId,
          ...settings,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      return data

    } catch (error) {
      console.error('Error updating notification settings:', error)
      throw error
    }
  }

  /**
   * Get notification templates
   */
  async getNotificationTemplates(type?: NotificationType): Promise<NotificationTemplate[]> {
    try {
      let query = this.supabase
        .from('notification_templates')
        .select('*')
        .eq('is_active', true)

      if (type) {
        query = query.eq('type', type)
      }

      const { data } = await query.order('name')

      return data || []

    } catch (error) {
      console.error('Error getting notification templates:', error)
      return []
    }
  }

  /**
   * Create or update notification template
   */
  async saveNotificationTemplate(template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<NotificationTemplate> {
    try {
      const { data, error } = await this.supabase
        .from('notification_templates')
        .upsert({
          ...template,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      return data

    } catch (error) {
      console.error('Error saving notification template:', error)
      throw error
    }
  }

  /**
   * Get notification history for a referee
   */
  async getRefereeNotificationHistory(
    refereeId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<NotificationRecord[]> {
    try {
      const { data } = await this.supabase
        .from('referee_notifications')
        .select('*')
        .eq('referee_id', refereeId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      return data || []

    } catch (error) {
      console.error('Error getting notification history:', error)
      return []
    }
  }

  /**
   * Get notification analytics
   */
  async getNotificationAnalytics(
    startDate?: string,
    endDate?: string
  ): Promise<NotificationAnalytics> {
    try {
      // This would involve complex queries to analyze notification performance
      // For now, returning mock data structure
      return {
        total_notifications: 0,
        delivery_rate: 0,
        average_delivery_time: 0,
        channel_performance: {
          email: { count: 0, success_rate: 0, avg_delivery_time: 0 },
          sms: { count: 0, success_rate: 0, avg_delivery_time: 0 },
          push: { count: 0, success_rate: 0, avg_delivery_time: 0 },
          in_app: { count: 0, success_rate: 0, avg_delivery_time: 0 }
        },
        type_performance: {} as any,
        recent_trends: []
      }

    } catch (error) {
      console.error('Error getting notification analytics:', error)
      throw error
    }
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(notificationIds?: string[]): Promise<number> {
    try {
      let query = this.supabase
        .from('referee_notifications')
        .select('*')
        .eq('status', 'failed')

      if (notificationIds) {
        query = query.in('id', notificationIds)
      }

      const { data: failedNotifications } = await query

      if (!failedNotifications || failedNotifications.length === 0) {
        return 0
      }

      let retryCount = 0
      for (const notification of failedNotifications) {
        if (notification.retry_count < notification.max_retries) {
          await this.retryNotification(notification)
          retryCount++
        }
      }

      return retryCount

    } catch (error) {
      console.error('Error retrying failed notifications:', error)
      throw error
    }
  }

  /**
   * Private helper methods
   */
  private async getReferee(refereeId: string): Promise<Referee | null> {
    try {
      const { data } = await this.supabase
        .from('referees')
        .select('*')
        .eq('id', refereeId)
        .single()

      return data

    } catch (error) {
      console.error('Error getting referee:', error)
      return null
    }
  }

  private async getMatchDetails(matchId: string): Promise<any> {
    try {
      const { data } = await this.supabase
        .from('matches')
        .select(`
          *,
          venue:venues(*),
          tournament:tournaments(*),
          home_team_details:teams!matches_home_team_id_fkey(*),
          away_team_details:teams!matches_away_team_id_fkey(*)
        `)
        .eq('id', matchId)
        .single()

      return data

    } catch (error) {
      console.error('Error getting match details:', error)
      return null
    }
  }

  private filterAllowedChannels(
    requestedChannels: NotificationChannel[],
    settings: NotificationSettings
  ): NotificationChannel[] {
    return requestedChannels.filter(channel => {
      switch (channel) {
        case 'email': return settings.email_enabled
        case 'sms': return settings.sms_enabled
        case 'push': return settings.push_enabled
        case 'in_app': return settings.in_app_enabled
        default: return false
      }
    })
  }

  private isQuietHours(settings: NotificationSettings): boolean {
    if (!settings.quiet_hours_start || !settings.quiet_hours_end) {
      return false
    }

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const startTime = this.parseTime(settings.quiet_hours_start)
    const endTime = this.parseTime(settings.quiet_hours_end)

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime
    }
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number)
    return hours * 60 + minutes
  }

  private async createNotificationRecord(data: any): Promise<NotificationRecord> {
    const { data: notification, error } = await this.supabase
      .from('referee_notifications')
      .insert([{
        ...data,
        status: 'pending',
        retry_count: 0,
        max_retries: data.max_retries || 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error
    return notification
  }

  private async sendNotificationByChannel(
    notification: NotificationRecord,
    channel: NotificationChannel,
    referee: Referee,
    settings: NotificationSettings
  ): Promise<{ channel: NotificationChannel; success: boolean; error?: string }> {
    try {
      switch (channel) {
        case 'email':
          return await this.sendEmailNotification(notification, referee, settings)
        case 'sms':
          return await this.sendSMSNotification(notification, referee, settings)
        case 'push':
          return await this.sendPushNotification(notification, referee, settings)
        case 'in_app':
          return await this.sendInAppNotification(notification, referee, settings)
        default:
          throw new Error(`Unsupported notification channel: ${channel}`)
      }
    } catch (error) {
      return {
        channel,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async sendEmailNotification(
    notification: NotificationRecord,
    referee: Referee,
    settings: NotificationSettings
  ): Promise<{ channel: NotificationChannel; success: boolean; error?: string }> {
    // Implementation would integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`Sending email notification to ${settings.email_address}`)
    return { channel: 'email', success: true }
  }

  private async sendSMSNotification(
    notification: NotificationRecord,
    referee: Referee,
    settings: NotificationSettings
  ): Promise<{ channel: NotificationChannel; success: boolean; error?: string }> {
    // Implementation would integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`Sending SMS notification to ${settings.phone_number}`)
    return { channel: 'sms', success: true }
  }

  private async sendPushNotification(
    notification: NotificationRecord,
    referee: Referee,
    settings: NotificationSettings
  ): Promise<{ channel: NotificationChannel; success: boolean; error?: string }> {
    // Implementation would integrate with push notification service (FCM, APNs, etc.)
    console.log(`Sending push notification to referee ${referee.id}`)
    return { channel: 'push', success: true }
  }

  private async sendInAppNotification(
    notification: NotificationRecord,
    referee: Referee,
    settings: NotificationSettings
  ): Promise<{ channel: NotificationChannel; success: boolean; error?: string }> {
    // Implementation would store notification in database for in-app display
    console.log(`Storing in-app notification for referee ${referee.id}`)
    return { channel: 'in_app', success: true }
  }

  private async updateNotificationResults(
    notificationId: string,
    results: PromiseSettledResult<any>[],
    channels: NotificationChannel[]
  ): Promise<void> {
    const deliveredChannels: NotificationChannel[] = []
    const failedChannels: NotificationChannel[] = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        deliveredChannels.push(channels[index])
      } else {
        failedChannels.push(channels[index])
      }
    })

    const status = failedChannels.length === 0 ? 'delivered' : 
                   deliveredChannels.length === 0 ? 'failed' : 'partially_delivered'

    await this.supabase
      .from('referee_notifications')
      .update({
        status,
        channels_delivered: deliveredChannels,
        channels_failed: failedChannels,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId)
  }

  private async getNotification(notificationId: string): Promise<NotificationRecord> {
    const { data } = await this.supabase
      .from('referee_notifications')
      .select('*')
      .eq('id', notificationId)
      .single()

    return data
  }

  private generateDeliveryReport(results: PromiseSettledResult<any>[]): NotificationDeliveryReport {
    let totalSent = 0
    let totalDelivered = 0
    let totalFailed = 0

    results.forEach(result => {
      totalSent++
      if (result.status === 'fulfilled') {
        totalDelivered++
      } else {
        totalFailed++
      }
    })

    return {
      total_sent: totalSent,
      total_delivered: totalDelivered,
      total_failed: totalFailed,
      delivery_rate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      channel_breakdown: {
        email: { sent: 0, delivered: 0, failed: 0 },
        sms: { sent: 0, delivered: 0, failed: 0 },
        push: { sent: 0, delivered: 0, failed: 0 },
        in_app: { sent: 0, delivered: 0, failed: 0 }
      },
      failures: []
    }
  }

  private async retryNotification(notification: NotificationRecord): Promise<void> {
    // Implementation would retry sending the notification
    console.log(`Retrying notification ${notification.id}`)
  }
}
