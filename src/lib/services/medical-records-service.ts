/**
 * Medical Records Service
 * Handles medical information storage, eligibility tracking, and compliance monitoring
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

export interface MedicalRecord {
  id: string
  player_id: string
  type: 'injury' | 'illness' | 'vaccination' | 'checkup' | 'treatment'
  title: string
  description: string
  date: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'resolved' | 'ongoing' | 'monitoring'
  doctor?: string
  clinic?: string
  medications?: string[]
  follow_up_date?: string
  restrictions?: string[]
  attachments?: string[]
  is_confidential: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface EligibilityStatus {
  id: string
  player_id: string
  status: 'eligible' | 'ineligible' | 'pending' | 'suspended'
  reason?: string
  valid_from: string
  valid_until?: string
  requirements: EligibilityRequirement[]
  last_checked: string
  checked_by: string
  created_at: string
  updated_at: string
}

export interface EligibilityRequirement {
  id: string
  name: string
  type: 'medical' | 'administrative' | 'disciplinary' | 'contractual'
  status: 'met' | 'pending' | 'failed' | 'expired'
  due_date?: string
  completed_date?: string
  notes?: string
  required: boolean
}

export interface InsuranceInfo {
  id: string
  player_id: string
  provider: string
  policy_number: string
  coverage_type: 'health' | 'injury' | 'disability' | 'life'
  valid_from: string
  valid_until: string
  coverage_amount?: number
  deductible?: number
  emergency_contact?: string
  emergency_phone?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface ComplianceCheck {
  id: string
  player_id: string
  requirement_type: string
  requirement_name: string
  status: 'compliant' | 'non_compliant' | 'pending' | 'expired'
  due_date?: string
  completed_date?: string
  notes?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
  updated_at: string
}

class MedicalRecordsService {
  /**
   * Create a new medical record
   */
  async createMedicalRecord(data: Omit<MedicalRecord, 'id' | 'created_at' | 'updated_at'>): Promise<MedicalRecord | null> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      const { data: record, error } = await supabase
        .from('medical_records')
        .insert({
          player_id: data.player_id,
          type: data.type,
          title: data.title,
          description: data.description,
          date: data.date,
          severity: data.severity,
          status: data.status,
          doctor: data.doctor,
          clinic: data.clinic,
          medications: data.medications,
          follow_up_date: data.follow_up_date,
          restrictions: data.restrictions,
          attachments: data.attachments,
          is_confidential: data.is_confidential,
          created_by: data.created_by
        })
        .select()
        .single()

      if (error) throw error
      return record as MedicalRecord
    } catch (error) {
      console.error('Error creating medical record:', error)
      return null
    }
  }

  /**
   * Get medical records for a player
   */
  async getPlayerMedicalRecords(playerId: string, includeConfidential: boolean = false): Promise<MedicalRecord[]> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      let query = supabase
        .from('medical_records')
        .select('*')
        .eq('player_id', playerId)
        .order('date', { ascending: false })

      if (!includeConfidential) {
        query = query.eq('is_confidential', false)
      }

      const { data, error } = await query

      if (error) throw error
      return data as MedicalRecord[]
    } catch (error) {
      console.error('Error getting medical records:', error)
      return []
    }
  }

  /**
   * Update a medical record
   */
  async updateMedicalRecord(recordId: string, updates: Partial<MedicalRecord>): Promise<MedicalRecord | null> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      const { data, error } = await supabase
        .from('medical_records')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId)
        .select()
        .single()

      if (error) throw error
      return data as MedicalRecord
    } catch (error) {
      console.error('Error updating medical record:', error)
      return null
    }
  }

  /**
   * Delete a medical record
   */
  async deleteMedicalRecord(recordId: string): Promise<boolean> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      const { error } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', recordId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting medical record:', error)
      return false
    }
  }

  /**
   * Get eligibility status for a player
   */
  async getPlayerEligibilityStatus(playerId: string): Promise<EligibilityStatus | null> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      const { data, error } = await supabase
        .from('eligibility_status')
        .select('*')
        .eq('player_id', playerId)
        .single()

      if (error) throw error
      return data as EligibilityStatus
    } catch (error) {
      console.error('Error getting eligibility status:', error)
      return null
    }
  }

  /**
   * Update eligibility status for a player
   */
  async updateEligibilityStatus(playerId: string, status: EligibilityStatus): Promise<EligibilityStatus | null> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      const { data, error } = await supabase
        .from('eligibility_status')
        .upsert({
          player_id: playerId,
          status: status.status,
          reason: status.reason,
          valid_from: status.valid_from,
          valid_until: status.valid_until,
          requirements: status.requirements,
          last_checked: status.last_checked,
          checked_by: status.checked_by,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data as EligibilityStatus
    } catch (error) {
      console.error('Error updating eligibility status:', error)
      return null
    }
  }

  /**
   * Get insurance information for a player
   */
  async getPlayerInsuranceInfo(playerId: string): Promise<InsuranceInfo[]> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      const { data, error } = await supabase
        .from('insurance_info')
        .select('*')
        .eq('player_id', playerId)
        .order('valid_until', { ascending: false })

      if (error) throw error
      return data as InsuranceInfo[]
    } catch (error) {
      console.error('Error getting insurance info:', error)
      return []
    }
  }

  /**
   * Add insurance information for a player
   */
  async addInsuranceInfo(data: Omit<InsuranceInfo, 'id' | 'created_at' | 'updated_at'>): Promise<InsuranceInfo | null> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      const { data: insurance, error } = await supabase
        .from('insurance_info')
        .insert({
          player_id: data.player_id,
          provider: data.provider,
          policy_number: data.policy_number,
          coverage_type: data.coverage_type,
          valid_from: data.valid_from,
          valid_until: data.valid_until,
          coverage_amount: data.coverage_amount,
          deductible: data.deductible,
          emergency_contact: data.emergency_contact,
          emergency_phone: data.emergency_phone,
          notes: data.notes
        })
        .select()
        .single()

      if (error) throw error
      return insurance as InsuranceInfo
    } catch (error) {
      console.error('Error adding insurance info:', error)
      return null
    }
  }

  /**
   * Update insurance information
   */
  async updateInsuranceInfo(insuranceId: string, updates: Partial<InsuranceInfo>): Promise<InsuranceInfo | null> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      const { data, error } = await supabase
        .from('insurance_info')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', insuranceId)
        .select()
        .single()

      if (error) throw error
      return data as InsuranceInfo
    } catch (error) {
      console.error('Error updating insurance info:', error)
      return null
    }
  }

  /**
   * Delete insurance information
   */
  async deleteInsuranceInfo(insuranceId: string): Promise<boolean> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      const { error } = await supabase
        .from('insurance_info')
        .delete()
        .eq('id', insuranceId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting insurance info:', error)
      return false
    }
  }

  /**
   * Get compliance checks for a player
   */
  async getPlayerComplianceChecks(playerId: string): Promise<ComplianceCheck[]> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      const { data, error } = await supabase
        .from('compliance_checks')
        .select('*')
        .eq('player_id', playerId)
        .order('due_date', { ascending: true })

      if (error) throw error
      return data as ComplianceCheck[]
    } catch (error) {
      console.error('Error getting compliance checks:', error)
      return []
    }
  }

  /**
   * Update compliance check status
   */
  async updateComplianceCheck(checkId: string, updates: Partial<ComplianceCheck>): Promise<ComplianceCheck | null> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      const { data, error } = await supabase
        .from('compliance_checks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', checkId)
        .select()
        .single()

      if (error) throw error
      return data as ComplianceCheck
    } catch (error) {
      console.error('Error updating compliance check:', error)
      return null
    }
  }

  /**
   * Get players with expiring eligibility
   */
  async getPlayersWithExpiringEligibility(daysAhead: number = 30): Promise<EligibilityStatus[]> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + daysAhead)
      
      const { data, error } = await supabase
        .from('eligibility_status')
        .select('*')
        .lte('valid_until', futureDate.toISOString())
        .eq('status', 'eligible')

      if (error) throw error
      return data as EligibilityStatus[]
    } catch (error) {
      console.error('Error getting expiring eligibility:', error)
      return []
    }
  }

  /**
   * Get players with pending medical requirements
   */
  async getPlayersWithPendingRequirements(): Promise<Array<{ playerId: string; requirements: EligibilityRequirement[] }>> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      const { data, error } = await supabase
        .from('eligibility_status')
        .select('player_id, requirements')
        .contains('requirements', [{ status: 'pending' }])

      if (error) throw error
      
      return data.map(item => ({
        playerId: item.player_id,
        requirements: item.requirements.filter((req: EligibilityRequirement) => req.status === 'pending')
      }))
    } catch (error) {
      console.error('Error getting pending requirements:', error)
      return []
    }
  }

  /**
   * Get medical records summary for a team
   */
  async getTeamMedicalSummary(teamId: string): Promise<{
    totalRecords: number
    activeInjuries: number
    pendingCheckups: number
    expiredInsurance: number
    complianceRate: number
  }> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      // Get all players for the team
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id')
        .eq('team_id', teamId)

      if (playersError) throw playersError
      if (!players || players.length === 0) {
        return {
          totalRecords: 0,
          activeInjuries: 0,
          pendingCheckups: 0,
          expiredInsurance: 0,
          complianceRate: 0
        }
      }

      const playerIds = players.map(p => p.id)

      // Get medical records count
      const { count: totalRecords } = await supabase
        .from('medical_records')
        .select('*', { count: 'exact', head: true })
        .in('player_id', playerIds)

      // Get active injuries count
      const { count: activeInjuries } = await supabase
        .from('medical_records')
        .select('*', { count: 'exact', head: true })
        .in('player_id', playerIds)
        .eq('type', 'injury')
        .eq('status', 'active')

      // Get pending checkups count
      const { count: pendingCheckups } = await supabase
        .from('medical_records')
        .select('*', { count: 'exact', head: true })
        .in('player_id', playerIds)
        .eq('type', 'checkup')
        .eq('status', 'pending')

      // Get expired insurance count
      const { count: expiredInsurance } = await supabase
        .from('insurance_info')
        .select('*', { count: 'exact', head: true })
        .in('player_id', playerIds)
        .lt('valid_until', new Date().toISOString())

      // Calculate compliance rate
      const { data: eligibilityStatuses } = await supabase
        .from('eligibility_status')
        .select('status')
        .in('player_id', playerIds)

      const eligibleCount = eligibilityStatuses?.filter(s => s.status === 'eligible').length || 0
      const complianceRate = players.length > 0 ? (eligibleCount / players.length) * 100 : 0

      return {
        totalRecords: totalRecords || 0,
        activeInjuries: activeInjuries || 0,
        pendingCheckups: pendingCheckups || 0,
        expiredInsurance: expiredInsurance || 0,
        complianceRate: Math.round(complianceRate)
      }
    } catch (error) {
      console.error('Error getting team medical summary:', error)
      return {
        totalRecords: 0,
        activeInjuries: 0,
        pendingCheckups: 0,
        expiredInsurance: 0,
        complianceRate: 0
      }
    }
  }

  /**
   * Generate medical report for a player
   */
  async generatePlayerMedicalReport(playerId: string): Promise<{
    player: any
    eligibility: EligibilityStatus | null
    medicalRecords: MedicalRecord[]
    insuranceInfo: InsuranceInfo[]
    complianceChecks: ComplianceCheck[]
    summary: {
      totalRecords: number
      activeIssues: number
      complianceRate: number
      nextDueDate?: string
    }
  }> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      // Get player info
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single()

      if (playerError) throw playerError

      // Get all related data
      const [eligibility, medicalRecords, insuranceInfo, complianceChecks] = await Promise.all([
        this.getPlayerEligibilityStatus(playerId),
        this.getPlayerMedicalRecords(playerId, true),
        this.getPlayerInsuranceInfo(playerId),
        this.getPlayerComplianceChecks(playerId)
      ])

      // Calculate summary
      const activeIssues = medicalRecords.filter(r => r.status === 'active' || r.status === 'ongoing').length
      const complianceRate = complianceChecks.length > 0 ? 
        (complianceChecks.filter(c => c.status === 'compliant').length / complianceChecks.length) * 100 : 100
      
      const nextDueDate = complianceChecks
        .filter(c => c.status === 'pending' && c.due_date)
        .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0]?.due_date

      return {
        player,
        eligibility,
        medicalRecords,
        insuranceInfo,
        complianceChecks,
        summary: {
          totalRecords: medicalRecords.length,
          activeIssues,
          complianceRate: Math.round(complianceRate),
          nextDueDate
        }
      }
    } catch (error) {
      console.error('Error generating medical report:', error)
      throw error
    }
  }
}

export const medicalRecordsService = new MedicalRecordsService()
export default MedicalRecordsService
