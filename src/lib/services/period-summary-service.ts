/**
 * Period Summary Service
 * Tracks and manages period summaries with key events and duration tracking
 */

import { MatchEventService, EventTimelineItem } from './match-event-service'

export interface PeriodEvent {
  id: string
  minute: number
  second?: number
  type: string
  description: string
  teamId: string
  playerId?: string
  timestamp: Date
  importance: 'low' | 'medium' | 'high' | 'critical'
}

export interface PeriodSummary {
  period: 'H1' | 'HT' | 'H2' | 'FT' | 'ET1' | 'ET2' | 'AET' | 'PEN'
  startTime: Date
  endTime?: Date
  duration: number // in milliseconds
  events: PeriodEvent[]
  stoppageTime: number // in milliseconds
  injuryTime: number // in milliseconds
  keyMoments: PeriodEvent[]
  statistics: {
    totalEvents: number
    goals: number
    cards: number
    substitutions: number
    corners: number
    fouls: number
    offsides: number
    shots: number
    saves: number
  }
  notes?: string
}

export interface PeriodComparison {
  period1: PeriodSummary
  period2: PeriodSummary
  comparison: {
    eventsDifference: number
    goalsDifference: number
    cardsDifference: number
    durationDifference: number
    intensityRatio: number // events per minute
  }
}

export class PeriodSummaryService {
  private matchEventService: MatchEventService
  private summaries: Map<string, PeriodSummary> = new Map()
  private currentPeriod: string | null = null
  private currentPeriodStart: Date | null = null

  constructor(matchEventService: MatchEventService) {
    this.matchEventService = matchEventService
  }

  /**
   * Start tracking a new period
   */
  startPeriod(matchId: string, period: PeriodSummary['period']): PeriodSummary {
    const periodKey = `${matchId}-${period}`
    
    // End previous period if it exists
    if (this.currentPeriod && this.currentPeriodStart) {
      this.endCurrentPeriod(matchId)
    }

    const now = new Date()
    const summary: PeriodSummary = {
      period,
      startTime: now,
      duration: 0,
      events: [],
      stoppageTime: 0,
      injuryTime: 0,
      keyMoments: [],
      statistics: {
        totalEvents: 0,
        goals: 0,
        cards: 0,
        substitutions: 0,
        corners: 0,
        fouls: 0,
        offsides: 0,
        shots: 0,
        saves: 0
      }
    }

    this.summaries.set(periodKey, summary)
    this.currentPeriod = periodKey
    this.currentPeriodStart = now

    return summary
  }

  /**
   * End the current period
   */
  endCurrentPeriod(matchId: string): PeriodSummary | null {
    if (!this.currentPeriod || !this.currentPeriodStart) {
      return null
    }

    const summary = this.summaries.get(this.currentPeriod)
    if (!summary) {
      return null
    }

    const now = new Date()
    summary.endTime = now
    summary.duration = now.getTime() - summary.startTime.getTime()

    // Calculate intensity ratio
    const minutes = summary.duration / 60000
    summary.statistics.totalEvents = summary.events.length

    // Identify key moments
    summary.keyMoments = this.identifyKeyMoments(summary.events)

    this.currentPeriod = null
    this.currentPeriodStart = null

    return summary
  }

  /**
   * Add event to current period
   */
  addEvent(matchId: string, event: EventTimelineItem): void {
    if (!this.currentPeriod) {
      return
    }

    const summary = this.summaries.get(this.currentPeriod)
    if (!summary) {
      return
    }

    const periodEvent: PeriodEvent = {
      id: event.id,
      minute: event.minute,
      second: event.second_minute,
      type: event.event_type,
      description: this.generateEventDescription(event),
      teamId: event.team_id,
      playerId: event.player_id,
      timestamp: new Date(event.created_at),
      importance: this.calculateEventImportance(event.event_type)
    }

    summary.events.push(periodEvent)
    this.updateStatistics(summary, periodEvent)
  }

  /**
   * Add stoppage time to current period
   */
  addStoppageTime(matchId: string, minutes: number): void {
    if (!this.currentPeriod) {
      return
    }

    const summary = this.summaries.get(this.currentPeriod)
    if (summary) {
      summary.stoppageTime += minutes * 60000 // convert to milliseconds
    }
  }

  /**
   * Add injury time to current period
   */
  addInjuryTime(matchId: string, milliseconds: number): void {
    if (!this.currentPeriod) {
      return
    }

    const summary = this.summaries.get(this.currentPeriod)
    if (summary) {
      summary.injuryTime += milliseconds
    }
  }

  /**
   * Get summary for a specific period
   */
  getPeriodSummary(matchId: string, period: PeriodSummary['period']): PeriodSummary | null {
    const periodKey = `${matchId}-${period}`
    return this.summaries.get(periodKey) || null
  }

  /**
   * Get all summaries for a match
   */
  getMatchSummaries(matchId: string): PeriodSummary[] {
    const summaries: PeriodSummary[] = []
    for (const [key, summary] of this.summaries) {
      if (key.startsWith(`${matchId}-`)) {
        summaries.push(summary)
      }
    }
    return summaries.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  }

  /**
   * Compare two periods
   */
  comparePeriods(matchId: string, period1: PeriodSummary['period'], period2: PeriodSummary['period']): PeriodComparison | null {
    const summary1 = this.getPeriodSummary(matchId, period1)
    const summary2 = this.getPeriodSummary(matchId, period2)

    if (!summary1 || !summary2) {
      return null
    }

    return {
      period1: summary1,
      period2: summary2,
      comparison: {
        eventsDifference: summary2.statistics.totalEvents - summary1.statistics.totalEvents,
        goalsDifference: summary2.statistics.goals - summary1.statistics.goals,
        cardsDifference: summary2.statistics.cards - summary1.statistics.cards,
        durationDifference: summary2.duration - summary1.duration,
        intensityRatio: this.calculateIntensityRatio(summary1, summary2)
      }
    }
  }

  /**
   * Generate period report
   */
  generatePeriodReport(matchId: string, period: PeriodSummary['period']): string {
    const summary = this.getPeriodSummary(matchId, period)
    if (!summary) {
      return `No data available for ${period}`
    }

    const durationMinutes = Math.floor(summary.duration / 60000)
    const durationSeconds = Math.floor((summary.duration % 60000) / 1000)
    const stoppageMinutes = Math.floor(summary.stoppageTime / 60000)

    let report = `=== ${period} SUMMARY ===\n`
    report += `Duration: ${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}\n`
    report += `Stoppage Time: ${stoppageMinutes} minutes\n`
    report += `Total Events: ${summary.statistics.totalEvents}\n\n`

    report += `STATISTICS:\n`
    report += `- Goals: ${summary.statistics.goals}\n`
    report += `- Cards: ${summary.statistics.cards}\n`
    report += `- Substitutions: ${summary.statistics.substitutions}\n`
    report += `- Corners: ${summary.statistics.corners}\n`
    report += `- Fouls: ${summary.statistics.fouls}\n`
    report += `- Offsides: ${summary.statistics.offsides}\n\n`

    if (summary.keyMoments.length > 0) {
      report += `KEY MOMENTS:\n`
      summary.keyMoments.forEach((moment, index) => {
        const timeStr = moment.second 
          ? `${moment.minute}:${moment.second.toString().padStart(2, '0')}`
          : `${moment.minute}'`
        report += `${index + 1}. ${timeStr} - ${moment.description}\n`
      })
    }

    if (summary.notes) {
      report += `\nNOTES:\n${summary.notes}`
    }

    return report
  }

  /**
   * Add notes to a period
   */
  addPeriodNotes(matchId: string, period: PeriodSummary['period'], notes: string): void {
    const summary = this.getPeriodSummary(matchId, period)
    if (summary) {
      summary.notes = notes
    }
  }

  /**
   * Clear all summaries for a match
   */
  clearMatchSummaries(matchId: string): void {
    for (const [key] of this.summaries) {
      if (key.startsWith(`${matchId}-`)) {
        this.summaries.delete(key)
      }
    }
  }

  /**
   * Export summaries to JSON
   */
  exportSummaries(matchId: string): string {
    const summaries = this.getMatchSummaries(matchId)
    return JSON.stringify(summaries, null, 2)
  }

  // Private methods

  private generateEventDescription(event: EventTimelineItem): string {
    const timeStr = event.second_minute 
      ? `${event.minute}:${event.second_minute.toString().padStart(2, '0')}`
      : `${event.minute}'`

    switch (event.event_type) {
      case 'goal':
        return `${timeStr} - GOAL! ${event.player_name} (${event.team_name})`
      case 'own_goal':
        return `${timeStr} - OWN GOAL! ${event.player_name} (${event.team_name})`
      case 'penalty_goal':
        return `${timeStr} - PENALTY GOAL! ${event.player_name} (${event.team_name})`
      case 'penalty_miss':
        return `${timeStr} - Penalty missed by ${event.player_name} (${event.team_name})`
      case 'yellow_card':
        return `${timeStr} - Yellow card for ${event.player_name} (${event.team_name})`
      case 'red_card':
        return `${timeStr} - Red card for ${event.player_name} (${event.team_name})`
      case 'second_yellow_card':
        return `${timeStr} - Second yellow card for ${event.player_name} (${event.team_name})`
      case 'substitution':
        return `${timeStr} - Substitution: ${event.player_name} replaces ${event.substituted_player_name} (${event.team_name})`
      case 'corner':
        return `${timeStr} - Corner kick for ${event.team_name}`
      case 'free_kick':
        return `${timeStr} - Free kick for ${event.team_name}`
      case 'offside':
        return `${timeStr} - Offside against ${event.team_name}`
      case 'foul':
        return `${timeStr} - Foul by ${event.player_name} (${event.team_name})`
      default:
        return `${timeStr} - ${event.event_type} (${event.team_name})`
    }
  }

  private calculateEventImportance(eventType: string): PeriodEvent['importance'] {
    switch (eventType) {
      case 'goal':
      case 'own_goal':
      case 'penalty_goal':
      case 'red_card':
      case 'penalty_miss':
        return 'critical'
      case 'yellow_card':
      case 'second_yellow_card':
      case 'substitution':
        return 'high'
      case 'corner':
      case 'free_kick':
      case 'foul':
        return 'medium'
      case 'offside':
        return 'low'
      default:
        return 'medium'
    }
  }

  private updateStatistics(summary: PeriodSummary, event: PeriodEvent): void {
    const stats = summary.statistics

    switch (event.type) {
      case 'goal':
      case 'own_goal':
      case 'penalty_goal':
        stats.goals++
        stats.shots++
        break
      case 'penalty_miss':
        stats.shots++
        break
      case 'yellow_card':
      case 'red_card':
      case 'second_yellow_card':
        stats.cards++
        break
      case 'substitution':
        stats.substitutions++
        break
      case 'corner':
        stats.corners++
        break
      case 'foul':
        stats.fouls++
        break
      case 'offside':
        stats.offsides++
        break
    }
  }

  private identifyKeyMoments(events: PeriodEvent[]): PeriodEvent[] {
    // Return events with high or critical importance, sorted by time
    return events
      .filter(event => event.importance === 'high' || event.importance === 'critical')
      .sort((a, b) => {
        const timeA = a.minute * 60 + (a.second || 0)
        const timeB = b.minute * 60 + (b.second || 0)
        return timeA - timeB
      })
  }

  private calculateIntensityRatio(summary1: PeriodSummary, summary2: PeriodSummary): number {
    const intensity1 = summary1.statistics.totalEvents / (summary1.duration / 60000)
    const intensity2 = summary2.statistics.totalEvents / (summary2.duration / 60000)
    return intensity2 / intensity1
  }
}
