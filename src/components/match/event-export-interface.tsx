'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileImage,
  Settings,
  Calendar,
  Filter,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EventType } from '@/lib/types/entities';
import { 
  eventExportService, 
  ExportOptions 
} from '@/lib/services/event-export-service';

interface EventExportInterfaceProps {
  matchId?: string;
  matchIds?: string[];
  availableTeams?: Array<{ id: string; name: string }>;
  availablePlayers?: Array<{ id: string; name: string }>;
  className?: string;
}

export function EventExportInterface({
  matchId,
  matchIds,
  availableTeams = [],
  availablePlayers = [],
  className
}: EventExportInterfaceProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    includeMetadata: false,
    includeCoordinates: false,
    includeStatistics: true,
    sortBy: 'time',
    sortOrder: 'asc'
  });
  
  const [selectedEventTypes, setSelectedEventTypes] = useState<EventType[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const { toast } = useToast();

  const handleExport = async () => {
    if (!matchId && (!matchIds || matchIds.length === 0)) {
      toast({
        title: "No Match Selected",
        description: "Please select a match to export",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    setExportProgress('Preparing export...');

    try {
      const options: ExportOptions = {
        ...exportOptions,
        eventTypes: selectedEventTypes.length > 0 ? selectedEventTypes : undefined,
        teams: selectedTeams.length > 0 ? selectedTeams : undefined,
        players: selectedPlayers.length > 0 ? selectedPlayers : undefined,
        dateRange
      };

      let result;

      if (matchId) {
        setExportProgress('Exporting single match...');
        result = await eventExportService.exportMatchEvents(matchId, options);
      } else if (matchIds && matchIds.length > 0) {
        setExportProgress(`Exporting ${matchIds.length} matches...`);
        result = await eventExportService.exportMultipleMatches(matchIds, options);
      }

      if (result?.success && result.data && result.filename) {
        setExportProgress('Downloading file...');
        eventExportService.downloadFile(result.data, result.filename);
        
        toast({
          title: "Export Complete",
          description: result.message,
          variant: "default"
        });
      } else {
        toast({
          title: "Export Failed",
          description: result?.message || "Unknown error occurred",
          variant: "destructive"
        });
      }

    } catch (error) {
      toast({
        title: "Export Error",
        description: "An error occurred during export",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  const handleEventTypeToggle = (eventType: EventType) => {
    setSelectedEventTypes(prev => 
      prev.includes(eventType) 
        ? prev.filter(t => t !== eventType)
        : [...prev, eventType]
    );
  };

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(t => t !== teamId)
        : [...prev, teamId]
    );
  };

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(p => p !== playerId)
        : [...prev, playerId]
    );
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'json':
        return <FileText className="h-4 w-4" />;
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'xlsx':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'pdf':
        return <FileImage className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getFormatDescription = (format: string): string => {
    switch (format) {
      case 'json':
        return 'Structured data format, good for importing into other systems';
      case 'csv':
        return 'Comma-separated values, good for Excel and data analysis';
      case 'xlsx':
        return 'Excel workbook with multiple sheets and formatting';
      case 'pdf':
        return 'Portable document format, good for sharing and printing';
      default:
        return '';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Events
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Export match events and statistics in various formats
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Export Progress */}
        {isExporting && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {exportProgress}
            </AlertDescription>
          </Alert>
        )}

        {/* Export Target */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Export Target</Label>
          <div className="bg-gray-50 rounded-lg p-3">
            {matchId ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Single Match: {matchId}</span>
              </div>
            ) : matchIds && matchIds.length > 0 ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">{matchIds.length} matches selected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-muted-foreground">No matches selected</span>
              </div>
            )}
          </div>
        </div>

        {/* Export Format */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Export Format</Label>
          <div className="grid grid-cols-2 gap-3">
            {['json', 'csv', 'xlsx', 'pdf'].map(format => (
              <div
                key={format}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  exportOptions.format === format 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setExportOptions(prev => ({ ...prev, format: format as any }))}
              >
                <div className="flex items-center gap-2 mb-1">
                  {getFormatIcon(format)}
                  <span className="font-medium uppercase">{format}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {getFormatDescription(format)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Export Options */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Export Options</Label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="include-metadata">Include Metadata</Label>
                <p className="text-sm text-muted-foreground">
                  Include event metadata and custom fields
                </p>
              </div>
              <Switch
                id="include-metadata"
                checked={exportOptions.includeMetadata}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, includeMetadata: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="include-coordinates">Include Coordinates</Label>
                <p className="text-sm text-muted-foreground">
                  Include field position coordinates
                </p>
              </div>
              <Switch
                id="include-coordinates"
                checked={exportOptions.includeCoordinates}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, includeCoordinates: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="include-statistics">Include Statistics</Label>
                <p className="text-sm text-muted-foreground">
                  Include match statistics and summaries
                </p>
              </div>
              <Switch
                id="include-statistics"
                checked={exportOptions.includeStatistics}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, includeStatistics: checked }))
                }
              />
            </div>
          </div>
        </div>

        {/* Sorting Options */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sort-by">Sort By</Label>
            <Select
              value={exportOptions.sortBy}
              onValueChange={(value) => 
                setExportOptions(prev => ({ ...prev, sortBy: value as any }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">Time</SelectItem>
                <SelectItem value="type">Event Type</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="player">Player</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort-order">Sort Order</Label>
            <Select
              value={exportOptions.sortOrder}
              onValueChange={(value) => 
                setExportOptions(prev => ({ ...prev, sortOrder: value as any }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Event Type Filters */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Event Type Filters</Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(EventType).map(eventType => (
              <div key={eventType} className="flex items-center space-x-2">
                <Checkbox
                  id={`event-${eventType}`}
                  checked={selectedEventTypes.includes(eventType)}
                  onCheckedChange={() => handleEventTypeToggle(eventType)}
                />
                <Label htmlFor={`event-${eventType}`} className="text-sm">
                  {eventType.replace('_', ' ')}
                </Label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Leave empty to include all event types
          </p>
        </div>

        {/* Team Filters */}
        {availableTeams.length > 0 && (
          <div className="space-y-3">
            <Label className="text-base font-medium">Team Filters</Label>
            <div className="grid grid-cols-2 gap-2">
              {availableTeams.map(team => (
                <div key={team.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`team-${team.id}`}
                    checked={selectedTeams.includes(team.id)}
                    onCheckedChange={() => handleTeamToggle(team.id)}
                  />
                  <Label htmlFor={`team-${team.id}`} className="text-sm">
                    {team.name}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to include all teams
            </p>
          </div>
        )}

        {/* Player Filters */}
        {availablePlayers.length > 0 && (
          <div className="space-y-3">
            <Label className="text-base font-medium">Player Filters</Label>
            <div className="max-h-32 overflow-y-auto grid grid-cols-1 gap-2">
              {availablePlayers.map(player => (
                <div key={player.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`player-${player.id}`}
                    checked={selectedPlayers.includes(player.id)}
                    onCheckedChange={() => handlePlayerToggle(player.id)}
                  />
                  <Label htmlFor={`player-${player.id}`} className="text-sm">
                    {player.name}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to include all players
            </p>
          </div>
        )}

        {/* Export Button */}
        <div className="pt-4 border-t">
          <Button
            onClick={handleExport}
            disabled={isExporting || (!matchId && (!matchIds || matchIds.length === 0))}
            className="w-full"
            size="lg"
          >
            <Download className="h-5 w-5 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Events'}
          </Button>
        </div>

        {/* Export Summary */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="font-medium mb-2">Export Summary</h4>
          <div className="text-sm space-y-1 text-muted-foreground">
            <div>Format: {exportOptions.format.toUpperCase()}</div>
            <div>Event Types: {selectedEventTypes.length === 0 ? 'All' : selectedEventTypes.length}</div>
            <div>Teams: {selectedTeams.length === 0 ? 'All' : selectedTeams.length}</div>
            <div>Players: {selectedPlayers.length === 0 ? 'All' : selectedPlayers.length}</div>
            <div>Metadata: {exportOptions.includeMetadata ? 'Included' : 'Excluded'}</div>
            <div>Coordinates: {exportOptions.includeCoordinates ? 'Included' : 'Excluded'}</div>
            <div>Statistics: {exportOptions.includeStatistics ? 'Included' : 'Excluded'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
