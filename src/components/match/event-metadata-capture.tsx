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
import { 
  MapPin, 
  Users, 
  Info, 
  Zap,
  Target,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EventType } from '@/lib/types/entities';
import { 
  eventMetadataService, 
  EventCoordinates, 
  EventMetadataCapture 
} from '@/lib/services/event-metadata-service';

interface EventMetadataCaptureProps {
  eventType: EventType;
  onMetadataCapture: (capture: EventMetadataCapture) => void;
  onCancel: () => void;
  initialData?: Partial<EventMetadataCapture>;
  className?: string;
}

export function EventMetadataCaptureComponent({
  eventType,
  onMetadataCapture,
  onCancel,
  initialData,
  className
}: EventMetadataCaptureProps) {
  const [coordinates, setCoordinates] = useState<EventCoordinates>({
    x: initialData?.coordinates?.x || 50,
    y: initialData?.coordinates?.y || 50,
    zone: initialData?.coordinates?.zone,
    side: initialData?.coordinates?.side
  });
  const [description, setDescription] = useState(initialData?.description || '');
  const [relatedPlayers, setRelatedPlayers] = useState<string[]>(initialData?.relatedPlayers || []);
  const [isImportant, setIsImportant] = useState(initialData?.isImportant || false);
  const [phase, setPhase] = useState<string>('');
  const [crowdImpact, setCrowdImpact] = useState<string>('low');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Auto-calculate zone and side when coordinates change
    const zone = eventMetadataService.calculateFieldZone(coordinates);
    const side = eventMetadataService.getFieldSide(coordinates);
    setCoordinates(prev => ({ ...prev, zone, side }));
  }, [coordinates.x, coordinates.y]);

  const handleCoordinateChange = (axis: 'x' | 'y', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setCoordinates(prev => ({ ...prev, [axis]: numValue }));
    }
  };

  const handleFieldClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    setCoordinates({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    });
  };

  const handleAddRelatedPlayer = (playerId: string) => {
    if (playerId && !relatedPlayers.includes(playerId)) {
      setRelatedPlayers(prev => [...prev, playerId]);
    }
  };

  const handleRemoveRelatedPlayer = (playerId: string) => {
    setRelatedPlayers(prev => prev.filter(id => id !== playerId));
  };

  const handleCustomFieldChange = (key: string, value: string) => {
    setCustomFields(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    // Validate coordinates
    const coordValidation = eventMetadataService.validateCoordinates(coordinates);
    if (!coordValidation.isValid) {
      setValidationErrors(coordValidation.errors);
      return;
    }

    const capture: EventMetadataCapture = {
      eventType,
      coordinates,
      metadata: {
        coordinates,
        phase: phase as any,
        crowd_impact: crowdImpact as any,
        custom_fields: customFields,
        precise_timing: {
          start_time: Date.now()
        }
      },
      relatedPlayers,
      description,
      isImportant
    };

    // Validate metadata
    const metadataValidation = eventMetadataService.validateMetadata(capture.metadata!);
    if (!metadataValidation.isValid) {
      setValidationErrors(metadataValidation.errors);
      return;
    }

    setValidationErrors([]);
    onMetadataCapture(capture);
    
    toast({
      title: "Metadata Captured",
      description: "Event metadata has been successfully captured",
      variant: "default"
    });
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

  const getZoneColor = (zone?: string): string => {
    switch (zone) {
      case 'goal_area':
        return 'bg-red-200 border-red-400';
      case 'penalty_area':
        return 'bg-orange-200 border-orange-400';
      case 'center_circle':
        return 'bg-blue-200 border-blue-400';
      case 'corner':
        return 'bg-yellow-200 border-yellow-400';
      case 'touchline':
        return 'bg-gray-200 border-gray-400';
      default:
        return 'bg-green-200 border-green-400';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Event Metadata Capture
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-lg">{getEventTypeIcon(eventType)}</span>
          <Badge variant="outline">
            {eventType.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Validation Errors</span>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Field Visualization and Coordinate Selection */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Field Position</Label>
          
          {/* Interactive Field */}
          <div className="relative">
            <div
              className="w-full h-64 bg-green-100 border-2 border-green-600 rounded-lg cursor-crosshair relative"
              onClick={handleFieldClick}
            >
              {/* Field markings */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Center line */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white transform -translate-y-1/2"></div>
                {/* Center circle */}
                <div className="absolute top-1/2 left-1/2 w-16 h-16 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                {/* Goal areas */}
                <div className="absolute top-0 left-1/4 w-1/2 h-8 border-l-2 border-r-2 border-b-2 border-white transform -translate-x-1/2"></div>
                <div className="absolute bottom-0 left-1/4 w-1/2 h-8 border-l-2 border-r-2 border-t-2 border-white transform -translate-x-1/2"></div>
                {/* Penalty areas */}
                <div className="absolute top-0 left-1/6 w-2/3 h-12 border-l-2 border-r-2 border-b-2 border-white transform -translate-x-1/2"></div>
                <div className="absolute bottom-0 left-1/6 w-2/3 h-12 border-l-2 border-r-2 border-t-2 border-white transform -translate-x-1/2"></div>
              </div>
              
              {/* Coordinate marker */}
              <div
                className="absolute w-4 h-4 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow-lg"
                style={{
                  left: `${coordinates.x}%`,
                  top: `${coordinates.y}%`
                }}
              />
            </div>
            
            {/* Coordinate inputs */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="x-coordinate">X Coordinate (0-100)</Label>
                <Input
                  id="x-coordinate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={coordinates.x.toFixed(1)}
                  onChange={(e) => handleCoordinateChange('x', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="y-coordinate">Y Coordinate (0-100)</Label>
                <Input
                  id="y-coordinate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={coordinates.y.toFixed(1)}
                  onChange={(e) => handleCoordinateChange('y', e.target.value)}
                />
              </div>
            </div>
            
            {/* Zone and side information */}
            {(coordinates.zone || coordinates.side) && (
              <div className="flex gap-2 mt-2">
                {coordinates.zone && (
                  <Badge className={`${getZoneColor(coordinates.zone)} text-gray-800`}>
                    <Target className="h-3 w-3 mr-1" />
                    {coordinates.zone.replace('_', ' ')}
                  </Badge>
                )}
                {coordinates.side && (
                  <Badge variant="outline">
                    {coordinates.side}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Event Details */}
        <div className="space-y-4">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Enter event description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {/* Event Context */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phase">Phase of Play</Label>
            <Select value={phase} onValueChange={setPhase}>
              <SelectTrigger>
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="attack">Attack</SelectItem>
                <SelectItem value="defense">Defense</SelectItem>
                <SelectItem value="transition">Transition</SelectItem>
                <SelectItem value="set_piece">Set Piece</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="crowd-impact">Crowd Impact</Label>
            <Select value={crowdImpact} onValueChange={setCrowdImpact}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Related Players */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Related Players</Label>
          <div className="space-y-2">
            <Input
              placeholder="Enter player ID to add..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const input = e.target as HTMLInputElement;
                  if (input.value.trim()) {
                    handleAddRelatedPlayer(input.value.trim());
                    input.value = '';
                  }
                }
              }}
            />
            {relatedPlayers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {relatedPlayers.map(playerId => (
                  <Badge
                    key={playerId}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleRemoveRelatedPlayer(playerId)}
                  >
                    <Users className="h-3 w-3 mr-1" />
                    {playerId}
                    <span className="ml-1">×</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Custom Fields */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Custom Fields</Label>
          <div className="space-y-2">
            {Object.entries(customFields).map(([key, value]) => (
              <div key={key} className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Field name"
                  value={key}
                  onChange={(e) => {
                    const newKey = e.target.value;
                    const newFields = { ...customFields };
                    delete newFields[key];
                    newFields[newKey] = value;
                    setCustomFields(newFields);
                  }}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Value"
                    value={value}
                    onChange={(e) => handleCustomFieldChange(key, e.target.value)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newFields = { ...customFields };
                      delete newFields[key];
                      setCustomFields(newFields);
                    }}
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const key = `custom_${Date.now()}`;
                setCustomFields(prev => ({ ...prev, [key]: '' }));
              }}
            >
              Add Custom Field
            </Button>
          </div>
        </div>

        {/* Importance Toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            id="important"
            checked={isImportant}
            onCheckedChange={setIsImportant}
          />
          <Label htmlFor="important" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Mark as Important Event
          </Label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={handleSubmit} className="flex-1">
            <MapPin className="h-4 w-4 mr-2" />
            Capture Metadata
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
