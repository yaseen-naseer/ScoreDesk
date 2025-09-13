import { supabase } from '@/lib/supabase/client';
import { EventType } from '@/lib/types/entities';

export interface EventHistoryEntry {
  id: string;
  event_id: string;
  action: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'disputed';
  changed_by: string;
  change_timestamp: Date;
  change_description: string;
  previous_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changed_fields: string[];
  change_reason?: string;
  metadata?: Record<string, any>;
  audit_trail: string[];
}

export interface EventHistoryFilter {
  eventId?: string;
  action?: EventHistoryEntry['action'];
  changedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  eventType?: EventType;
}

export interface EventHistoryStatistics {
  totalChanges: number;
  changesByAction: Record<string, number>;
  changesByUser: Record<string, number>;
  changesByEventType: Record<string, number>;
  recentChanges: EventHistoryEntry[];
  mostActiveUsers: Array<{ userId: string; changeCount: number }>;
}

export class EventHistoryService {
  private static instance: EventHistoryService;

  private constructor() {}

  public static getInstance(): EventHistoryService {
    if (!EventHistoryService.instance) {
      EventHistoryService.instance = new EventHistoryService();
    }
    return EventHistoryService.instance;
  }

  // Log event creation
  public async logEventCreation(
    eventId: string,
    eventData: Record<string, any>,
    createdBy: string,
    reason?: string
  ): Promise<void> {
    try {
      await supabase
        .from('event_history')
        .insert({
          event_id: eventId,
          action: 'created',
          changed_by: createdBy,
          change_timestamp: new Date().toISOString(),
          change_description: `Event created: ${eventData.event_type}`,
          new_values: eventData,
          changed_fields: Object.keys(eventData),
          change_reason: reason,
          audit_trail: [`Event created by ${createdBy} at ${new Date().toISOString()}`]
        });

      console.log(`Event creation logged for event ${eventId}`);
    } catch (error) {
      console.error('Error logging event creation:', error);
    }
  }

  // Log event update
  public async logEventUpdate(
    eventId: string,
    previousData: Record<string, any>,
    newData: Record<string, any>,
    updatedBy: string,
    reason?: string
  ): Promise<void> {
    try {
      const changedFields = this.getChangedFields(previousData, newData);
      
      if (changedFields.length === 0) {
        return; // No changes to log
      }

      const changeDescription = this.generateChangeDescription(changedFields, previousData, newData);

      await supabase
        .from('event_history')
        .insert({
          event_id: eventId,
          action: 'updated',
          changed_by: updatedBy,
          change_timestamp: new Date().toISOString(),
          change_description: changeDescription,
          previous_values: previousData,
          new_values: newData,
          changed_fields: changedFields,
          change_reason: reason,
          audit_trail: [`Event updated by ${updatedBy} at ${new Date().toISOString()}`]
        });

      console.log(`Event update logged for event ${eventId}`);
    } catch (error) {
      console.error('Error logging event update:', error);
    }
  }

  // Log event deletion
  public async logEventDeletion(
    eventId: string,
    eventData: Record<string, any>,
    deletedBy: string,
    reason: string
  ): Promise<void> {
    try {
      await supabase
        .from('event_history')
        .insert({
          event_id: eventId,
          action: 'deleted',
          changed_by: deletedBy,
          change_timestamp: new Date().toISOString(),
          change_description: `Event deleted: ${eventData.event_type}`,
          previous_values: eventData,
          changed_fields: ['deleted'],
          change_reason: reason,
          audit_trail: [`Event deleted by ${deletedBy} at ${new Date().toISOString()} - ${reason}`]
        });

      console.log(`Event deletion logged for event ${eventId}`);
    } catch (error) {
      console.error('Error logging event deletion:', error);
    }
  }

  // Log event approval
  public async logEventApproval(
    eventId: string,
    approvedBy: string,
    approvalNotes?: string
  ): Promise<void> {
    try {
      await supabase
        .from('event_history')
        .insert({
          event_id: eventId,
          action: 'approved',
          changed_by: approvedBy,
          change_timestamp: new Date().toISOString(),
          change_description: 'Event approved',
          changed_fields: ['approval_status'],
          change_reason: approvalNotes,
          metadata: {
            approval_notes: approvalNotes
          },
          audit_trail: [`Event approved by ${approvedBy} at ${new Date().toISOString()}`]
        });

      console.log(`Event approval logged for event ${eventId}`);
    } catch (error) {
      console.error('Error logging event approval:', error);
    }
  }

  // Log event rejection
  public async logEventRejection(
    eventId: string,
    rejectedBy: string,
    rejectionReason: string
  ): Promise<void> {
    try {
      await supabase
        .from('event_history')
        .insert({
          event_id: eventId,
          action: 'rejected',
          changed_by: rejectedBy,
          change_timestamp: new Date().toISOString(),
          change_description: 'Event rejected',
          changed_fields: ['approval_status'],
          change_reason: rejectionReason,
          metadata: {
            rejection_reason: rejectionReason
          },
          audit_trail: [`Event rejected by ${rejectedBy} at ${new Date().toISOString()} - ${rejectionReason}`]
        });

      console.log(`Event rejection logged for event ${eventId}`);
    } catch (error) {
      console.error('Error logging event rejection:', error);
    }
  }

  // Log event dispute
  public async logEventDispute(
    eventId: string,
    disputedBy: string,
    disputeReason: string,
    disputeType: string
  ): Promise<void> {
    try {
      await supabase
        .from('event_history')
        .insert({
          event_id: eventId,
          action: 'disputed',
          changed_by: disputedBy,
          change_timestamp: new Date().toISOString(),
          change_description: `Event disputed: ${disputeType}`,
          changed_fields: ['dispute_status'],
          change_reason: disputeReason,
          metadata: {
            dispute_type: disputeType,
            dispute_reason: disputeReason
          },
          audit_trail: [`Event disputed by ${disputedBy} at ${new Date().toISOString()} - ${disputeReason}`]
        });

      console.log(`Event dispute logged for event ${eventId}`);
    } catch (error) {
      console.error('Error logging event dispute:', error);
    }
  }

  // Get event history
  public async getEventHistory(
    eventId: string,
    limit: number = 50
  ): Promise<EventHistoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from('event_history')
        .select('*')
        .eq('event_id', eventId)
        .order('change_timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      console.error('Error fetching event history:', error);
      return [];
    }
  }

  // Get filtered history
  public async getFilteredHistory(
    filter: EventHistoryFilter,
    limit: number = 100
  ): Promise<EventHistoryEntry[]> {
    try {
      let query = supabase
        .from('event_history')
        .select('*')
        .order('change_timestamp', { ascending: false })
        .limit(limit);

      if (filter.eventId) {
        query = query.eq('event_id', filter.eventId);
      }

      if (filter.action) {
        query = query.eq('action', filter.action);
      }

      if (filter.changedBy) {
        query = query.eq('changed_by', filter.changedBy);
      }

      if (filter.dateFrom) {
        query = query.gte('change_timestamp', filter.dateFrom.toISOString());
      }

      if (filter.dateTo) {
        query = query.lte('change_timestamp', filter.dateTo.toISOString());
      }

      if (filter.eventType) {
        query = query.contains('new_values', { event_type: filter.eventType });
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      console.error('Error fetching filtered history:', error);
      return [];
    }
  }

  // Get history statistics
  public async getHistoryStatistics(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<EventHistoryStatistics> {
    try {
      let query = supabase
        .from('event_history')
        .select('*');

      if (dateFrom) {
        query = query.gte('change_timestamp', dateFrom.toISOString());
      }

      if (dateTo) {
        query = query.lte('change_timestamp', dateTo.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const history = data || [];
      
      // Calculate statistics
      const changesByAction: Record<string, number> = {};
      const changesByUser: Record<string, number> = {};
      const changesByEventType: Record<string, number> = {};
      const userChangeCounts: Record<string, number> = {};

      history.forEach(entry => {
        // Count by action
        changesByAction[entry.action] = (changesByAction[entry.action] || 0) + 1;
        
        // Count by user
        changesByUser[entry.changed_by] = (changesByUser[entry.changed_by] || 0) + 1;
        userChangeCounts[entry.changed_by] = (userChangeCounts[entry.changed_by] || 0) + 1;

        // Count by event type
        const eventType = entry.new_values?.event_type || entry.previous_values?.event_type;
        if (eventType) {
          changesByEventType[eventType] = (changesByEventType[eventType] || 0) + 1;
        }
      });

      // Get most active users
      const mostActiveUsers = Object.entries(userChangeCounts)
        .map(([userId, changeCount]) => ({ userId, changeCount }))
        .sort((a, b) => b.changeCount - a.changeCount)
        .slice(0, 10);

      // Get recent changes
      const recentChanges = history
        .sort((a, b) => new Date(b.change_timestamp).getTime() - new Date(a.change_timestamp).getTime())
        .slice(0, 10);

      return {
        totalChanges: history.length,
        changesByAction,
        changesByUser,
        changesByEventType,
        recentChanges,
        mostActiveUsers
      };

    } catch (error) {
      console.error('Error fetching history statistics:', error);
      return {
        totalChanges: 0,
        changesByAction: {},
        changesByUser: {},
        changesByEventType: {},
        recentChanges: [],
        mostActiveUsers: []
      };
    }
  }

  // Get change summary for an event
  public async getEventChangeSummary(eventId: string): Promise<{
    totalChanges: number;
    lastModified: Date | null;
    lastModifiedBy: string | null;
    changeTypes: string[];
  }> {
    try {
      const { data, error } = await supabase
        .from('event_history')
        .select('*')
        .eq('event_id', eventId)
        .order('change_timestamp', { ascending: false });

      if (error) {
        throw error;
      }

      const history = data || [];

      if (history.length === 0) {
        return {
          totalChanges: 0,
          lastModified: null,
          lastModifiedBy: null,
          changeTypes: []
        };
      }

      const changeTypes = [...new Set(history.map(h => h.action))];
      const lastChange = history[0];

      return {
        totalChanges: history.length,
        lastModified: new Date(lastChange.change_timestamp),
        lastModifiedBy: lastChange.changed_by,
        changeTypes
      };

    } catch (error) {
      console.error('Error fetching event change summary:', error);
      return {
        totalChanges: 0,
        lastModified: null,
        lastModifiedBy: null,
        changeTypes: []
      };
    }
  }

  // Export history to various formats
  public async exportHistory(
    filter: EventHistoryFilter,
    format: 'json' | 'csv' | 'pdf'
  ): Promise<string> {
    try {
      const history = await this.getFilteredHistory(filter, 10000); // Large limit for export

      switch (format) {
        case 'json':
          return JSON.stringify(history, null, 2);

        case 'csv':
          return this.convertToCSV(history);

        case 'pdf':
          // This would require a PDF generation library
          return 'PDF export not implemented yet';

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

    } catch (error) {
      console.error('Error exporting history:', error);
      throw error;
    }
  }

  // Private helper methods
  private getChangedFields(previous: Record<string, any>, current: Record<string, any>): string[] {
    const changedFields: string[] = [];
    
    // Check for changed fields
    Object.keys(current).forEach(key => {
      if (previous[key] !== current[key]) {
        changedFields.push(key);
      }
    });

    // Check for removed fields
    Object.keys(previous).forEach(key => {
      if (!(key in current)) {
        changedFields.push(key);
      }
    });

    return changedFields;
  }

  private generateChangeDescription(
    changedFields: string[],
    previous: Record<string, any>,
    current: Record<string, any>
  ): string {
    if (changedFields.length === 0) {
      return 'No changes detected';
    }

    if (changedFields.length === 1) {
      const field = changedFields[0];
      return `${field} changed from "${previous[field]}" to "${current[field]}"`;
    }

    return `${changedFields.length} fields changed: ${changedFields.join(', ')}`;
  }

  private convertToCSV(history: EventHistoryEntry[]): string {
    const headers = [
      'ID',
      'Event ID',
      'Action',
      'Changed By',
      'Timestamp',
      'Description',
      'Changed Fields',
      'Reason'
    ];

    const rows = history.map(entry => [
      entry.id,
      entry.event_id,
      entry.action,
      entry.changed_by,
      new Date(entry.change_timestamp).toISOString(),
      entry.change_description,
      entry.changed_fields.join(';'),
      entry.change_reason || ''
    ]);

    return [headers, ...rows].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');
  }
}

// Export singleton instance
export const eventHistoryService = EventHistoryService.getInstance();
