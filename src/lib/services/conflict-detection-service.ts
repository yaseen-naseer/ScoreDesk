import { Database } from '@/lib/supabase/types'

type Match = Database['public']['Tables']['matches']['Row']
type Referee = Database['public']['Tables']['referees']['Row']
type Team = Database['public']['Tables']['teams']['Row']

export interface ConflictRule {
  id: string
  name: string
  description: string
  rule_type: ConflictRuleType
  severity: 'low' | 'medium' | 'high' | 'critical'
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ConflictRuleType = 
  | 'team_affiliation'
  | 'family_relationship'
  | 'business_relationship'
  | 'recent_matches'
  | 'geographical_proximity'
  | 'personal_relationship'
  | 'financial_interest'

export interface ConflictDetectionResult {
  match_id: string
  has_conflicts: boolean
  conflicts: Conflict[]
  warnings: Conflict[]
  risk_score: number
  detected_at: string
}

export interface Conflict {
  id: string
  rule_id: string
  rule_name: string
  conflict_type: ConflictRuleType
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  affected_parties: AffectedParty[]
  can_override: boolean
  override_justification_required: boolean
}

export interface AffectedParty {
  type: 'referee' | 'team' | 'player'
  entity_id: string
  entity_name: string
  role: string
}

export class ConflictDetectionService {
  constructor(private supabase: any) {}

  /**
   * Detect all conflicts for a match
   */
  async detectMatchConflicts(matchId: string): Promise<ConflictDetectionResult> {
    try {
      const matchDetails = await this.getMatchDetails(matchId)
      if (!matchDetails) {
        throw new Error('Match not found')
      }

      const rules = await this.getActiveConflictRules()
      const conflicts: Conflict[] = []
      const warnings: Conflict[] = []

      for (const rule of rules) {
        const ruleConflicts = await this.evaluateConflictRule(matchDetails, rule)
        
        for (const conflict of ruleConflicts) {
          if (conflict.severity === 'critical' || conflict.severity === 'high') {
            conflicts.push(conflict)
          } else {
            warnings.push(conflict)
          }
        }
      }

      const riskScore = this.calculateRiskScore(conflicts, warnings)

      return {
        match_id: matchId,
        has_conflicts: conflicts.length > 0,
        conflicts,
        warnings,
        risk_score: riskScore,
        detected_at: new Date().toISOString()
      }

    } catch (error) {
      console.error('Error detecting match conflicts:', error)
      throw error
    }
  }

  /**
   * Get active conflict rules
   */
  async getActiveConflictRules(): Promise<ConflictRule[]> {
    try {
      const { data } = await this.supabase
        .from('conflict_rules')
        .select('*')
        .eq('is_active', true)
        .order('severity', { ascending: false })

      return data || []

    } catch (error) {
      console.error('Error getting conflict rules:', error)
      return []
    }
  }

  /**
   * Save a conflict rule
   */
  async saveConflictRule(rule: Omit<ConflictRule, 'id' | 'created_at' | 'updated_at'>): Promise<ConflictRule> {
    try {
      const { data, error } = await this.supabase
        .from('conflict_rules')
        .upsert({
          ...rule,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data

    } catch (error) {
      console.error('Error saving conflict rule:', error)
      throw error
    }
  }

  /**
   * Private helper methods
   */
  private async getMatchDetails(matchId: string): Promise<any> {
    try {
      const { data } = await this.supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(*),
          away_team:teams!matches_away_team_id_fkey(*),
          match_officials (
            *,
            referee:referees(*)
          )
        `)
        .eq('id', matchId)
        .single()

      return data

    } catch (error) {
      console.error('Error getting match details:', error)
      return null
    }
  }

  private async evaluateConflictRule(matchDetails: any, rule: ConflictRule): Promise<Conflict[]> {
    const conflicts: Conflict[] = []

    switch (rule.rule_type) {
      case 'team_affiliation':
        conflicts.push(...await this.detectTeamAffiliationConflicts(matchDetails, rule))
        break
      case 'recent_matches':
        conflicts.push(...await this.detectRecentMatchesConflicts(matchDetails, rule))
        break
      case 'family_relationship':
        conflicts.push(...await this.detectFamilyRelationshipConflicts(matchDetails, rule))
        break
      default:
        // Other conflict types
        break
    }

    return conflicts
  }

  private async detectTeamAffiliationConflicts(matchDetails: any, rule: ConflictRule): Promise<Conflict[]> {
    const conflicts: Conflict[] = []

    for (const official of matchDetails.match_officials) {
      const referee = official.referee
      
      // Check home team affiliation
      if (await this.hasTeamAffiliation(referee.id, matchDetails.home_team_id)) {
        conflicts.push({
          id: `affiliation_${referee.id}_${matchDetails.home_team_id}`,
          rule_id: rule.id,
          rule_name: rule.name,
          conflict_type: 'team_affiliation',
          severity: rule.severity,
          description: `${referee.name} has affiliation with ${matchDetails.home_team.name}`,
          affected_parties: [
            { type: 'referee', entity_id: referee.id, entity_name: referee.name, role: official.role },
            { type: 'team', entity_id: matchDetails.home_team_id, entity_name: matchDetails.home_team.name, role: 'home_team' }
          ],
          can_override: true,
          override_justification_required: true
        })
      }

      // Check away team affiliation
      if (await this.hasTeamAffiliation(referee.id, matchDetails.away_team_id)) {
        conflicts.push({
          id: `affiliation_${referee.id}_${matchDetails.away_team_id}`,
          rule_id: rule.id,
          rule_name: rule.name,
          conflict_type: 'team_affiliation',
          severity: rule.severity,
          description: `${referee.name} has affiliation with ${matchDetails.away_team.name}`,
          affected_parties: [
            { type: 'referee', entity_id: referee.id, entity_name: referee.name, role: official.role },
            { type: 'team', entity_id: matchDetails.away_team_id, entity_name: matchDetails.away_team.name, role: 'away_team' }
          ],
          can_override: true,
          override_justification_required: true
        })
      }
    }

    return conflicts
  }

  private async detectRecentMatchesConflicts(matchDetails: any, rule: ConflictRule): Promise<Conflict[]> {
    const conflicts: Conflict[] = []

    for (const official of matchDetails.match_officials) {
      const referee = official.referee
      
      const recentHomeTeamMatches = await this.getRecentMatches(referee.id, matchDetails.home_team_id, 30)
      const recentAwayTeamMatches = await this.getRecentMatches(referee.id, matchDetails.away_team_id, 30)

      if (recentHomeTeamMatches.length > 2) {
        conflicts.push({
          id: `recent_${referee.id}_${matchDetails.home_team_id}`,
          rule_id: rule.id,
          rule_name: rule.name,
          conflict_type: 'recent_matches',
          severity: 'medium',
          description: `${referee.name} has officiated ${recentHomeTeamMatches.length} recent matches for ${matchDetails.home_team.name}`,
          affected_parties: [
            { type: 'referee', entity_id: referee.id, entity_name: referee.name, role: official.role },
            { type: 'team', entity_id: matchDetails.home_team_id, entity_name: matchDetails.home_team.name, role: 'home_team' }
          ],
          can_override: true,
          override_justification_required: false
        })
      }

      if (recentAwayTeamMatches.length > 2) {
        conflicts.push({
          id: `recent_${referee.id}_${matchDetails.away_team_id}`,
          rule_id: rule.id,
          rule_name: rule.name,
          conflict_type: 'recent_matches',
          severity: 'medium',
          description: `${referee.name} has officiated ${recentAwayTeamMatches.length} recent matches for ${matchDetails.away_team.name}`,
          affected_parties: [
            { type: 'referee', entity_id: referee.id, entity_name: referee.name, role: official.role },
            { type: 'team', entity_id: matchDetails.away_team_id, entity_name: matchDetails.away_team.name, role: 'away_team' }
          ],
          can_override: true,
          override_justification_required: false
        })
      }
    }

    return conflicts
  }

  private async detectFamilyRelationshipConflicts(matchDetails: any, rule: ConflictRule): Promise<Conflict[]> {
    // Implementation for family relationship conflicts
    return []
  }

  private calculateRiskScore(conflicts: Conflict[], warnings: Conflict[]): number {
    let score = 0
    
    conflicts.forEach(conflict => {
      switch (conflict.severity) {
        case 'critical': score += 100; break
        case 'high': score += 75; break
        case 'medium': score += 50; break
        case 'low': score += 25; break
      }
    })

    warnings.forEach(warning => {
      switch (warning.severity) {
        case 'high': score += 30; break
        case 'medium': score += 20; break
        case 'low': score += 10; break
      }
    })

    return Math.min(score, 100)
  }

  private async hasTeamAffiliation(refereeId: string, teamId: string): Promise<boolean> {
    // Check if referee has current or past affiliation with team
    return false // Placeholder - would check database for affiliations
  }

  private async getRecentMatches(refereeId: string, teamId: string, days: number): Promise<any[]> {
    try {
      const { data } = await this.supabase
        .from('match_officials')
        .select(`
          *,
          match:matches(*)
        `)
        .eq('referee_id', refereeId)
        .gte('match.scheduled_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .or(`match.home_team_id.eq.${teamId},match.away_team_id.eq.${teamId}`)

      return data?.map(mo => mo.match).filter(Boolean) || []
    } catch (error) {
      console.error('Error getting recent matches:', error)
      return []
    }
  }
}