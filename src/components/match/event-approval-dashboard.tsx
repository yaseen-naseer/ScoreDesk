'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Users,
  FileText,
  ArrowUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EventType } from '@/lib/types/entities';
import { 
  eventApprovalWorkflowService, 
  ApprovalRequest 
} from '@/lib/services/event-approval-workflow';

interface EventApprovalDashboardProps {
  userId: string;
  userRole: string;
  className?: string;
}

interface ApprovalStatistics {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  escalatedRequests: number;
  averageApprovalTime: number;
}

export function EventApprovalDashboard({
  userId,
  userRole,
  className
}: EventApprovalDashboardProps) {
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalRequest[]>([]);
  const [statistics, setStatistics] = useState<ApprovalStatistics>({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    escalatedRequests: 0,
    averageApprovalTime: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pending, history, stats] = await Promise.all([
        eventApprovalWorkflowService.getPendingApprovals(userId),
        eventApprovalWorkflowService.getApprovalHistory(),
        eventApprovalWorkflowService.getApprovalStatistics()
      ]);

      setPendingApprovals(pending);
      setApprovalHistory(history);
      setStatistics(stats);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load approval data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string, notes?: string) => {
    try {
      const result = await eventApprovalWorkflowService.approveEvent(requestId, userId, notes);
      
      if (result.success) {
        toast({
          title: "Approved",
          description: "Event approved successfully",
          variant: "default"
        });
        loadData(); // Reload data
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve event",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    try {
      const result = await eventApprovalWorkflowService.rejectEvent(requestId, userId, reason);
      
      if (result.success) {
        toast({
          title: "Rejected",
          description: "Event rejected successfully",
          variant: "default"
        });
        loadData(); // Reload data
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
      });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject event",
        variant: "destructive"
      });
    }
  };

  const handleEscalate = async (requestId: string, reason: string) => {
    try {
      const result = await eventApprovalWorkflowService.escalateRequest(requestId, userId, reason);
      
      if (result.success) {
        toast({
          title: "Escalated",
          description: "Request escalated successfully",
          variant: "default"
        });
        loadData(); // Reload data
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to escalate request",
        variant: "destructive"
      });
    }
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

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'escalated':
        return <ArrowUp className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">Loading approval data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{statistics.totalRequests}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{statistics.pendingRequests}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">{statistics.approvedRequests}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Time</p>
                <p className="text-2xl font-bold">{formatDuration(statistics.averageApprovalTime)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Approvals ({pendingApprovals.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Approval History ({approvalHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <p className="text-lg font-medium">No Pending Approvals</p>
                <p className="text-muted-foreground">All events are up to date!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getEventTypeIcon(request.event_type)}</span>
                        <div>
                          <h3 className="font-medium">
                            {request.event_type.replace('_', ' ')} Event
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Requested by {request.requested_by}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(request.priority)}>
                          {request.priority}
                        </Badge>
                        {getStatusIcon(request.approval_status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium">Dispute Type</p>
                        <p className="text-sm text-muted-foreground">{request.dispute_type}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Requested</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(request.request_timestamp)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Event Time</p>
                        <p className="text-sm text-muted-foreground">
                          {request.event_snapshot.minute}'{request.event_snapshot.second_minute ? `:${request.event_snapshot.second_minute}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium">Reason</p>
                      <p className="text-sm text-muted-foreground">{request.request_reason}</p>
                    </div>

                    {request.event_snapshot.description && (
                      <div className="mb-4">
                        <p className="text-sm font-medium">Event Description</p>
                        <p className="text-sm text-muted-foreground">
                          {request.event_snapshot.description}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(request.id, 'Rejected by approver')}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEscalate(request.id, 'Escalated for higher authority')}
                      >
                        <ArrowUp className="h-4 w-4 mr-2" />
                        Escalate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {approvalHistory.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No Approval History</p>
                <p className="text-muted-foreground">Approval requests will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {approvalHistory.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getEventTypeIcon(request.event_type)}</span>
                        <div>
                          <h3 className="font-medium">
                            {request.event_type.replace('_', ' ')} Event
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Requested by {request.requested_by}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(request.priority)}>
                          {request.priority}
                        </Badge>
                        {getStatusIcon(request.approval_status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Requested</p>
                        <p className="text-muted-foreground">{formatTime(request.request_timestamp)}</p>
                      </div>
                      {request.approval_timestamp && (
                        <div>
                          <p className="font-medium">Processed</p>
                          <p className="text-muted-foreground">{formatTime(request.approval_timestamp)}</p>
                        </div>
                      )}
                      {request.approved_by && (
                        <div>
                          <p className="font-medium">Processed By</p>
                          <p className="text-muted-foreground">{request.approved_by}</p>
                        </div>
                      )}
                      <div>
                        <p className="font-medium">Status</p>
                        <Badge variant="outline">{request.approval_status}</Badge>
                      </div>
                    </div>

                    {request.approval_notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium">Notes</p>
                        <p className="text-sm text-muted-foreground">{request.approval_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
