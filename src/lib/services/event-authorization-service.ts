import { EventType } from '@/lib/types/entities';

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  level: number; // Higher number = more permissions
}

export interface EventDeletionContext {
  eventId: string;
  eventType: EventType;
  eventMinute: number;
  eventCreatedAt: Date;
  matchId: string;
  matchStatus: 'scheduled' | 'live' | 'finished';
  userId: string;
  userRole: UserRole;
}

export interface DeletionPermission {
  canDelete: boolean;
  reason?: string;
  requiresApproval: boolean;
  timeLimit?: number; // Minutes after event creation
  roleRestriction?: string[];
}

export class EventAuthorizationService {
  private static instance: EventAuthorizationService;

  // Define roles and their permissions
  private readonly roles: Record<string, UserRole> = {
    admin: {
      id: 'admin',
      name: 'Administrator',
      permissions: ['delete_any_event', 'delete_own_events', 'approve_deletions'],
      level: 100
    },
    referee: {
      id: 'referee',
      name: 'Referee',
      permissions: ['delete_own_events', 'delete_recent_events'],
      level: 80
    },
    scorer: {
      id: 'scorer',
      name: 'Match Scorer',
      permissions: ['delete_own_events', 'delete_recent_events'],
      level: 60
    },
    assistant: {
      id: 'assistant',
      name: 'Assistant Scorer',
      permissions: ['delete_own_events'],
      level: 40
    },
    viewer: {
      id: 'viewer',
      name: 'Viewer',
      permissions: [],
      level: 0
    }
  };

  // Define deletion rules for different event types
  private readonly deletionRules: Record<EventType, {
    timeLimit: number; // Minutes after creation
    requiresApproval: boolean;
    allowedRoles: string[];
    criticalEvent: boolean;
  }> = {
    [EventType.GOAL]: {
      timeLimit: 5, // Can only delete goals within 5 minutes
      requiresApproval: true,
      allowedRoles: ['admin', 'referee'],
      criticalEvent: true
    },
    [EventType.OWN_GOAL]: {
      timeLimit: 5,
      requiresApproval: true,
      allowedRoles: ['admin', 'referee'],
      criticalEvent: true
    },
    [EventType.PENALTY_GOAL]: {
      timeLimit: 10, // Penalties have slightly longer window
      requiresApproval: true,
      allowedRoles: ['admin', 'referee'],
      criticalEvent: true
    },
    [EventType.YELLOW_CARD]: {
      timeLimit: 15,
      requiresApproval: false,
      allowedRoles: ['admin', 'referee', 'scorer'],
      criticalEvent: false
    },
    [EventType.RED_CARD]: {
      timeLimit: 10,
      requiresApproval: true,
      allowedRoles: ['admin', 'referee'],
      criticalEvent: true
    },
    [EventType.SUBSTITUTION]: {
      timeLimit: 30,
      requiresApproval: false,
      allowedRoles: ['admin', 'referee', 'scorer', 'assistant'],
      criticalEvent: false
    },
    [EventType.FOUL]: {
      timeLimit: 20,
      requiresApproval: false,
      allowedRoles: ['admin', 'referee', 'scorer'],
      criticalEvent: false
    },
    [EventType.OFFSIDE]: {
      timeLimit: 15,
      requiresApproval: false,
      allowedRoles: ['admin', 'referee', 'scorer'],
      criticalEvent: false
    },
    [EventType.CORNER_KICK]: {
      timeLimit: 25,
      requiresApproval: false,
      allowedRoles: ['admin', 'referee', 'scorer', 'assistant'],
      criticalEvent: false
    },
    [EventType.FREE_KICK]: {
      timeLimit: 20,
      requiresApproval: false,
      allowedRoles: ['admin', 'referee', 'scorer'],
      criticalEvent: false
    },
    [EventType.THROW_IN]: {
      timeLimit: 30,
      requiresApproval: false,
      allowedRoles: ['admin', 'referee', 'scorer', 'assistant'],
      criticalEvent: false
    },
    [EventType.GOAL_KICK]: {
      timeLimit: 25,
      requiresApproval: false,
      allowedRoles: ['admin', 'referee', 'scorer', 'assistant'],
      criticalEvent: false
    }
  };

  private constructor() {}

  public static getInstance(): EventAuthorizationService {
    if (!EventAuthorizationService.instance) {
      EventAuthorizationService.instance = new EventAuthorizationService();
    }
    return EventAuthorizationService.instance;
  }

  // Check if user can delete an event
  public checkDeletionPermission(context: EventDeletionContext): DeletionPermission {
    const { eventType, eventCreatedAt, userRole, matchStatus } = context;
    const rule = this.deletionRules[eventType];
    
    // Check if user role is allowed
    if (!rule.allowedRoles.includes(userRole.id)) {
      return {
        canDelete: false,
        reason: `Your role (${userRole.name}) is not authorized to delete ${eventType.replace('_', ' ')} events`,
        requiresApproval: false
      };
    }

    // Check if match is still editable
    if (matchStatus === 'finished') {
      return {
        canDelete: false,
        reason: 'Cannot delete events from finished matches',
        requiresApproval: false
      };
    }

    // Check time limit
    const minutesSinceCreation = (Date.now() - eventCreatedAt.getTime()) / (1000 * 60);
    if (minutesSinceCreation > rule.timeLimit) {
      return {
        canDelete: false,
        reason: `Event is too old to delete. Time limit: ${rule.timeLimit} minutes`,
        requiresApproval: false
      };
    }

    // Check if deletion requires approval
    const requiresApproval = rule.requiresApproval && !userRole.permissions.includes('delete_any_event');

    return {
      canDelete: true,
      requiresApproval,
      timeLimit: rule.timeLimit,
      roleRestriction: rule.allowedRoles
    };
  }

  // Get user role by ID
  public getUserRole(roleId: string): UserRole | null {
    return this.roles[roleId] || null;
  }

  // Get all available roles
  public getAllRoles(): UserRole[] {
    return Object.values(this.roles).sort((a, b) => b.level - a.level);
  }

  // Check if user has specific permission
  public hasPermission(userRole: UserRole, permission: string): boolean {
    return userRole.permissions.includes(permission);
  }

  // Get deletion rules for event type
  public getDeletionRules(eventType: EventType) {
    return this.deletionRules[eventType];
  }

  // Get time remaining for deletion (in minutes)
  public getTimeRemainingForDeletion(eventCreatedAt: Date, eventType: EventType): number {
    const rule = this.deletionRules[eventType];
    const minutesSinceCreation = (Date.now() - eventCreatedAt.getTime()) / (1000 * 60);
    return Math.max(0, rule.timeLimit - minutesSinceCreation);
  }

  // Check if event is critical (affects score or has major impact)
  public isCriticalEvent(eventType: EventType): boolean {
    return this.deletionRules[eventType].criticalEvent;
  }

  // Get events that can be deleted by user role
  public getDeletableEventTypes(userRole: UserRole): EventType[] {
    return Object.entries(this.deletionRules)
      .filter(([_, rule]) => rule.allowedRoles.includes(userRole.id))
      .map(([eventType, _]) => eventType as EventType);
  }

  // Validate deletion request
  public validateDeletionRequest(
    eventId: string,
    userId: string,
    userRoleId: string,
    eventType: EventType,
    eventCreatedAt: Date,
    matchStatus: string
  ): { isValid: boolean; permission: DeletionPermission; errors: string[] } {
    const errors: string[] = [];
    const userRole = this.getUserRole(userRoleId);

    if (!userRole) {
      errors.push('Invalid user role');
      return {
        isValid: false,
        permission: { canDelete: false, reason: 'Invalid user role', requiresApproval: false },
        errors
      };
    }

    const context: EventDeletionContext = {
      eventId,
      eventType,
      eventMinute: 0, // This would come from the actual event
      eventCreatedAt,
      matchId: '', // This would come from the actual event
      matchStatus: matchStatus as any,
      userId,
      userRole
    };

    const permission = this.checkDeletionPermission(context);

    if (!permission.canDelete) {
      errors.push(permission.reason || 'Deletion not allowed');
    }

    return {
      isValid: permission.canDelete,
      permission,
      errors
    };
  }

  // Get deletion audit trail requirements
  public getDeletionAuditRequirements(eventType: EventType): {
    logReason: boolean;
    requireWitness: boolean;
    notifyStakeholders: boolean;
  } {
    const rule = this.deletionRules[eventType];
    
    return {
      logReason: rule.requiresApproval || rule.criticalEvent,
      requireWitness: rule.criticalEvent,
      notifyStakeholders: rule.criticalEvent
    };
  }

  // Check if deletion requires immediate notification
  public requiresImmediateNotification(eventType: EventType): boolean {
    return this.deletionRules[eventType].criticalEvent;
  }

  // Get escalation rules for deletion approval
  public getEscalationRules(eventType: EventType): {
    escalateToRole: string[];
    escalationTimeLimit: number; // Minutes
    autoApproveAfter: number; // Minutes
  } {
    const rule = this.deletionRules[eventType];
    
    return {
      escalateToRole: ['admin', 'referee'],
      escalationTimeLimit: rule.timeLimit,
      autoApproveAfter: rule.timeLimit + 30 // Auto-approve after time limit + 30 minutes
    };
  }
}

// Export singleton instance
export const eventAuthorizationService = EventAuthorizationService.getInstance();
