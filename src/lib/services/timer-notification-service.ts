/**
 * Timer Notification Service
 * Handles notifications for timer events and period transitions
 */

import { useToast } from '@/hooks/use-toast'

export interface TimerNotificationConfig {
  enableSound: boolean
  enableDesktopNotifications: boolean
  enableToastNotifications: boolean
  soundVolume: number
  notificationTypes: {
    periodTransition: boolean
    timerStart: boolean
    timerPause: boolean
    timerResume: boolean
    stoppageAdded: boolean
    injuryTime: boolean
    timerError: boolean
  }
}

export interface NotificationSound {
  id: string
  name: string
  url: string
  volume: number
}

export interface PeriodTransitionNotification {
  fromPeriod: string
  toPeriod: string
  timestamp: Date
  matchId: string
  duration?: number
}

export class TimerNotificationService {
  private config: TimerNotificationConfig
  private audioContext: AudioContext | null = null
  private sounds: Map<string, AudioBuffer> = new Map()
  private lastNotificationTime: Date = new Date(0)
  private notificationCooldown = 1000 // 1 second cooldown between notifications

  constructor(config?: Partial<TimerNotificationConfig>) {
    this.config = {
      enableSound: true,
      enableDesktopNotifications: true,
      enableToastNotifications: true,
      soundVolume: 0.7,
      notificationTypes: {
        periodTransition: true,
        timerStart: true,
        timerPause: false,
        timerResume: false,
        stoppageAdded: true,
        injuryTime: true,
        timerError: true
      },
      ...config
    }

    this.initializeAudioContext()
    this.loadNotificationSounds()
    this.requestNotificationPermission()
  }

  /**
   * Notify period transition
   */
  async notifyPeriodTransition(notification: PeriodTransitionNotification): Promise<void> {
    if (!this.config.notificationTypes.periodTransition) {
      return
    }

    const message = this.getPeriodTransitionMessage(notification)
    
    await this.sendNotification({
      title: 'Period Transition',
      message,
      type: 'periodTransition',
      severity: 'info',
      data: notification
    })
  }

  /**
   * Notify timer start
   */
  async notifyTimerStart(matchId: string, userRole: string): Promise<void> {
    if (!this.config.notificationTypes.timerStart) {
      return
    }

    await this.sendNotification({
      title: 'Timer Started',
      message: `Match timer started by ${userRole}`,
      type: 'timerStart',
      severity: 'info',
      data: { matchId, userRole }
    })
  }

  /**
   * Notify timer pause
   */
  async notifyTimerPause(matchId: string, userRole: string): Promise<void> {
    if (!this.config.notificationTypes.timerPause) {
      return
    }

    await this.sendNotification({
      title: 'Timer Paused',
      message: `Match timer paused by ${userRole}`,
      type: 'timerPause',
      severity: 'info',
      data: { matchId, userRole }
    })
  }

  /**
   * Notify timer resume
   */
  async notifyTimerResume(matchId: string, userRole: string): Promise<void> {
    if (!this.config.notificationTypes.timerResume) {
      return
    }

    await this.sendNotification({
      title: 'Timer Resumed',
      message: `Match timer resumed by ${userRole}`,
      type: 'timerResume',
      severity: 'info',
      data: { matchId, userRole }
    })
  }

  /**
   * Notify stoppage time added
   */
  async notifyStoppageAdded(matchId: string, minutes: number, userRole: string): Promise<void> {
    if (!this.config.notificationTypes.stoppageAdded) {
      return
    }

    await this.sendNotification({
      title: 'Stoppage Time Added',
      message: `+${minutes} minutes added by ${userRole}`,
      type: 'stoppageAdded',
      severity: 'info',
      data: { matchId, minutes, userRole }
    })
  }

  /**
   * Notify injury time
   */
  async notifyInjuryTime(matchId: string, playerId: string, action: 'start' | 'end', userRole: string): Promise<void> {
    if (!this.config.notificationTypes.injuryTime) {
      return
    }

    const message = action === 'start' 
      ? `Injury time started for player ${playerId} by ${userRole}`
      : `Injury time ended for player ${playerId} by ${userRole}`

    await this.sendNotification({
      title: action === 'start' ? 'Injury Time Started' : 'Injury Time Ended',
      message,
      type: 'injuryTime',
      severity: action === 'start' ? 'warning' : 'info',
      data: { matchId, playerId, action, userRole }
    })
  }

  /**
   * Notify timer error
   */
  async notifyTimerError(matchId: string, error: string): Promise<void> {
    if (!this.config.notificationTypes.timerError) {
      return
    }

    await this.sendNotification({
      title: 'Timer Error',
      message: error,
      type: 'timerError',
      severity: 'error',
      data: { matchId, error }
    })
  }

  /**
   * Update notification configuration
   */
  updateConfig(newConfig: Partial<TimerNotificationConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  getConfig(): TimerNotificationConfig {
    return { ...this.config }
  }

  /**
   * Play notification sound
   */
  async playSound(soundId: string): Promise<void> {
    if (!this.config.enableSound || !this.audioContext) {
      return
    }

    try {
      const buffer = this.sounds.get(soundId)
      if (!buffer) {
        console.warn(`Sound ${soundId} not found`)
        return
      }

      const source = this.audioContext.createBufferSource()
      const gainNode = this.audioContext.createGain()
      
      source.buffer = buffer
      gainNode.gain.value = this.config.soundVolume
      
      source.connect(gainNode)
      gainNode.connect(this.audioContext.destination)
      
      source.start()
    } catch (error) {
      console.error('Error playing notification sound:', error)
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
    }
    this.sounds.clear()
  }

  // Private methods

  private async sendNotification(notification: {
    title: string
    message: string
    type: string
    severity: 'info' | 'warning' | 'error'
    data?: any
  }): Promise<void> {
    // Prevent spam notifications
    const now = new Date()
    if (now.getTime() - this.lastNotificationTime.getTime() < this.notificationCooldown) {
      return
    }
    this.lastNotificationTime = now

    // Desktop notification
    if (this.config.enableDesktopNotifications && 'Notification' in window) {
      await this.sendDesktopNotification(notification)
    }

    // Toast notification (if in React context)
    if (this.config.enableToastNotifications) {
      this.sendToastNotification(notification)
    }

    // Sound notification
    if (this.config.enableSound) {
      await this.playNotificationSound(notification.type, notification.severity)
    }
  }

  private async sendDesktopNotification(notification: {
    title: string
    message: string
    type: string
    severity: 'info' | 'warning' | 'error'
  }): Promise<void> {
    if (Notification.permission === 'granted') {
      const desktopNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `timer-${notification.type}`,
        requireInteraction: notification.severity === 'error',
        silent: !this.config.enableSound
      })

      // Auto-close after 5 seconds (except for errors)
      if (notification.severity !== 'error') {
        setTimeout(() => {
          desktopNotification.close()
        }, 5000)
      }

      desktopNotification.onclick = () => {
        window.focus()
        desktopNotification.close()
      }
    }
  }

  private sendToastNotification(notification: {
    title: string
    message: string
    type: string
    severity: 'info' | 'warning' | 'error'
  }): void {
    // This would be called from React components that have access to useToast
    // For now, we'll dispatch a custom event that components can listen to
    window.dispatchEvent(new CustomEvent('timer-notification', {
      detail: {
        title: notification.title,
        description: notification.message,
        variant: notification.severity === 'error' ? 'destructive' : 'default'
      }
    }))
  }

  private async playNotificationSound(type: string, severity: 'info' | 'warning' | 'error'): Promise<void> {
    let soundId: string

    switch (type) {
      case 'periodTransition':
        soundId = 'period-transition'
        break
      case 'timerStart':
        soundId = 'timer-start'
        break
      case 'stoppageAdded':
        soundId = 'stoppage-added'
        break
      case 'injuryTime':
        soundId = 'injury-time'
        break
      case 'timerError':
        soundId = 'error'
        break
      default:
        soundId = 'notification'
    }

    await this.playSound(soundId)
  }

  private getPeriodTransitionMessage(notification: PeriodTransitionNotification): string {
    const { fromPeriod, toPeriod } = notification
    
    const periodNames: Record<string, string> = {
      'H1': 'First Half',
      'HT': 'Half Time',
      'H2': 'Second Half',
      'FT': 'Full Time',
      'ET1': 'First Extra Time',
      'ET2': 'Second Extra Time',
      'AET': 'After Extra Time',
      'PEN': 'Penalties'
    }

    const fromName = periodNames[fromPeriod] || fromPeriod
    const toName = periodNames[toPeriod] || toPeriod

    if (notification.duration) {
      const minutes = Math.floor(notification.duration / 60000)
      return `Transition from ${fromName} to ${toName} (${minutes} minutes elapsed)`
    }

    return `Transition from ${fromName} to ${toName}`
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (error) {
      console.warn('Audio context not supported:', error)
    }
  }

  private async loadNotificationSounds(): Promise<void> {
    if (!this.audioContext) {
      return
    }

    const soundUrls: Record<string, string> = {
      'notification': '/sounds/notification.mp3',
      'period-transition': '/sounds/period-transition.mp3',
      'timer-start': '/sounds/timer-start.mp3',
      'stoppage-added': '/sounds/stoppage-added.mp3',
      'injury-time': '/sounds/injury-time.mp3',
      'error': '/sounds/error.mp3'
    }

    for (const [soundId, url] of Object.entries(soundUrls)) {
      try {
        const response = await fetch(url)
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
          this.sounds.set(soundId, audioBuffer)
        }
      } catch (error) {
        console.warn(`Failed to load sound ${soundId}:`, error)
      }
    }
  }

  private async requestNotificationPermission(): Promise<void> {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      } catch (error) {
        console.warn('Failed to request notification permission:', error)
      }
    }
  }
}

// Export singleton instance
export const timerNotificationService = new TimerNotificationService()
