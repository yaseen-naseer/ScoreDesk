import { supabase } from '@/lib/supabase/client';
import { EventType } from '@/lib/types/entities';
import { 
  eventAuthorizationService, 
  UserRole, 
  EventDeletionContext 
} from './event-authorization-service';

export interface DeletionLog {
  id: string;
  event_id: string;
  deleted_by: string;
  deletion_reason: string;
  deletion_timestamp: Date;
  event_snapshot: Record<string, any>;
  requires_approval: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approval_timestamp?: Date;
  approval_notes?: string;
  audit_trail: string[];
}

export interface DeletionResult {
  success: boolean;
  deletionId?: string;
  requiresApproval: boolean;
  message: string;
  errors?: string[];
}

export class EventDeletionService {
  private static instance: EventDeletionService;

  private constructor() {}

  public static getInstance(): EventDeletionService {
    if (!EventDeletionService.instance) {
      EventDeletionService.instance = new EventDeletionService();
    }
    return EventDeletionService.instance;
  }

  // Main deletion method
  public async deleteEvent(
    eventId: string,
    userId: string,
    userRole: UserRole,
    reason: string,
    matchStatus: string
  ): Promise<DeletionResult> {
    try {
      // Get the event first
      const { data: event, error: fetchError } = await supabase
        .from('match_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (fetchError || !event) {
        return {
          success: false,
          message: 'Event not found',
          errors: [fetchError?.message || 'Event not found']
        };
      }

      // Check authorization
      const context: EventDeletionContext = {
        eventId,
        eventType: event.event_type,
        eventMinute: event.minute,
        eventCreatedAt: new Date(event.created_at),
        matchId: event.match_id,
        matchStatus: matchStatus as any,
        userId,
        userRole
      };

      const permission = eventAuthorizationService.checkDeletionPermission(context);
      
      if (!permission.canDelete) {
        return {
          success: false,
          message: permission.reason || 'Deletion not allowed',
          errors: [permission.reason || 'Insufficient permissions']
        };
      }

      // Create event snapshot for audit trail
      const eventSnapshot = { ...event };

      // If deletion requires approval, create pending deletion record
      if (permission.requiresApproval) {
        return await this.createPendingDeletion(event, userId, reason, eventSnapshot);
      }

      // Proceed with immediate deletion
      return await this.performImmediateDeletion(event, userId, reason, eventSnapshot);

    } catch (error) {
      console.error('Error deleting event:', error);
      return {
        success: false,
        message: 'Failed to delete event',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Create pending deletion for approval
  private async createPendingDeletion(
    event: any,
    userId: string,
    reason: string,
    eventSnapshot: Record<string, any>
  ): Promise<DeletionResult> {
    try {
      const { data: deletionRecord, error } = await supabase
        .from('event_deletion_logs')
        .insert({
          event_id: event.id,
          deleted_by: userId,
          deletion_reason: reason,
          deletion_timestamp: new Date().toISOString(),
          event_snapshot: eventSnapshot,
          requires_approval: true,
          approval_status: 'pending',
          audit_trail: [`Deletion requested by ${userId} at ${new Date().toISOString()}`]
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Notify approvers
      await this.notifyApprovers(event, userId, reason, deletionRecord.id);

      return {
        success: true,
        deletionId: deletionRecord.id,
        requiresApproval: true,
        message: 'Deletion request submitted for approval'
      };

    } catch (error) {
      console.error('Error creating pending deletion:', error);
      return {
        success: false,
        message: 'Failed to create deletion request',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Perform immediate deletion
  private async performImmediateDeletion(
    event: any,
    userId: string,
    reason: string,
    eventSnapshot: Record<string, any>
  ): Promise<DeletionResult> {
    try {
      // Start transaction
      const { data: deletionRecord, error: logError } = await supabase
        .from('event_deletion_logs')
        .insert({
          event_id: event.id,
          deleted_by: userId,
          deletion_reason: reason,
          deletion_timestamp: new Date().toISOString(),
          event_snapshot: eventSnapshot,
          requires_approval: false,
          approval_status: 'approved',
          audit_trail: [`Event deleted by ${userId} at ${new Date().toISOString()}`]
        })
        .select()
        .single();

      if (logError) {
        throw logError;
      }

      // Delete the actual event
      const { error: deleteError } = await supabase
        .from('match_events')
        .delete()
        .eq('id', event.id);

      if (deleteError) {
        throw deleteError;
      }

      // Update match statistics
      await this.updateMatchStatistics(event.match_id, event.event_type, 'delete');

      // Notify stakeholders if it's a critical event
      if (eventAuthorizationService.requiresImmediateNotification(event.event_type)) {
        await this.notifyStakeholders(event, userId, 'deleted', reason);
      }

      return {
        success: true,
        deletionId: deletionRecord.id,
        requiresApproval: false,
        message: 'Event deleted successfully'
      };

    } catch (error) {
      console.error('Error performing immediate deletion:', error);
      return {
        success: false,
        message: 'Failed to delete event',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Approve pending deletion
  public async approveDeletion(
    deletionId: string,
    approverId: string,
    notes?: string
  ): Promise<DeletionResult> {
    try {
      // Get the deletion record
      const { data: deletionRecord, error: fetchError } = await supabase
        .from('event_deletion_logs')
        .select('*')
        .eq('id', deletionId)
        .single();

      if (fetchError || !deletionRecord) {
        return {
          success: false,
          message: 'Deletion record not found'
        };
      }

      if (deletionRecord.approval_status !== 'pending') {
        return {
          success: false,
          message: 'Deletion request is not pending approval'
        };
      }

      // Update approval status
      const { error: updateError } = await supabase
        .from('event_deletion_logs')
        .update({
          approval_status: 'approved',
          approved_by: approverId,
          approval_timestamp: new Date().toISOString(),
          approval_notes: notes,
          audit_trail: [
            ...deletionRecord.audit_trail,
            `Approved by ${approverId} at ${new Date().toISOString()}${notes ? ` - ${notes}` : ''}`
          ]
        })
        .eq('id', deletionId);

      if (updateError) {
        throw updateError;
      }

      // Now delete the actual event
      const { error: deleteError } = await supabase
        .from('match_events')
        .delete()
        .eq('id', deletionRecord.event_id);

      if (deleteError) {
        throw deleteError;
      }

      // Update match statistics
      await this.updateMatchStatistics(
        deletionRecord.event_snapshot.match_id,
        deletionRecord.event_snapshot.event_type,
        'delete'
      );

      // Notify stakeholders
      if (eventAuthorizationService.requiresImmediateNotification(deletionRecord.event_snapshot.event_type)) {
        await this.notifyStakeholders(
          deletionRecord.event_snapshot,
          deletionRecord.deleted_by,
          'approved_deletion',
          deletionRecord.deletion_reason
        );
      }

      return {
        success: true,
        message: 'Deletion approved and event removed'
      };

    } catch (error) {
      console.error('Error approving deletion:', error);
      return {
        success: false,
        message: 'Failed to approve deletion',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Reject pending deletion
  public async rejectDeletion(
    deletionId: string,
    approverId: string,
    notes: string
  ): Promise<DeletionResult> {
    try {
      const { error } = await supabase
        .from('event_deletion_logs')
        .update({
          approval_status: 'rejected',
          approved_by: approverId,
          approval_timestamp: new Date().toISOString(),
          approval_notes: notes,
          audit_trail: [
            `Rejected by ${approverId} at ${new Date().toISOString()} - ${notes}`
          ]
        })
        .eq('id', deletionId);

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: 'Deletion request rejected'
      };

    } catch (error) {
      console.error('Error rejecting deletion:', error);
      return {
        success: false,
        message: 'Failed to reject deletion',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Get pending deletions for approval
  public async getPendingDeletions(): Promise<DeletionLog[]> {
    try {
      const { data, error } = await supabase
        .from('event_deletion_logs')
        .select('*')
        .eq('approval_status', 'pending')
        .order('deletion_timestamp', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      console.error('Error fetching pending deletions:', error);
      return [];
    }
  }

  // Get deletion history
  public async getDeletionHistory(eventId?: string): Promise<DeletionLog[]> {
    try {
      let query = supabase
        .from('event_deletion_logs')
        .select('*')
        .order('deletion_timestamp', { ascending: false });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      console.error('Error fetching deletion history:', error);
      return [];
    }
  }

  // Update match statistics after event deletion
  private async updateMatchStatistics(
    matchId: string,
    eventType: EventType,
    action: 'add' | 'delete'
  ): Promise<void> {
    try {
      // This would update match statistics based on the deleted event
      // Implementation depends on your statistics tracking system
      console.log(`Updating match statistics for match ${matchId}, event ${eventType}, action ${action}`);
    } catch (error) {
      console.error('Error updating match statistics:', error);
    }
  }

  // Notify approvers about pending deletion
  private async notifyApprovers(
    event: any,
    requesterId: string,
    reason: string,
    deletionId: string
  ): Promise<void> {
    try {
      // Implementation would depend on your notification system
      console.log(`Notifying approvers about deletion request ${deletionId}`);
    } catch (error) {
      console.error('Error notifying approvers:', error);
    }
  }

  // Notify stakeholders about event deletion
  private async notifyStakeholders(
    event: any,
    deletedBy: string,
    action: string,
    reason: string
  ): Promise<void> {
    try {
      // Implementation would depend on your notification system
      console.log(`Notifying stakeholders about ${action} for event ${event.id}`);
    } catch (error) {
      console.error('Error notifying stakeholders:', error);
    }
  }

  // Restore deleted event (if within time limit)
  public async restoreEvent(deletionId: string, restoredBy: string): Promise<DeletionResult> {
    try {
      // Get the deletion record
      const { data: deletionRecord, error: fetchError } = await supabase
        .from('event_deletion_logs')
        .select('*')
        .eq('id', deletionId)
        .single();

      if (fetchError || !deletionRecord) {
        return {
          success: false,
          message: 'Deletion record not found'
        };
      }

      // Check if restoration is allowed (within time limit)
      const timeSinceDeletion = Date.now() - new Date(deletionRecord.deletion_timestamp).getTime();
      const restorationTimeLimit = 24 * 60 * 60 * 1000; // 24 hours

      if (timeSinceDeletion > restorationTimeLimit) {
        return {
          success: false,
          message: 'Event cannot be restored after 24 hours'
        };
      }

      // Restore the event
      const { data: restoredEvent, error: restoreError } = await supabase
        .from('match_events')
        .insert({
          ...deletionRecord.event_snapshot,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (restoreError) {
        throw restoreError;
      }

      // Update deletion record
      await supabase
        .from('event_deletion_logs')
        .update({
          audit_trail: [
            ...deletionRecord.audit_trail,
            `Event restored by ${restoredBy} at ${new Date().toISOString()}`
          ]
        })
        .eq('id', deletionId);

      return {
        success: true,
        message: 'Event restored successfully'
      };

    } catch (error) {
      console.error('Error restoring event:', error);
      return {
        success: false,
        message: 'Failed to restore event',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}

// Export singleton instance
export const eventDeletionService = EventDeletionService.getInstance();
