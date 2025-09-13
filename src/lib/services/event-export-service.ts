import { supabase } from '@/lib/supabase/client';
import { EventType } from '@/lib/types/entities';

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'xlsx';
  includeMetadata: boolean;
  includeCoordinates: boolean;
  includeStatistics: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  eventTypes?: EventType[];
  teams?: string[];
  players?: string[];
  sortBy?: 'time' | 'type' | 'team' | 'player';
  sortOrder?: 'asc' | 'desc';
}

export interface ExportResult {
  success: boolean;
  data?: string | Blob;
  filename?: string;
  message: string;
  errors?: string[];
}

export interface MatchReportData {
  matchInfo: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    date: string;
    venue?: string;
    competition?: string;
  };
  events: Array<{
    id: string;
    type: string;
    minute: number;
    second?: number;
    player?: string;
    team: string;
    description: string;
    coordinates?: { x: number; y: number };
    metadata?: Record<string, any>;
  }>;
  statistics: {
    homeTeam: Record<string, number>;
    awayTeam: Record<string, number>;
    totals: Record<string, number>;
  };
  timeline: Array<{
    time: string;
    events: Array<{
      type: string;
      description: string;
      team: string;
    }>;
  }>;
}

export class EventExportService {
  private static instance: EventExportService;

  private constructor() {}

  public static getInstance(): EventExportService {
    if (!EventExportService.instance) {
      EventExportService.instance = new EventExportService();
    }
    return EventExportService.instance;
  }

  // Export match events to various formats
  public async exportMatchEvents(
    matchId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Get match and events data
      const matchData = await this.getMatchData(matchId);
      const eventsData = await this.getEventsData(matchId, options);
      const statistics = await this.getMatchStatistics(matchId);

      // Generate export data
      const exportData: MatchReportData = {
        matchInfo: matchData,
        events: eventsData,
        statistics,
        timeline: this.generateTimeline(eventsData)
      };

      // Export based on format
      switch (options.format) {
        case 'json':
          return this.exportToJSON(exportData, matchId);
        case 'csv':
          return this.exportToCSV(exportData, matchId);
        case 'xlsx':
          return this.exportToXLSX(exportData, matchId);
        case 'pdf':
          return this.exportToPDF(exportData, matchId);
        default:
          return {
            success: false,
            message: `Unsupported export format: ${options.format}`
          };
      }

    } catch (error) {
      console.error('Error exporting match events:', error);
      return {
        success: false,
        message: 'Failed to export match events',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Export multiple matches
  public async exportMultipleMatches(
    matchIds: string[],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const matchReports: MatchReportData[] = [];

      for (const matchId of matchIds) {
        const matchData = await this.getMatchData(matchId);
        const eventsData = await this.getEventsData(matchId, options);
        const statistics = await this.getMatchStatistics(matchId);

        matchReports.push({
          matchInfo: matchData,
          events: eventsData,
          statistics,
          timeline: this.generateTimeline(eventsData)
        });
      }

      // Export based on format
      switch (options.format) {
        case 'json':
          return this.exportMultipleToJSON(matchReports);
        case 'csv':
          return this.exportMultipleToCSV(matchReports);
        case 'xlsx':
          return this.exportMultipleToXLSX(matchReports);
        default:
          return {
            success: false,
            message: `Unsupported export format for multiple matches: ${options.format}`
          };
      }

    } catch (error) {
      console.error('Error exporting multiple matches:', error);
      return {
        success: false,
        message: 'Failed to export matches',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Export event statistics
  public async exportEventStatistics(
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const statistics = await this.getEventStatistics(options);
      
      switch (options.format) {
        case 'json':
          return this.exportStatisticsToJSON(statistics);
        case 'csv':
          return this.exportStatisticsToCSV(statistics);
        case 'xlsx':
          return this.exportStatisticsToXLSX(statistics);
        default:
          return {
            success: false,
            message: `Unsupported export format for statistics: ${options.format}`
          };
      }

    } catch (error) {
      console.error('Error exporting event statistics:', error);
      return {
        success: false,
        message: 'Failed to export statistics',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Private helper methods
  private async getMatchData(matchId: string): Promise<MatchReportData['matchInfo']> {
    const { data: match, error } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name),
        venue:venues(name)
      `)
      .eq('id', matchId)
      .single();

    if (error || !match) {
      throw new Error('Match not found');
    }

    return {
      id: match.id,
      homeTeam: match.home_team?.name || 'Unknown',
      awayTeam: match.away_team?.name || 'Unknown',
      date: match.scheduled_at,
      venue: match.venue?.name,
      competition: match.competition_name
    };
  }

  private async getEventsData(matchId: string, options: ExportOptions): Promise<MatchReportData['events']> {
    let query = supabase
      .from('match_events')
      .select(`
        *,
        player:players(name),
        team:teams(name)
      `)
      .eq('match_id', matchId);

    // Apply filters
    if (options.eventTypes && options.eventTypes.length > 0) {
      query = query.in('event_type', options.eventTypes);
    }

    if (options.dateRange) {
      query = query
        .gte('created_at', options.dateRange.from.toISOString())
        .lte('created_at', options.dateRange.to.toISOString());
    }

    // Apply sorting
    const sortField = this.getSortField(options.sortBy || 'time');
    query = query.order(sortField, { ascending: options.sortOrder === 'asc' });

    const { data: events, error } = await query;

    if (error) {
      throw error;
    }

    return (events || []).map(event => ({
      id: event.id,
      type: event.event_type,
      minute: event.minute,
      second: event.second_minute,
      player: event.player?.name,
      team: event.team?.name || 'Unknown',
      description: event.description || '',
      coordinates: options.includeCoordinates ? event.coordinates : undefined,
      metadata: options.includeMetadata ? event.metadata : undefined
    }));
  }

  private async getMatchStatistics(matchId: string): Promise<MatchReportData['statistics']> {
    // This would integrate with your existing statistics service
    // For now, return basic statistics
    return {
      homeTeam: {},
      awayTeam: {},
      totals: {}
    };
  }

  private async getEventStatistics(options: ExportOptions): Promise<any> {
    // This would integrate with your existing statistics service
    return {};
  }

  private generateTimeline(events: MatchReportData['events']): MatchReportData['timeline'] {
    const timeline: MatchReportData['timeline'] = [];
    
    // Group events by minute
    const eventsByMinute = events.reduce((acc, event) => {
      const minute = event.minute;
      if (!acc[minute]) {
        acc[minute] = [];
      }
      acc[minute].push({
        type: event.type,
        description: event.description,
        team: event.team
      });
      return acc;
    }, {} as Record<number, any[]>);

    // Convert to timeline format
    Object.entries(eventsByMinute).forEach(([minute, events]) => {
      timeline.push({
        time: `${minute}'`,
        events
      });
    });

    return timeline.sort((a, b) => parseInt(a.time) - parseInt(b.time));
  }

  private getSortField(sortBy: string): string {
    switch (sortBy) {
      case 'time':
        return 'minute';
      case 'type':
        return 'event_type';
      case 'team':
        return 'team_id';
      case 'player':
        return 'player_id';
      default:
        return 'minute';
    }
  }

  // Export format implementations
  private async exportToJSON(data: MatchReportData, matchId: string): Promise<ExportResult> {
    const jsonData = JSON.stringify(data, null, 2);
    const filename = `match-${matchId}-report-${new Date().toISOString().split('T')[0]}.json`;
    
    return {
      success: true,
      data: jsonData,
      filename,
      message: 'JSON export completed successfully'
    };
  }

  private async exportToCSV(data: MatchReportData, matchId: string): Promise<ExportResult> {
    const csvData = this.convertToCSV(data);
    const filename = `match-${matchId}-report-${new Date().toISOString().split('T')[0]}.csv`;
    
    return {
      success: true,
      data: csvData,
      filename,
      message: 'CSV export completed successfully'
    };
  }

  private async exportToXLSX(data: MatchReportData, matchId: string): Promise<ExportResult> {
    // This would require a library like xlsx
    // For now, return a placeholder
    return {
      success: false,
      message: 'XLSX export not implemented yet'
    };
  }

  private async exportToPDF(data: MatchReportData, matchId: string): Promise<ExportResult> {
    // This would require a library like jsPDF or Puppeteer
    // For now, return a placeholder
    return {
      success: false,
      message: 'PDF export not implemented yet'
    };
  }

  private async exportMultipleToJSON(data: MatchReportData[]): Promise<ExportResult> {
    const jsonData = JSON.stringify(data, null, 2);
    const filename = `multiple-matches-report-${new Date().toISOString().split('T')[0]}.json`;
    
    return {
      success: true,
      data: jsonData,
      filename,
      message: 'Multiple matches JSON export completed successfully'
    };
  }

  private async exportMultipleToCSV(data: MatchReportData[]): Promise<ExportResult> {
    // Combine all matches into a single CSV
    const allEvents = data.flatMap(match => 
      match.events.map(event => ({
        ...event,
        matchId: match.matchInfo.id,
        homeTeam: match.matchInfo.homeTeam,
        awayTeam: match.matchInfo.awayTeam,
        matchDate: match.matchInfo.date
      }))
    );

    const csvData = this.convertEventsToCSV(allEvents);
    const filename = `multiple-matches-report-${new Date().toISOString().split('T')[0]}.csv`;
    
    return {
      success: true,
      data: csvData,
      filename,
      message: 'Multiple matches CSV export completed successfully'
    };
  }

  private async exportMultipleToXLSX(data: MatchReportData[]): Promise<ExportResult> {
    return {
      success: false,
      message: 'Multiple matches XLSX export not implemented yet'
    };
  }

  private async exportStatisticsToJSON(data: any): Promise<ExportResult> {
    const jsonData = JSON.stringify(data, null, 2);
    const filename = `event-statistics-${new Date().toISOString().split('T')[0]}.json`;
    
    return {
      success: true,
      data: jsonData,
      filename,
      message: 'Statistics JSON export completed successfully'
    };
  }

  private async exportStatisticsToCSV(data: any): Promise<ExportResult> {
    const csvData = this.convertStatisticsToCSV(data);
    const filename = `event-statistics-${new Date().toISOString().split('T')[0]}.csv`;
    
    return {
      success: true,
      data: csvData,
      filename,
      message: 'Statistics CSV export completed successfully'
    };
  }

  private async exportStatisticsToXLSX(data: any): Promise<ExportResult> {
    return {
      success: false,
      message: 'Statistics XLSX export not implemented yet'
    };
  }

  // CSV conversion helpers
  private convertToCSV(data: MatchReportData): string {
    const headers = [
      'Match ID',
      'Home Team',
      'Away Team',
      'Date',
      'Event ID',
      'Event Type',
      'Minute',
      'Second',
      'Player',
      'Team',
      'Description'
    ];

    const rows = data.events.map(event => [
      data.matchInfo.id,
      data.matchInfo.homeTeam,
      data.matchInfo.awayTeam,
      data.matchInfo.date,
      event.id,
      event.type,
      event.minute,
      event.second || '',
      event.player || '',
      event.team,
      event.description
    ]);

    return [headers, ...rows].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');
  }

  private convertEventsToCSV(events: any[]): string {
    const headers = [
      'Match ID',
      'Home Team',
      'Away Team',
      'Match Date',
      'Event ID',
      'Event Type',
      'Minute',
      'Second',
      'Player',
      'Team',
      'Description'
    ];

    const rows = events.map(event => [
      event.matchId,
      event.homeTeam,
      event.awayTeam,
      event.matchDate,
      event.id,
      event.type,
      event.minute,
      event.second || '',
      event.player || '',
      event.team,
      event.description
    ]);

    return [headers, ...rows].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');
  }

  private convertStatisticsToCSV(data: any): string {
    // Implementation would depend on your statistics structure
    return 'Statistics CSV export not implemented';
  }

  // Utility methods
  public generateFilename(prefix: string, format: string, matchId?: string): string {
    const date = new Date().toISOString().split('T')[0];
    const matchSuffix = matchId ? `-${matchId}` : '';
    return `${prefix}${matchSuffix}-${date}.${format}`;
  }

  public downloadFile(data: string | Blob, filename: string): void {
    const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const eventExportService = EventExportService.getInstance();
