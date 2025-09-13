'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Edit, 
  Save, 
  X, 
  AlertTriangle,
  Clock,
  User,
  MapPin,
  History,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMatchEventService } from '@/hooks/use-match-event-service';
import { EventType } from '@/lib/types/entities';
import { MatchEvent } from '@/lib/types/entities';

interface EventEditingInterfaceProps {
  event: MatchEvent;
  players: Array<{ id: string; name: string; position: string; }>;
  teams: Array<{ id: string; name: string; }>;
  onSave: (updatedEvent: MatchEvent) => void;
  onCancel: () => void;
  className?: string;
}

interface EditFormData {
  player_id: string;
  team_id: string;
  event_type: EventType;
  minute: number;
  second_minute?: number;
  description: string;
  assist_player_id?: string;
  substituted_player_id?: string;
  coordinates?: { x: number; y: number };
  metadata?: Record<string, any>;
  is_important: boolean;
}

export function EventEditingInterface({
  event,
  players,
  teams,
  onSave,
  onCancel,
  className
}: EventEditingInterfaceProps) {
  const [formData, setFormData] = useState<EditFormData>({
    player_id: event.player_id || '',
    team_id: event.team_id || '',
    event_type: event.event_type,
    minute: event.minute,
    second_minute: event.second_minute,
    description: event.description || '',
    assist_player_id: event.assist_player_id || '',
    substituted_player_id: event.substituted_player_id || '',
    coordinates: event.coordinates,
    metadata: event.metadata,
    is_important: event.is_important || false
  });
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  const { updateEvent } = useMatchEventService();

  useEffect(() => {
    // Check if form data has changed from original event
    const hasFormChanges = JSON.stringify(formData) !== JSON.stringify({
      player_id: event.player_id || '',
      team_id: event.team_id || '',
      event_type: event.event_type,
      minute: event.minute,
      second_minute: event.second_minute,
      description: event.description || '',
      assist_player_id: event.assist_player_id || '',
      substituted_player_id: event.substituted_player_id || '',
      coordinates: event.coordinates,
      metadata: event.metadata,
      is_important: event.is_important || false
    });
    
    setHasChanges(hasFormChanges);
  }, [formData, event]);

  const handleInputChange = (field: keyof EditFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors([]);
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.team_id) {
      errors.push('Team is required');
    }

    if (!formData.event_type) {
      errors.push('Event type is required');
    }

    if (formData.minute < 0 || formData.minute > 120) {
      errors.push('Minute must be between 0 and 120');
    }

    if (formData.second_minute !== undefined && (formData.second_minute < 0 || formData.second_minute > 59)) {
      errors.push('Second minute must be between 0 and 59');
    }

    // Event-specific validation
    switch (formData.event_type) {
      case EventType.GOAL:
      case EventType.OWN_GOAL:
      case EventType.PENALTY_GOAL:
      case EventType.YELLOW_CARD:
      case EventType.RED_CARD:
      case EventType.FOUL:
      case EventType.OFFSIDE:
        if (!formData.player_id) {
          errors.push('Player is required for this event type');
        }
        break;
      
      case EventType.SUBSTITUTION:
        if (!formData.player_id || !formData.substituted_player_id) {
          errors.push('Both player and substituted player are required for substitutions');
        }
        if (formData.player_id === formData.substituted_player_id) {
          errors.push('Player and substituted player cannot be the same');
        }
        break;
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const updatedEvent = await updateEvent(event.id, formData);
      
      toast({
        title: "Event Updated",
        description: "Event has been successfully updated",
        variant: "default"
      });
      
      onSave(updatedEvent);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCoordinateChange = (axis: 'x' | 'y', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setFormData(prev => ({
        ...prev,
        coordinates: {
          ...prev.coordinates,
          [axis]: numValue
        }
      }));
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

  const getPlayerName = (playerId: string): string => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : playerId;
  };

  const getTeamName = (teamId: string): string => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : teamId;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Edit Event
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-lg">{getEventTypeIcon(event.event_type)}</span>
          <Badge variant="outline">
            {event.event_type.replace('_', ' ')}
          </Badge>
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {event.minute}'{event.second_minute ? `:${event.second_minute}` : ''}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Please fix the following errors:</div>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Basic Event Information */}
        <div className="space-y-4">
          <h4 className="font-medium">Event Details</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-type">Event Type</Label>
              <Select value={formData.event_type} onValueChange={(value) => handleInputChange('event_type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(EventType).map(type => (
                    <SelectItem key={type} value={type}>
                      {getEventTypeIcon(type)} {type.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="team">Team</Label>
              <Select value={formData.team_id} onValueChange={(value) => handleInputChange('team_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minute">Minute</Label>
              <Input
                id="minute"
                type="number"
                min="0"
                max="120"
                value={formData.minute}
                onChange={(e) => handleInputChange('minute', parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="second-minute">Second (optional)</Label>
              <Input
                id="second-minute"
                type="number"
                min="0"
                max="59"
                value={formData.second_minute || ''}
                onChange={(e) => handleInputChange('second_minute', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
          </div>
        </div>

        {/* Player Information */}
        <div className="space-y-4">
          <h4 className="font-medium">Player Information</h4>
          
          <div className="space-y-2">
            <Label htmlFor="player">Player</Label>
            <Select value={formData.player_id} onValueChange={(value) => handleInputChange('player_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                {players.map(player => (
                  <SelectItem key={player.id} value={player.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {player.name} ({player.position})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Substitution-specific fields */}
          {formData.event_type === EventType.SUBSTITUTION && (
            <div className="space-y-2">
              <Label htmlFor="substituted-player">Substituted Player</Label>
              <Select value={formData.substituted_player_id || ''} onValueChange={(value) => handleInputChange('substituted_player_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select substituted player" />
                </SelectTrigger>
                <SelectContent>
                  {players.map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {player.name} ({player.position})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assist player for goals */}
          {(formData.event_type === EventType.GOAL || formData.event_type === EventType.PENALTY_GOAL) && (
            <div className="space-y-2">
              <Label htmlFor="assist-player">Assist Player (optional)</Label>
              <Select value={formData.assist_player_id || ''} onValueChange={(value) => handleInputChange('assist_player_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assist player" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No assist</SelectItem>
                  {players.map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {player.name} ({player.position})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Coordinates */}
        {formData.coordinates && (
          <div className="space-y-4">
            <h4 className="font-medium">Field Position</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coordinate-x">X Coordinate</Label>
                <Input
                  id="coordinate-x"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.coordinates.x}
                  onChange={(e) => handleCoordinateChange('x', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coordinate-y">Y Coordinate</Label>
                <Input
                  id="coordinate-y"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.coordinates.y}
                  onChange={(e) => handleCoordinateChange('y', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="space-y-4">
          <h4 className="font-medium">Description</h4>
          <Textarea
            placeholder="Enter event description..."
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
          />
        </div>

        {/* Additional Options */}
        <div className="space-y-4">
          <h4 className="font-medium">Additional Options</h4>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="important"
              checked={formData.is_important}
              onCheckedChange={(checked) => handleInputChange('is_important', checked)}
            />
            <Label htmlFor="important" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Mark as Important Event
            </Label>
          </div>
        </div>

        {/* Event History */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Event History
          </h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="text-sm">
              <strong>Created:</strong> {new Date(event.created_at).toLocaleString()}
            </div>
            {event.updated_at && (
              <div className="text-sm">
                <strong>Last Updated:</strong> {new Date(event.updated_at).toLocaleString()}
              </div>
            )}
            {event.created_by && (
              <div className="text-sm">
                <strong>Created By:</strong> {event.created_by}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isLoading}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
        
        {hasChanges && (
          <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            You have unsaved changes
          </div>
        )}
      </CardContent>
    </Card>
  );
}
