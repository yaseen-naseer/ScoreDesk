import { supabase } from '@/lib/supabase/client';
import { EventType } from '@/lib/types/entities';

export interface ApprovalRequest {
  id: string;
  event_id: string;
  event_type: EventType;
  requested_by: string;
  request_reason: string;
  request_timestamp: Date;
  approval_status: 'pending' | 'approved' | 'rejected' | 'escalated';
  approved_by?: string;
  approval_timestamp?: Date;
  approval_notes?: string;
  escalated_to?: string;
  escalation_timestamp?: Date;
  escalation_reason?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dispute_type: 'accuracy' | 'timing' | 'player' | 'team' | 'other';
  stakeholders: string[];
  event_snapshot: Record<string, any>;
  audit_trail: string[];
}

export interface ApprovalWorkflowRule {
  eventType: EventType;
  autoApprove: boolean;
  requiresApproval: boolean;
  approverRoles: string[];
  escalationRoles: string[];
  timeLimit: number; // Minutes
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ApprovalResult {
  success: boolean;
  requestId?: string;
  requiresApproval: boolean;
  message: string;
  errors?: string[];
}

export class EventApprovalWorkflowService {
  private static instance: EventApprovalWorkflowService;

  // Define approval rules for different event types
  private readonly approvalRules: Record<EventType, ApprovalWorkflowRule> = {
    [EventType.GOAL]: {
      eventType: EventType.GOAL,
      autoApprove: false,
      requiresApproval: true,
      approverRoles: ['admin', 'referee'],
      escalationRoles: ['admin'],
      timeLimit: 10,
      priority: 'critical'
    },
    [EventType.OWN_GOAL]: {
      eventType: EventType.OWN_GOAL,
      autoApprove: false,
      requiresApproval: true,
      approverRoles: ['admin', 'referee'],
      escalationRoles: ['admin'],
      timeLimit: 10,
      priority: 'critical'
    },
    [EventType.PENALTY_GOAL]: {
      eventType: EventType.PENALTY_GOAL,
      autoApprove: false,
      requiresApproval: true,
      approverRoles: ['admin', 'referee'],
      escalationRoles: ['admin'],
      timeLimit: 15,
      priority: 'high'
    },
    [EventType.RED_CARD]: {
      eventType: EventType.RED_CARD,
      autoApprove: false,
      requiresApproval: true,
      approverRoles: ['admin', 'referee'],
      escalationRoles: ['admin'],
      timeLimit: 15,
      priority: 'high'
    },
    [EventType.YELLOW_CARD]: {
      eventType: EventType.YELLOW_CARD,
      autoApprove: true,
      requiresApproval: false,
      approverRoles: ['admin', 'referee', 'scorer'],
      escalationRoles: ['admin', 'referee'],
      timeLimit: 30,
      priority: 'medium'
    },
    [EventType.SUBSTITUTION]: {
      eventType: EventType.SUBSTITUTION,
      autoApprove: true,
      requiresApproval: false,
      approverRoles: ['admin', 'referee', 'scorer'],
      escalationRoles: ['admin', 'referee'],
      timeLimit: 45,
      priority: 'low'
    },
    [EventType.FOUL]: {
      eventType: EventType.FOUL,
      autoApprove: true,
      requiresApproval: false,
      approverRoles: ['admin', 'referee', 'scorer'],
      escalationRoles: ['admin', 'referee'],
      timeLimit: 30,
      priority: 'medium'
    },
    [EventType.OFFSIDE]: {
      eventType: EventType.OFFSIDE,
      autoApprove: true,
      requiresApproval: false,
      approverRoles: ['admin', 'referee', 'scorer'],
      escalationRoles: ['admin', 'referee'],
      timeLimit: 30,
      priority: 'medium'
    },
    [EventType.CORNER_KICK]: {
      eventType: EventType.CORNER_KICK,
      autoApprove: true,
      requiresApproval: false,
      approverRoles: ['admin', 'referee', 'scorer', 'assistant'],
      escalationRoles: ['admin', 'referee'],
      timeLimit: 45,
      priority: 'low'
    },
    [EventType.FREE_KICK]: {
      eventType: EventType.FREE_KICK,
      autoApprove: true,
      requiresApproval: false,
      approverRoles: ['admin', 'referee', 'scorer'],
      escalationRoles: ['admin', 'referee'],
      timeLimit: 30,
      priority: 'medium'
    },
    [EventType.THROW_IN]: {
      eventType: EventType.THROW_IN,
      autoApprove: true,
      requiresApproval: false,
      approverRoles: ['admin', 'referee', 'scorer', 'assistant'],
      escalationRoles: ['admin', 'referee'],
      timeLimit: 45,
      priority: 'low'
    },
    [EventType.GOAL_KICK]: {
      eventType: EventType.GOAL_KICK,
      autoApprove: true,
      requiresApproval: false,
      approverRoles: ['admin', 'referee', 'scorer', 'assistant'],
      escalationRoles: ['admin', 'referee'],
      timeLimit: 45,
      priority: 'low'
    }
  };

  private constructor() {}

  public static getInstance(): EventApprovalWorkflowService {
    if (!EventApprovalWorkflowService.instance) {
      EventApprovalWorkflowService.instance = new EventApprovalWorkflowService();
    }
    return EventApprovalWorkflowService.instance;
  }

  // Create approval request for disputed event
  public async createApprovalRequest(
    eventId: string,
    requestedBy: string,
    requestReason: string,
    disputeType: ApprovalRequest['dispute_type'],
    stakeholders: string[] = []
  ): Promise<ApprovalResult> {
    try {
      // Get the event
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

      const rule = this.approvalRules[event.event_type];
      
      // Check if approval is required
      if (!rule.requiresApproval) {
        return {
          success: false,
          message: 'This event type does not require approval',
          requiresApproval: false
        };
      }

      // Create approval request
      const { data: approvalRequest, error } = await supabase
        .from('event_approval_requests')
        .insert({
          event_id: eventId,
          event_type: event.event_type,
          requested_by: requestedBy,
          request_reason: requestReason,
          request_timestamp: new Date().toISOString(),
          approval_status: 'pending',
          priority: rule.priority,
          dispute_type: disputeType,
          stakeholders,
          event_snapshot: event,
          audit_trail: [`Approval request created by ${requestedBy} at ${new Date().toISOString()}`]
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Notify approvers
      await this.notifyApprovers(approvalRequest, rule);

      return {
        success: true,
        requestId: approvalRequest.id,
        requiresApproval: true,
        message: 'Approval request created successfully'
      };

    } catch (error) {
      console.error('Error creating approval request:', error);
      return {
        success: false,
        message: 'Failed to create approval request',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Approve an event
  public async approveEvent(
    requestId: string,
    approverId: string,
    approvalNotes?: string
  ): Promise<ApprovalResult> {
    try {
      // Get the approval request
      const { data: request, error: fetchError } = await supabase
        .from('event_approval_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        return {
          success: false,
          message: 'Approval request not found'
        };
      }

      if (request.approval_status !== 'pending') {
        return {
          success: false,
          message: 'Request is not pending approval'
        };
      }

      // Update the approval request
      const { error: updateError } = await supabase
        .from('event_approval_requests')
        .update({
          approval_status: 'approved',
          approved_by: approverId,
          approval_timestamp: new Date().toISOString(),
          approval_notes: approvalNotes,
          audit_trail: [
            ...request.audit_trail,
            `Approved by ${approverId} at ${new Date().toISOString()}${approvalNotes ? ` - ${approvalNotes}` : ''}`
          ]
        })
        .eq('id', requestId);

      if (updateError) {
        throw updateError;
      }

      // Mark the event as approved
      await supabase
        .from('match_events')
        .update({
          metadata: {
            ...request.event_snapshot.metadata,
            approved: true,
            approved_by: approverId,
            approved_at: new Date().toISOString()
          }
        })
        .eq('id', request.event_id);

      // Notify stakeholders
      await this.notifyStakeholders(request, 'approved');

      return {
        success: true,
        message: 'Event approved successfully'
      };

    } catch (error) {
      console.error('Error approving event:', error);
      return {
        success: false,
        message: 'Failed to approve event',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Reject an event
  public async rejectEvent(
    requestId: string,
    approverId: string,
    rejectionReason: string
  ): Promise<ApprovalResult> {
    try {
      // Get the approval request
      const { data: request, error: fetchError } = await supabase
        .from('event_approval_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        return {
          success: false,
          message: 'Approval request not found'
        };
      }

      if (request.approval_status !== 'pending') {
        return {
          success: false,
          message: 'Request is not pending approval'
        };
      }

      // Update the approval request
      const { error: updateError } = await supabase
        .from('event_approval_requests')
        .update({
          approval_status: 'rejected',
          approved_by: approverId,
          approval_timestamp: new Date().toISOString(),
          approval_notes: rejectionReason,
          audit_trail: [
            ...request.audit_trail,
            `Rejected by ${approverId} at ${new Date().toISOString()} - ${rejectionReason}`
          ]
        })
        .eq('id', requestId);

      if (updateError) {
        throw updateError;
      }

      // Notify stakeholders
      await this.notifyStakeholders(request, 'rejected');

      return {
        success: true,
        message: 'Event rejected successfully'
      };

    } catch (error) {
      console.error('Error rejecting event:', error);
      return {
        success: false,
        message: 'Failed to reject event',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Escalate approval request
  public async escalateRequest(
    requestId: string,
    escalatedBy: string,
    escalationReason: string
  ): Promise<ApprovalResult> {
    try {
      // Get the approval request
      const { data: request, error: fetchError } = await supabase
        .from('event_approval_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        return {
          success: false,
          message: 'Approval request not found'
        };
      }

      if (request.approval_status !== 'pending') {
        return {
          success: false,
          message: 'Request is not pending approval'
        };
      }

      const rule = this.approvalRules[request.event_type];

      // Update the approval request
      const { error: updateError } = await supabase
        .from('event_approval_requests')
        .update({
          approval_status: 'escalated',
          escalated_to: rule.escalationRoles.join(','),
          escalation_timestamp: new Date().toISOString(),
          escalation_reason: escalationReason,
          priority: 'critical', // Escalated requests are always critical
          audit_trail: [
            ...request.audit_trail,
            `Escalated by ${escalatedBy} at ${new Date().toISOString()} - ${escalationReason}`
          ]
        })
        .eq('id', requestId);

      if (updateError) {
        throw updateError;
      }

      // Notify escalation approvers
      await this.notifyEscalationApprovers(request, rule);

      return {
        success: true,
        message: 'Request escalated successfully'
      };

    } catch (error) {
      console.error('Error escalating request:', error);
      return {
        success: false,
        message: 'Failed to escalate request',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Get pending approval requests
  public async getPendingApprovals(userId?: string): Promise<ApprovalRequest[]> {
    try {
      let query = supabase
        .from('event_approval_requests')
        .select('*')
        .eq('approval_status', 'pending')
        .order('request_timestamp', { ascending: true });

      if (userId) {
        // Filter by user's approval capabilities
        query = query.or('requested_by.eq.' + userId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return [];
    }
  }

  // Get approval history
  public async getApprovalHistory(eventId?: string): Promise<ApprovalRequest[]> {
    try {
      let query = supabase
        .from('event_approval_requests')
        .select('*')
        .order('request_timestamp', { ascending: false });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      console.error('Error fetching approval history:', error);
      return [];
    }
  }

  // Get approval statistics
  public async getApprovalStatistics(): Promise<{
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    escalatedRequests: number;
    averageApprovalTime: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('event_approval_requests')
        .select('*');

      if (error) {
        throw error;
      }

      const requests = data || [];
      const totalRequests = requests.length;
      const pendingRequests = requests.filter(r => r.approval_status === 'pending').length;
      const approvedRequests = requests.filter(r => r.approval_status === 'approved').length;
      const rejectedRequests = requests.filter(r => r.approval_status === 'rejected').length;
      const escalatedRequests = requests.filter(r => r.approval_status === 'escalated').length;

      // Calculate average approval time
      const approvedRequestsWithTime = requests.filter(r => 
        r.approval_status === 'approved' && 
        r.approval_timestamp
      );

      const averageApprovalTime = approvedRequestsWithTime.length > 0
        ? approvedRequestsWithTime.reduce((sum, request) => {
            const requestTime = new Date(request.request_timestamp).getTime();
            const approvalTime = new Date(request.approval_timestamp).getTime();
            return sum + (approvalTime - requestTime);
          }, 0) / approvedRequestsWithTime.length / (1000 * 60) // Convert to minutes
        : 0;

      return {
        totalRequests,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        escalatedRequests,
        averageApprovalTime
      };

    } catch (error) {
      console.error('Error fetching approval statistics:', error);
      return {
        totalRequests: 0,
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        escalatedRequests: 0,
        averageApprovalTime: 0
      };
    }
  }

  // Check if event requires approval
  public requiresApproval(eventType: EventType): boolean {
    return this.approvalRules[eventType]?.requiresApproval || false;
  }

  // Get approval rule for event type
  public getApprovalRule(eventType: EventType): ApprovalWorkflowRule | null {
    return this.approvalRules[eventType] || null;
  }

  // Private helper methods
  private async notifyApprovers(request: ApprovalRequest, rule: ApprovalWorkflowRule): Promise<void> {
    try {
      // Implementation would depend on your notification system
      console.log(`Notifying approvers for request ${request.id}`);
    } catch (error) {
      console.error('Error notifying approvers:', error);
    }
  }

  private async notifyEscalationApprovers(request: ApprovalRequest, rule: ApprovalWorkflowRule): Promise<void> {
    try {
      // Implementation would depend on your notification system
      console.log(`Notifying escalation approvers for request ${request.id}`);
    } catch (error) {
      console.error('Error notifying escalation approvers:', error);
    }
  }

  private async notifyStakeholders(request: ApprovalRequest, action: string): Promise<void> {
    try {
      // Implementation would depend on your notification system
      console.log(`Notifying stakeholders about ${action} for request ${request.id}`);
    } catch (error) {
      console.error('Error notifying stakeholders:', error);
    }
  }
}

// Export singleton instance
export const eventApprovalWorkflowService = EventApprovalWorkflowService.getInstance();
