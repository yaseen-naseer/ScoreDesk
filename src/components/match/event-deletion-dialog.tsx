'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Trash2, 
  AlertTriangle, 
  Clock, 
  Shield, 
  User,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EventType } from '@/lib/types/entities';
import { MatchEvent } from '@/lib/types/entities';
import { 
  eventAuthorizationService, 
  EventDeletionContext, 
  UserRole,
  DeletionPermission 
} from '@/lib/services/event-authorization-service';

interface EventDeletionDialogProps {
  event: MatchEvent;
  userRole: UserRole;
  matchStatus: 'scheduled' | 'live' | 'finished';
  onConfirm: (reason: string, requiresApproval: boolean) => void;
  onCancel: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EventDeletionDialog({
  event,
  userRole,
  matchStatus,
  onConfirm,
  onCancel,
  trigger,
  open,
  onOpenChange
}: EventDeletionDialogProps) {
  const [deletionReason, setDeletionReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<DeletionPermission | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [auditRequirements, setAuditRequirements] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check deletion permission
    const context: EventDeletionContext = {
      eventId: event.id,
      eventType: event.event_type,
      eventMinute: event.minute,
      eventCreatedAt: new Date(event.created_at),
      matchId: event.match_id,
      matchStatus,
      userId: event.created_by || '',
      userRole
    };

    const deletionPermission = eventAuthorizationService.checkDeletionPermission(context);
    setPermission(deletionPermission);

    // Calculate time remaining
    const remaining = eventAuthorizationService.getTimeRemainingForDeletion(
      new Date(event.created_at),
      event.event_type
    );
    setTimeRemaining(remaining);

    // Get audit requirements
    const auditReqs = eventAuthorizationService.getDeletionAuditRequirements(event.event_type);
    setAuditRequirements(auditReqs);

    // Update time remaining every minute
    const interval = setInterval(() => {
      const newRemaining = eventAuthorizationService.getTimeRemainingForDeletion(
        new Date(event.created_at),
        event.event_type
      );
      setTimeRemaining(newRemaining);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [event, userRole, matchStatus]);

  const handleConfirm = () => {
    if (!deletionReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for deleting this event",
        variant: "destructive"
      });
      return;
    }

    if (!permission?.canDelete) {
      toast({
        title: "Cannot Delete",
        description: permission?.reason || "You don't have permission to delete this event",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    onConfirm(deletionReason, permission.requiresApproval);
  };

  const getEventTypeIcon = (type: EventType): string => {
    switch (type) {
      case EventType.GOAL:
      case EventType.OWN_GOAL:
      case EventType.PENALTY_GOAL:
        return '⚽';
      case EventType.YELLOW_CARD:
        return '🟨';
      case EventType.RED_CARD:
        return '🟥';
      case EventType.SUBSTITUTION:
        return '🔄';
      case EventType.FOUL:
        return '⚠️';
      default:
        return '📋';
    }
  };

  const getTimeRemainingText = (minutes: number): string => {
    if (minutes <= 0) return 'Expired';
    if (minutes < 1) return '< 1 minute';
    if (minutes === 1) return '1 minute';
    return `${Math.floor(minutes)} minutes`;
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const isCriticalEvent = eventAuthorizationService.isCriticalEvent(event.event_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Event
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Delete Event
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. Please review the details below before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span>{getEventTypeIcon(event.event_type)}</span>
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Event Type</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {event.event_type.replace('_', ' ')}
                    </Badge>
                    {isCriticalEvent && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Critical
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Time</Label>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {event.minute}'{event.second_minute ? `:${event.second_minute}` : ''}
                  </div>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-muted-foreground">
                  {event.description || 'No description provided'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(event.created_at)}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Time Remaining</Label>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span className={`text-sm font-medium ${
                      timeRemaining <= 0 ? 'text-red-600' : 
                      timeRemaining <= 5 ? 'text-yellow-600' : 
                      'text-green-600'
                    }`}>
                      {getTimeRemainingText(timeRemaining)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permission Status */}
          <Alert variant={permission?.canDelete ? "default" : "destructive"}>
            <div className="flex items-center gap-2">
              {permission?.canDelete ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <div className="font-medium">
                {permission?.canDelete ? 'Deletion Allowed' : 'Deletion Not Allowed'}
              </div>
            </div>
            {permission?.reason && (
              <AlertDescription className="mt-2">
                {permission.reason}
              </AlertDescription>
            )}
          </Alert>

          {/* User Role Information */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4" />
                <Label className="font-medium">Your Permissions</Label>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Role: {userRole.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    Level {userRole.level}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Permissions: {userRole.permissions.join(', ')}
                </div>
                {permission?.requiresApproval && (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>This deletion requires approval</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Audit Requirements */}
          {auditRequirements && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4" />
                  <Label className="font-medium">Audit Requirements</Label>
                </div>
                <div className="space-y-2 text-sm">
                  {auditRequirements.logReason && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Reason must be logged</span>
                    </div>
                  )}
                  {auditRequirements.requireWitness && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Witness required for critical event</span>
                    </div>
                  )}
                  {auditRequirements.notifyStakeholders && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Stakeholders will be notified</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deletion Reason */}
          <div className="space-y-2">
            <Label htmlFor="deletion-reason" className="font-medium">
              Reason for Deletion *
            </Label>
            <Textarea
              id="deletion-reason"
              placeholder="Please provide a detailed reason for deleting this event..."
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This reason will be logged and may be reviewed by administrators.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!permission?.canDelete || !deletionReason.trim() || isLoading}
          >
            {isLoading ? (
              'Deleting...'
            ) : permission?.requiresApproval ? (
              'Request Deletion'
            ) : (
              'Delete Event'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
