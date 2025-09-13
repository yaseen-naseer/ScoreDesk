/**
 * User Communication Service
 * Real-time communication system for match sessions
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'
import { EventEmitter } from 'events'

export interface CommunicationMessage {
  id: string
  session_id: string
  sender_id: string
  recipient_id?: string
  thread_id?: string
  message_type: 'text' | 'system' | 'alert' | 'notification' | 'command'
  content: string
  metadata: Record<string, any>
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'sent' | 'delivered' | 'read' | 'failed'
  reply_to_id?: string
  created_at: string
  read_at?: string
  delivered_at?: string
}

export interface MessageThread {
  id: string
  session_id: string
  thread_name: string
  thread_type: 'general' | 'private' | 'group' | 'system'
  created_by: string
  participants: string[]
  is_active: boolean
  created_at: string
  last_message_at?: string
  last_message_id?: string
}

export interface SendMessageRequest {
  sessionId: string
  recipientId?: string
  threadId?: string
  messageType?: 'text' | 'system' | 'alert' | 'notification' | 'command'
  content: string
  metadata?: Record<string, any>
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  replyToId?: string
}

export interface CommunicationStats {
  totalMessages: number
  unreadMessages: number
  activeThreads: number
  messagesToday: number
  averageResponseTime: number
  mostActiveUser: string
  communicationLevel: number
}

export interface TypingIndicator {
  userId: string
  userName: string
  threadId?: string
  isTyping: boolean
  timestamp: number
}

class UserCommunicationService extends EventEmitter {
  private supabase = createClientComponentClient<Database>()
  private communicationChannels = new Map<string, any>()
  private typingIndicators = new Map<string, TypingIndicator>()
  private readonly TYPING_TIMEOUT = 3000 // 3 seconds
  private readonly MAX_MESSAGE_LENGTH = 2000

  /**
   * Start communication for a session
   */
  async startCommunication(sessionId: string, userId: string): Promise<void> {
    try {
      // Setup real-time communication channel
      await this.setupCommunicationChannel(sessionId, userId)

      // Create or join general thread
      await this.ensureGeneralThread(sessionId, userId)

      console.log(`Started communication for user ${userId} in session ${sessionId}`)
    } catch (error) {
      console.error('Error starting communication:', error)
    }
  }

  /**
   * Stop communication for a session
   */
  async stopCommunication(sessionId: string, userId: string): Promise<void> {
    try {
      // Unsubscribe from channel
      const channelKey = `${sessionId}-${userId}`
      const channel = this.communicationChannels.get(channelKey)
      if (channel) {
        await this.supabase.removeChannel(channel)
        this.communicationChannels.delete(channelKey)
      }

      // Clear typing indicators
      this.clearTypingIndicators(userId)

      console.log(`Stopped communication for user ${userId} in session ${sessionId}`)
    } catch (error) {
      console.error('Error stopping communication:', error)
    }
  }

  /**
   * Send a message
   */
  async sendMessage(
    request: SendMessageRequest,
    senderId: string
  ): Promise<{ success: boolean; message?: CommunicationMessage; error?: string }> {
    try {
      // Validate message
      if (!request.content.trim()) {
        return { success: false, error: 'Message content cannot be empty' }
      }

      if (request.content.length > this.MAX_MESSAGE_LENGTH) {
        return { success: false, error: 'Message too long' }
      }

      // Check if user is in session
      const isParticipant = await this.checkSessionParticipation(request.sessionId, senderId)
      if (!isParticipant) {
        return { success: false, error: 'User is not a participant in this session' }
      }

      // Create message
      const messageData = {
        session_id: request.sessionId,
        sender_id: senderId,
        recipient_id: request.recipientId || null,
        thread_id: request.threadId || null,
        message_type: request.messageType || 'text',
        content: request.content.trim(),
        metadata: request.metadata || {},
        priority: request.priority || 'normal',
        reply_to_id: request.replyToId || null,
        status: 'sent'
      }

      const { data: message, error } = await this.supabase
        .from('session_communications')
        .insert(messageData)
        .select()
        .single()

      if (error) {
        console.error('Error sending message:', error)
        return { success: false, error: error.message }
      }

      // Update thread last message
      if (request.threadId) {
        await this.updateThreadLastMessage(request.threadId, message.id)
      }

      // Broadcast message to other users
      await this.broadcastMessage(request.sessionId, message)

      // Clear typing indicator
      this.clearTypingIndicator(senderId, request.threadId)

      // Emit local event
      this.emit('messageSent', message)

      return { success: true, message }
    } catch (error) {
      console.error('Error in sendMessage:', error)
      return { success: false, error: 'Failed to send message' }
    }
  }

  /**
   * Get messages for a session
   */
  async getSessionMessages(
    sessionId: string,
    threadId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<CommunicationMessage[]> {
    try {
      let query = this.supabase
        .from('session_communications')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (threadId) {
        query = query.eq('thread_id', threadId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error getting session messages:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getSessionMessages:', error)
      return []
    }
  }

  /**
   * Get unread messages for a user
   */
  async getUnreadMessages(
    sessionId: string,
    userId: string
  ): Promise<CommunicationMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('session_communications')
        .select('*')
        .eq('session_id', sessionId)
        .or(`recipient_id.eq.${userId},recipient_id.is.null`)
        .neq('sender_id', userId)
        .neq('status', 'read')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error getting unread messages:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getUnreadMessages:', error)
      return []
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(
    messageId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('session_communications')
        .update({
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('recipient_id', userId)

      if (error) {
        console.error('Error marking message as read:', error)
        return { success: false, error: error.message }
      }

      // Emit event
      this.emit('messageRead', { messageId, userId })

      return { success: true }
    } catch (error) {
      console.error('Error in markMessageAsRead:', error)
      return { success: false, error: 'Failed to mark message as read' }
    }
  }

  /**
   * Mark all messages as read for a thread
   */
  async markThreadAsRead(
    threadId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('session_communications')
        .update({
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('thread_id', threadId)
        .eq('recipient_id', userId)
        .neq('status', 'read')

      if (error) {
        console.error('Error marking thread as read:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in markThreadAsRead:', error)
      return { success: false, error: 'Failed to mark thread as read' }
    }
  }

  /**
   * Create a new thread
   */
  async createThread(
    sessionId: string,
    threadName: string,
    threadType: 'general' | 'private' | 'group' | 'system',
    participants: string[],
    createdBy: string
  ): Promise<{ success: boolean; thread?: MessageThread; error?: string }> {
    try {
      // Check if user is in session
      const isParticipant = await this.checkSessionParticipation(sessionId, createdBy)
      if (!isParticipant) {
        return { success: false, error: 'User is not a participant in this session' }
      }

      const threadData = {
        session_id: sessionId,
        thread_name: threadName,
        thread_type: threadType,
        created_by: createdBy,
        participants: [...new Set([createdBy, ...participants])],
        is_active: true
      }

      const { data: thread, error } = await this.supabase
        .from('message_threads')
        .insert(threadData)
        .select()
        .single()

      if (error) {
        console.error('Error creating thread:', error)
        return { success: false, error: error.message }
      }

      // Broadcast thread creation
      await this.broadcastThreadUpdate(sessionId, thread, 'created')

      return { success: true, thread }
    } catch (error) {
      console.error('Error in createThread:', error)
      return { success: false, error: 'Failed to create thread' }
    }
  }

  /**
   * Get threads for a session
   */
  async getSessionThreads(sessionId: string, userId: string): Promise<MessageThread[]> {
    try {
      const { data, error } = await this.supabase
        .from('message_threads')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .or(`thread_type.eq.general,thread_type.eq.system,participants.cs.{${userId}}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (error) {
        console.error('Error getting session threads:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getSessionThreads:', error)
      return []
    }
  }

  /**
   * Update typing indicator
   */
  async updateTypingIndicator(
    sessionId: string,
    userId: string,
    userName: string,
    threadId?: string,
    isTyping: boolean = true
  ): Promise<void> {
    try {
      const indicator: TypingIndicator = {
        userId,
        userName,
        threadId,
        isTyping,
        timestamp: Date.now()
      }

      if (isTyping) {
        this.typingIndicators.set(`${userId}-${threadId || 'global'}`, indicator)
      } else {
        this.typingIndicators.delete(`${userId}-${threadId || 'global'}`)
      }

      // Broadcast typing indicator
      await this.broadcastTypingIndicator(sessionId, indicator)

      // Auto-clear typing indicator after timeout
      if (isTyping) {
        setTimeout(() => {
          this.clearTypingIndicator(userId, threadId)
        }, this.TYPING_TIMEOUT)
      }
    } catch (error) {
      console.error('Error updating typing indicator:', error)
    }
  }

  /**
   * Get typing indicators for a session
   */
  getTypingIndicators(sessionId: string, threadId?: string): TypingIndicator[] {
    const indicators: TypingIndicator[] = []
    
    for (const [key, indicator] of this.typingIndicators.entries()) {
      if (indicator.threadId === threadId || (!threadId && !indicator.threadId)) {
        // Check if indicator is recent
        if (Date.now() - indicator.timestamp < this.TYPING_TIMEOUT) {
          indicators.push(indicator)
        } else {
          this.typingIndicators.delete(key)
        }
      }
    }

    return indicators
  }

  /**
   * Get communication statistics
   */
  async getCommunicationStats(
    sessionId: string,
    userId: string
  ): Promise<CommunicationStats> {
    try {
      // Get total messages
      const { count: totalMessages } = await this.supabase
        .from('session_communications')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)

      // Get unread messages
      const unreadMessages = await this.getUnreadMessages(sessionId, userId)

      // Get active threads
      const { count: activeThreads } = await this.supabase
        .from('message_threads')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('is_active', true)

      // Get messages today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { count: messagesToday } = await this.supabase
        .from('session_communications')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .gte('created_at', today.toISOString())

      // Calculate average response time (placeholder)
      const averageResponseTime = 120 // seconds

      // Calculate most active user (placeholder)
      const mostActiveUser = 'Unknown'

      // Calculate communication level (0-100)
      const communicationLevel = Math.min(
        (totalMessages || 0) / 100 * 100,
        100
      )

      return {
        totalMessages: totalMessages || 0,
        unreadMessages: unreadMessages.length,
        activeThreads: activeThreads || 0,
        messagesToday: messagesToday || 0,
        averageResponseTime,
        mostActiveUser,
        communicationLevel: Math.round(communicationLevel)
      }
    } catch (error) {
      console.error('Error getting communication stats:', error)
      return {
        totalMessages: 0,
        unreadMessages: 0,
        activeThreads: 0,
        messagesToday: 0,
        averageResponseTime: 0,
        mostActiveUser: '',
        communicationLevel: 0
      }
    }
  }

  /**
   * Setup real-time communication channel
   */
  private async setupCommunicationChannel(sessionId: string, userId: string): Promise<void> {
    try {
      const channelKey = `${sessionId}-${userId}`
      const channel = this.supabase.channel(`communications-${channelKey}`)

      // Listen for new messages
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'session_communications',
            filter: `session_id=eq.${sessionId}`
          },
          (payload) => {
            this.emit('newMessage', payload.new)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'session_communications',
            filter: `session_id=eq.${sessionId}`
          },
          (payload) => {
            this.emit('messageUpdated', payload.new)
          }
        )
        .on(
          'presence',
          { event: 'sync' },
          (payload) => {
            this.handlePresenceSync(payload, sessionId)
          }
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Join presence channel
            await channel.track({
              user_id: userId,
              online_at: new Date().toISOString(),
              session_id: sessionId
            })

            this.communicationChannels.set(channelKey, channel)
            console.log(`Communication channel subscribed for session ${sessionId}`)
          }
        })
    } catch (error) {
      console.error('Error setting up communication channel:', error)
    }
  }

  /**
   * Ensure general thread exists
   */
  private async ensureGeneralThread(sessionId: string, userId: string): Promise<void> {
    try {
      const { data: existingThread } = await this.supabase
        .from('message_threads')
        .select('*')
        .eq('session_id', sessionId)
        .eq('thread_type', 'general')
        .eq('is_active', true)
        .single()

      if (!existingThread) {
        // Get all session participants
        const { data: participants } = await this.supabase
          .from('match_session_participants')
          .select('user_id')
          .eq('session_id', sessionId)
          .eq('is_active', true)

        const participantIds = participants?.map(p => p.user_id) || []

        await this.createThread(
          sessionId,
          'General',
          'general',
          participantIds,
          userId
        )
      }
    } catch (error) {
      console.error('Error ensuring general thread:', error)
    }
  }

  /**
   * Check session participation
   */
  private async checkSessionParticipation(sessionId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('match_session_participants')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      return !error && !!data
    } catch (error) {
      console.error('Error checking session participation:', error)
      return false
    }
  }

  /**
   * Update thread last message
   */
  private async updateThreadLastMessage(threadId: string, messageId: string): Promise<void> {
    try {
      await this.supabase
        .from('message_threads')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_id: messageId
        })
        .eq('id', threadId)
    } catch (error) {
      console.error('Error updating thread last message:', error)
    }
  }

  /**
   * Broadcast message
   */
  private async broadcastMessage(sessionId: string, message: CommunicationMessage): Promise<void> {
    try {
      // Broadcast to all channels in the session
      for (const [key, channel] of this.communicationChannels.entries()) {
        if (key.startsWith(`${sessionId}-`)) {
          await channel.track({
            message_id: message.id,
            message_type: 'new_message',
            timestamp: Date.now()
          })
        }
      }
    } catch (error) {
      console.error('Error broadcasting message:', error)
    }
  }

  /**
   * Broadcast thread update
   */
  private async broadcastThreadUpdate(
    sessionId: string,
    thread: MessageThread,
    action: string
  ): Promise<void> {
    try {
      // Broadcast to all channels in the session
      for (const [key, channel] of this.communicationChannels.entries()) {
        if (key.startsWith(`${sessionId}-`)) {
          await channel.track({
            thread_id: thread.id,
            action,
            timestamp: Date.now()
          })
        }
      }
    } catch (error) {
      console.error('Error broadcasting thread update:', error)
    }
  }

  /**
   * Broadcast typing indicator
   */
  private async broadcastTypingIndicator(
    sessionId: string,
    indicator: TypingIndicator
  ): Promise<void> {
    try {
      // Broadcast to all channels in the session
      for (const [key, channel] of this.communicationChannels.entries()) {
        if (key.startsWith(`${sessionId}-`)) {
          await channel.track({
            typing_user_id: indicator.userId,
            typing_user_name: indicator.userName,
            thread_id: indicator.threadId,
            is_typing: indicator.isTyping,
            timestamp: indicator.timestamp
          })
        }
      }
    } catch (error) {
      console.error('Error broadcasting typing indicator:', error)
    }
  }

  /**
   * Handle presence sync
   */
  private handlePresenceSync(payload: any, sessionId: string): void {
    try {
      const presences = payload.presences || {}
      
      Object.entries(presences).forEach(([key, presence]: [string, any]) => {
        if (presence.user_id && presence.session_id === sessionId) {
          this.emit('userPresenceUpdate', {
            sessionId,
            userId: presence.user_id,
            isOnline: true,
            lastSeen: presence.online_at
          })
        }
      })
    } catch (error) {
      console.error('Error handling presence sync:', error)
    }
  }

  /**
   * Clear typing indicator
   */
  private clearTypingIndicator(userId: string, threadId?: string): void {
    const key = `${userId}-${threadId || 'global'}`
    this.typingIndicators.delete(key)
  }

  /**
   * Clear all typing indicators for a user
   */
  private clearTypingIndicators(userId: string): void {
    for (const [key] of this.typingIndicators.entries()) {
      if (key.startsWith(`${userId}-`)) {
        this.typingIndicators.delete(key)
      }
    }
  }
}

// Export singleton instance
export const userCommunicationService = new UserCommunicationService()

// Export types
export type {
  CommunicationMessage,
  MessageThread,
  SendMessageRequest,
  CommunicationStats,
  TypingIndicator
}
