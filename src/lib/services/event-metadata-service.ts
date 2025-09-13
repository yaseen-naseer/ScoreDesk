import { EventType } from '@/lib/types/entities';

export interface EventCoordinates {
  x: number; // 0-100 (percentage of field width)
  y: number; // 0-100 (percentage of field height)
  zone?: 'penalty_area' | 'goal_area' | 'center_circle' | 'corner' | 'touchline';
  side?: 'left' | 'center' | 'right';
}

export interface EventMetadata {
  // Location data
  coordinates?: EventCoordinates;
  field_position?: string;
  
  // Context data
  phase?: 'attack' | 'defense' | 'transition' | 'set_piece';
  tempo?: 'fast' | 'medium' | 'slow';
  
  // Related events
  related_events?: string[]; // IDs of related events
  sequence_id?: string; // For event sequences
  
  // Additional context
  weather_conditions?: string;
  crowd_impact?: 'high' | 'medium' | 'low' | 'none';
  
  // Custom fields
  custom_fields?: Record<string, any>;
  
  // Technical data
  device_info?: {
    platform: string;
    version: string;
    user_agent?: string;
  };
  
  // Timing precision
  precise_timing?: {
    start_time: number;
    end_time?: number;
    duration?: number;
  };
}

export interface EventMetadataCapture {
  eventType: EventType;
  coordinates?: EventCoordinates;
  metadata?: EventMetadata;
  relatedPlayers?: string[];
  description?: string;
  isImportant?: boolean;
}

export class EventMetadataService {
  private static instance: EventMetadataService;

  private constructor() {}

  public static getInstance(): EventMetadataService {
    if (!EventMetadataService.instance) {
      EventMetadataService.instance = new EventMetadataService();
    }
    return EventMetadataService.instance;
  }

  // Coordinate Management
  public validateCoordinates(coordinates: EventCoordinates): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (coordinates.x < 0 || coordinates.x > 100) {
      errors.push('X coordinate must be between 0 and 100');
    }

    if (coordinates.y < 0 || coordinates.y > 100) {
      errors.push('Y coordinate must be between 0 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public calculateFieldZone(coordinates: EventCoordinates): EventCoordinates['zone'] {
    const { x, y } = coordinates;

    // Goal areas (assuming standard field layout)
    if (y <= 10 || y >= 90) {
      if (x >= 20 && x <= 80) {
        return 'goal_area';
      }
    }

    // Penalty areas
    if (y <= 15 || y >= 85) {
      if (x >= 15 && x <= 85) {
        return 'penalty_area';
      }
    }

    // Center circle
    if (x >= 45 && x <= 55 && y >= 45 && y <= 55) {
      return 'center_circle';
    }

    // Corners
    if ((x <= 5 || x >= 95) && (y <= 5 || y >= 95)) {
      return 'corner';
    }

    // Touchlines
    if (x <= 5 || x >= 95 || y <= 5 || y >= 95) {
      return 'touchline';
    }

    return undefined;
  }

  public getFieldSide(coordinates: EventCoordinates): EventCoordinates['side'] {
    const { x } = coordinates;

    if (x < 30) return 'left';
    if (x > 70) return 'right';
    return 'center';
  }

  // Metadata Generation
  public generateEventMetadata(capture: EventMetadataCapture): EventMetadata {
    const metadata: EventMetadata = {
      custom_fields: {},
      device_info: this.getDeviceInfo(),
      precise_timing: {
        start_time: Date.now()
      }
    };

    // Add coordinates with zone calculation
    if (capture.coordinates) {
      const coordinates = {
        ...capture.coordinates,
        zone: this.calculateFieldZone(capture.coordinates),
        side: this.getFieldSide(capture.coordinates)
      };
      
      metadata.coordinates = coordinates;
      metadata.field_position = this.getFieldPositionDescription(coordinates);
    }

    // Add event-specific metadata
    this.addEventSpecificMetadata(metadata, capture.eventType, capture.coordinates);

    // Add related players
    if (capture.relatedPlayers && capture.relatedPlayers.length > 0) {
      metadata.custom_fields = {
        ...metadata.custom_fields,
        related_players: capture.relatedPlayers
      };
    }

    // Add importance flag
    if (capture.isImportant) {
      metadata.custom_fields = {
        ...metadata.custom_fields,
        is_important: true
      };
    }

    return metadata;
  }

  private addEventSpecificMetadata(metadata: EventMetadata, eventType: EventType, coordinates?: EventCoordinates): void {
    switch (eventType) {
      case EventType.GOAL:
      case EventType.PENALTY_GOAL:
      case EventType.OWN_GOAL:
        metadata.phase = 'attack';
        metadata.crowd_impact = 'high';
        if (coordinates?.zone === 'penalty_area') {
          metadata.custom_fields = {
            ...metadata.custom_fields,
            goal_type: 'close_range'
          };
        } else {
          metadata.custom_fields = {
            ...metadata.custom_fields,
            goal_type: 'long_range'
          };
        }
        break;

      case EventType.YELLOW_CARD:
      case EventType.RED_CARD:
        metadata.phase = 'defense';
        metadata.crowd_impact = 'medium';
        metadata.custom_fields = {
          ...metadata.custom_fields,
          disciplinary_action: true
        };
        break;

      case EventType.SUBSTITUTION:
        metadata.phase = 'transition';
        metadata.crowd_impact = 'low';
        metadata.custom_fields = {
          ...metadata.custom_fields,
          player_change: true
        };
        break;

      case EventType.FOUL:
        metadata.phase = 'defense';
        metadata.crowd_impact = 'low';
        metadata.custom_fields = {
          ...metadata.custom_fields,
          infraction: true
        };
        break;

      case EventType.CORNER_KICK:
        metadata.phase = 'set_piece';
        metadata.crowd_impact = 'medium';
        metadata.custom_fields = {
          ...metadata.custom_fields,
          set_piece: true,
          restart_type: 'corner'
        };
        break;

      case EventType.OFFSIDE:
        metadata.phase = 'attack';
        metadata.crowd_impact = 'low';
        metadata.custom_fields = {
          ...metadata.custom_fields,
          offside: true
        };
        break;

      default:
        metadata.crowd_impact = 'low';
        break;
    }
  }

  private getFieldPositionDescription(coordinates: EventCoordinates): string {
    const { x, y, zone, side } = coordinates;
    
    if (zone) {
      switch (zone) {
        case 'goal_area':
          return 'Goal area';
        case 'penalty_area':
          return 'Penalty area';
        case 'center_circle':
          return 'Center circle';
        case 'corner':
          return 'Corner';
        case 'touchline':
          return 'Touchline';
      }
    }

    const verticalPosition = y < 30 ? 'Defensive third' : y > 70 ? 'Attacking third' : 'Middle third';
    const horizontalPosition = side === 'left' ? 'Left side' : side === 'right' ? 'Right side' : 'Center';
    
    return `${verticalPosition}, ${horizontalPosition}`;
  }

  private getDeviceInfo(): EventMetadata['device_info'] {
    return {
      platform: typeof window !== 'undefined' ? navigator.platform : 'server',
      version: '1.0.0',
      user_agent: typeof window !== 'undefined' ? navigator.userAgent : undefined
    };
  }

  // Metadata Analysis
  public analyzeEventPattern(events: Array<{ metadata?: EventMetadata }>): {
    hotSpots: Array<{ x: number; y: number; count: number }>;
    commonPhases: Record<string, number>;
    averageImportance: number;
  } {
    const hotSpots = new Map<string, number>();
    const phaseCounts: Record<string, number> = {};
    let importanceSum = 0;
    let importanceCount = 0;

    events.forEach(event => {
      if (event.metadata?.coordinates) {
        const { x, y } = event.metadata.coordinates;
        const key = `${Math.round(x / 10) * 10}-${Math.round(y / 10) * 10}`;
        hotSpots.set(key, (hotSpots.get(key) || 0) + 1);
      }

      if (event.metadata?.phase) {
        phaseCounts[event.metadata.phase] = (phaseCounts[event.metadata.phase] || 0) + 1;
      }

      if (event.metadata?.custom_fields?.is_important) {
        importanceSum++;
        importanceCount++;
      }
    });

    const hotSpotsArray = Array.from(hotSpots.entries()).map(([key, count]) => {
      const [x, y] = key.split('-').map(Number);
      return { x, y, count };
    }).sort((a, b) => b.count - a.count);

    return {
      hotSpots: hotSpotsArray,
      commonPhases: phaseCounts,
      averageImportance: importanceCount > 0 ? importanceSum / importanceCount : 0
    };
  }

  // Metadata Export
  public exportMetadata(events: Array<{ metadata?: EventMetadata }>, format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(events.map(e => e.metadata), null, 2);
    }

    // CSV format
    const headers = ['event_id', 'coordinates_x', 'coordinates_y', 'zone', 'side', 'phase', 'crowd_impact', 'is_important'];
    const rows = events.map((event, index) => {
      const metadata = event.metadata;
      return [
        index.toString(),
        metadata?.coordinates?.x?.toString() || '',
        metadata?.coordinates?.y?.toString() || '',
        metadata?.coordinates?.zone || '',
        metadata?.coordinates?.side || '',
        metadata?.phase || '',
        metadata?.crowd_impact || '',
        metadata?.custom_fields?.is_important?.toString() || ''
      ];
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  // Metadata Validation
  public validateMetadata(metadata: EventMetadata): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (metadata.coordinates) {
      const coordValidation = this.validateCoordinates(metadata.coordinates);
      if (!coordValidation.isValid) {
        errors.push(...coordValidation.errors);
      }
    }

    if (metadata.phase && !['attack', 'defense', 'transition', 'set_piece'].includes(metadata.phase)) {
      errors.push('Invalid phase value');
    }

    if (metadata.crowd_impact && !['high', 'medium', 'low', 'none'].includes(metadata.crowd_impact)) {
      errors.push('Invalid crowd impact value');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const eventMetadataService = EventMetadataService.getInstance();
