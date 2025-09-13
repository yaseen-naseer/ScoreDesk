'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  History, 
  Search, 
  Filter, 
  Download,
  Clock,
  User,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EventType } from '@/lib/types/entities';
import { 
  eventHistoryService, 
  EventHistoryEntry, 
  EventHistoryFilter,
  EventHistoryStatistics 
} from '@/lib/services/event-history-service';

interface EventHistoryViewerProps {
  eventId?: string;
  className?: string;
}

export function EventHistoryViewer({
  eventId,
  className
}: EventHistoryViewerProps) {
  const [history, setHistory] = useState<EventHistoryEntry[]>([]);
  const [statistics, setStatistics] = useState<EventHistoryStatistics>({
    totalChanges: 0,
    changesByAction: {},
    changesByUser: {},
    changesByEventType: {},
    recentChanges: [],
    mostActiveUsers: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<EventHistoryFilter>({
    eventId,
    dateFrom: undefined,
    dateTo: undefined
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [historyData, statsData] = await Promise.all([
        eventHistoryService.getFilteredHistory(filter, 100),
        eventHistoryService.getHistoryStatistics(filter.dateFrom, filter.dateTo)
      ]);

      setHistory(historyData);
      setStatistics(statsData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load history data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const exportData = await eventHistoryService.exportHistory(filter, format);
      
      // Create and download file
      const blob = new Blob([exportData], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `event-history-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `History exported as ${format.toUpperCase()}`,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export history data",
        variant: "destructive"
      });
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'updated':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'deleted':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'disputed':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'created':
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'updated':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'deleted':
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'disputed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const filteredHistory = history.filter(entry => {
    const matchesSearch = searchQuery === '' || 
      entry.change_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.changed_by.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = selectedAction === 'all' || entry.action === selectedAction;
    
    return matchesSearch && matchesAction;
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">Loading history data...</div>
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
                <p className="text-sm text-muted-foreground">Total Changes</p>
                <p className="text-2xl font-bold">{statistics.totalChanges}</p>
              </div>
              <History className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Most Active</p>
                <p className="text-lg font-bold">
                  {statistics.mostActiveUsers.length > 0 ? statistics.mostActiveUsers[0].changeCount : 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {statistics.mostActiveUsers.length > 0 ? statistics.mostActiveUsers[0].userId : 'No data'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recent Changes</p>
                <p className="text-2xl font-bold">{statistics.recentChanges.length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Actions</p>
                <p className="text-2xl font-bold">{Object.keys(statistics.changesByAction).length}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search history..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action-filter">Action</Label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {Object.keys(statistics.changesByAction).map(action => (
                    <SelectItem key={action} value={action}>
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Export</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('json')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('csv')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">
            History ({filteredHistory.length})
          </TabsTrigger>
          <TabsTrigger value="statistics">
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          {filteredHistory.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No History Found</p>
                <p className="text-muted-foreground">No changes match your current filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((entry) => (
                <Card key={entry.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getActionIcon(entry.action)}
                        <div>
                          <h3 className="font-medium">{entry.change_description}</h3>
                          <p className="text-sm text-muted-foreground">
                            {entry.event_id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getActionColor(entry.action)}>
                          {entry.action}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          {formatTime(entry.change_timestamp)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-sm font-medium">Changed By</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {entry.changed_by}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Fields Changed</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.changed_fields.map(field => (
                            <Badge key={field} variant="outline" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Reason</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.change_reason || 'No reason provided'}
                        </p>
                      </div>
                    </div>

                    {/* Show field changes if available */}
                    {entry.previous_values && entry.new_values && (
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium mb-2">Changes:</p>
                        <div className="space-y-1">
                          {entry.changed_fields.map(field => (
                            <div key={field} className="text-sm">
                              <span className="font-medium">{field}:</span>
                              <span className="text-muted-foreground ml-2">
                                "{entry.previous_values[field]}" → "{entry.new_values[field]}"
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Changes by Action */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Changes by Action</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(statistics.changesByAction).map(([action, count]) => (
                    <div key={action} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getActionIcon(action)}
                        <span className="capitalize">{action}</span>
                      </div>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Changes by User */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Most Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statistics.mostActiveUsers.slice(0, 5).map((user) => (
                    <div key={user.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="text-sm">{user.userId}</span>
                      </div>
                      <Badge variant="outline">{user.changeCount}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Changes by Event Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Changes by Event Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(statistics.changesByEventType).map(([eventType, count]) => (
                    <div key={eventType} className="flex items-center justify-between">
                      <span className="text-sm">{eventType.replace('_', ' ')}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Changes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statistics.recentChanges.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3">
                      {getActionIcon(entry.action)}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{entry.change_description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(entry.change_timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
