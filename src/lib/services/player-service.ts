/**
 * Player Service
 * Handles player registration, management, and operations
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

export interface PlayerRegistrationData {
  first_name: string
  last_name: string
  date_of_birth: string
  nationality?: string
  position: 'goalkeeper' | 'defender' | 'midfielder' | 'forward' | 'utility'
  preferred_foot: 'left' | 'right' | 'both'
  jersey_number?: number
  height?: number // in cm
  weight?: number // in kg
  phone?: string
  email?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  medical_conditions?: string
  allergies?: string
  medications?: string
  insurance_provider?: string
  insurance_policy_number?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  profile_image_url?: string
  status: 'active' | 'injured' | 'suspended' | 'inactive'
  contract_start_date?: string
  contract_end_date?: string
  salary?: number
  transfer_fee?: number
  notes?: string
}

export interface PlayerProfile {
  id: string
  team_id: string
  first_name: string
  last_name: string
  date_of_birth: string
  nationality?: string
  position: 'goalkeeper' | 'defender' | 'midfielder' | 'forward' | 'utility'
  preferred_foot: 'left' | 'right' | 'both'
  jersey_number?: number
  height?: number
  weight?: number
  phone?: string
  email?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  medical_conditions?: string
  allergies?: string
  medications?: string
  insurance_provider?: string
  insurance_policy_number?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  profile_image_url?: string
  status: 'active' | 'injured' | 'suspended' | 'inactive'
  contract_start_date?: string
  contract_end_date?: string
  salary?: number
  transfer_fee?: number
  notes?: string
  created_at: string
  updated_at: string
  statistics?: PlayerStatistics
  age?: number
  full_name?: string
}

export interface PlayerStatistics {
  totalMatches: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  minutesPlayed: number
  averageRating: number
  cleanSheets?: number // for goalkeepers
  saves?: number // for goalkeepers
  tackles?: number // for defenders
  interceptions?: number // for defenders
  passesCompleted?: number
  passAccuracy?: number
  shotsOnTarget?: number
  shotsOffTarget?: number
}

export interface PlayerSearchFilters {
  search?: string
  position?: 'goalkeeper' | 'defender' | 'midfielder' | 'forward' | 'utility'
  status?: 'active' | 'injured' | 'suspended' | 'inactive'
  nationality?: string
  age_min?: number
  age_max?: number
  jersey_number?: number
}

class PlayerService {
  private supabase = createClientComponentClient<Database>()

  /**
   * Register a new player
   */
  async registerPlayer(
    teamId: string,
    playerData: PlayerRegistrationData
  ): Promise<{ success: boolean; player?: PlayerProfile; error?: string }> {
    try {
      // Check if jersey number is available
      if (playerData.jersey_number) {
        const isAvailable = await this.isJerseyNumberAvailable(teamId, playerData.jersey_number)
        if (!isAvailable) {
          return {
            success: false,
            error: `Jersey number ${playerData.jersey_number} is already taken`
          }
        }
      }

      // Insert player
      const { data: player, error } = await this.supabase
        .from('players')
        .insert({
          team_id: teamId,
          ...playerData
        })
        .select()
        .single()

      if (error) {
        console.error('Error registering player:', error)
        return {
          success: false,
          error: 'Failed to register player'
        }
      }

      // Enhance player data
      const enhancedPlayer = await this.enhancePlayerData(player)

      return {
        success: true,
        player: enhancedPlayer
      }
    } catch (error) {
      console.error('Error in registerPlayer:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Get player by ID
   */
  async getPlayer(playerId: string): Promise<PlayerProfile | null> {
    try {
      const { data: player, error } = await this.supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single()

      if (error || !player) {
        return null
      }

      return await this.enhancePlayerData(player)
    } catch (error) {
      console.error('Error getting player:', error)
      return null
    }
  }

  /**
   * Get players for team
   */
  async getTeamPlayers(
    teamId: string,
    filters?: PlayerSearchFilters,
    options?: {
      limit?: number
      offset?: number
      orderBy?: { column: string; ascending: boolean }
    }
  ): Promise<{ players: PlayerProfile[]; totalCount: number }> {
    try {
      let query = this.supabase
        .from('players')
        .select('*', { count: 'exact' })
        .eq('team_id', teamId)

      // Apply filters
      if (filters) {
        if (filters.search) {
          query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`)
        }
        if (filters.position) {
          query = query.eq('position', filters.position)
        }
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.nationality) {
          query = query.eq('nationality', filters.nationality)
        }
        if (filters.jersey_number) {
          query = query.eq('jersey_number', filters.jersey_number)
        }
        if (filters.age_min) {
          const maxBirthDate = new Date()
          maxBirthDate.setFullYear(maxBirthDate.getFullYear() - filters.age_min)
          query = query.lte('date_of_birth', maxBirthDate.toISOString())
        }
        if (filters.age_max) {
          const minBirthDate = new Date()
          minBirthDate.setFullYear(minBirthDate.getFullYear() - filters.age_max)
          query = query.gte('date_of_birth', minBirthDate.toISOString())
        }
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending })
      } else {
        query = query.order('jersey_number', { ascending: true })
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }

      const { data: players, error, count } = await query

      if (error) {
        throw error
      }

      // Enhance players with additional data
      const enhancedPlayers = await Promise.all(
        (players || []).map(player => this.enhancePlayerData(player))
      )

      return {
        players: enhancedPlayers,
        totalCount: count || 0
      }
    } catch (error) {
      console.error('Error getting team players:', error)
      return { players: [], totalCount: 0 }
    }
  }

  /**
   * Update player profile
   */
  async updatePlayer(
    playerId: string,
    updates: Partial<PlayerRegistrationData>
  ): Promise<{ success: boolean; player?: PlayerProfile; error?: string }> {
    try {
      // Check jersey number availability if being updated
      if (updates.jersey_number) {
        const player = await this.getPlayer(playerId)
        if (player && player.jersey_number !== updates.jersey_number) {
          const isAvailable = await this.isJerseyNumberAvailable(player.team_id, updates.jersey_number, playerId)
          if (!isAvailable) {
            return {
              success: false,
              error: `Jersey number ${updates.jersey_number} is already taken`
            }
          }
        }
      }

      const { data: updatedPlayer, error } = await this.supabase
        .from('players')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', playerId)
        .select()
        .single()

      if (error) {
        console.error('Error updating player:', error)
        return {
          success: false,
          error: 'Failed to update player'
        }
      }

      const enhancedPlayer = await this.enhancePlayerData(updatedPlayer)

      return {
        success: true,
        player: enhancedPlayer
      }
    } catch (error) {
      console.error('Error in updatePlayer:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Delete player
   */
  async deletePlayer(playerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('players')
        .delete()
        .eq('id', playerId)

      if (error) {
        console.error('Error deleting player:', error)
        return {
          success: false,
          error: 'Failed to delete player'
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in deletePlayer:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Upload player profile image
   */
  async uploadPlayerImage(playerId: string, file: File): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${playerId}-${Date.now()}.${fileExt}`
      const filePath = `player-images/${fileName}`

      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('public')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = this.supabase.storage
        .from('public')
        .getPublicUrl(filePath)

      // Update player with image URL
      const { error: updateError } = await this.supabase
        .from('players')
        .update({ profile_image_url: publicUrl })
        .eq('id', playerId)

      if (updateError) {
        throw updateError
      }

      return {
        success: true,
        imageUrl: publicUrl
      }
    } catch (error) {
      console.error('Error uploading player image:', error)
      return {
        success: false,
        error: 'Failed to upload player image'
      }
    }
  }

  /**
   * Check if jersey number is available
   */
  async isJerseyNumberAvailable(teamId: string, jerseyNumber: number, excludePlayerId?: string): Promise<boolean> {
    try {
      let query = this.supabase
        .from('players')
        .select('id')
        .eq('team_id', teamId)
        .eq('jersey_number', jerseyNumber)

      if (excludePlayerId) {
        query = query.neq('id', excludePlayerId)
      }

      const { data } = await query.single()
      return !data
    } catch (error) {
      // If no player found, number is available
      return true
    }
  }

  /**
   * Get available jersey numbers for team
   */
  async getAvailableJerseyNumbers(teamId: string): Promise<number[]> {
    try {
      const { data: players } = await this.supabase
        .from('players')
        .select('jersey_number')
        .eq('team_id', teamId)
        .not('jersey_number', 'is', null)

      const usedNumbers = new Set(players?.map(p => p.jersey_number) || [])
      const availableNumbers: number[] = []

      // Check numbers 1-99
      for (let i = 1; i <= 99; i++) {
        if (!usedNumbers.has(i)) {
          availableNumbers.push(i)
        }
      }

      return availableNumbers
    } catch (error) {
      console.error('Error getting available jersey numbers:', error)
      return []
    }
  }

  /**
   * Get players by position
   */
  async getPlayersByPosition(teamId: string, position: string): Promise<PlayerProfile[]> {
    try {
      const { data: players, error } = await this.supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .eq('position', position)
        .eq('status', 'active')
        .order('jersey_number', { ascending: true })

      if (error) {
        throw error
      }

      return await Promise.all(
        (players || []).map(player => this.enhancePlayerData(player))
      )
    } catch (error) {
      console.error('Error getting players by position:', error)
      return []
    }
  }

  /**
   * Get team roster summary
   */
  async getTeamRosterSummary(teamId: string): Promise<{
    totalPlayers: number
    byPosition: Record<string, number>
    byStatus: Record<string, number>
    averageAge: number
  }> {
    try {
      const { data: players, error } = await this.supabase
        .from('players')
        .select('position, status, date_of_birth')
        .eq('team_id', teamId)

      if (error) {
        throw error
      }

      const totalPlayers = players?.length || 0
      const byPosition: Record<string, number> = {}
      const byStatus: Record<string, number> = {}
      let totalAge = 0

      players?.forEach(player => {
        // Count by position
        byPosition[player.position] = (byPosition[player.position] || 0) + 1
        
        // Count by status
        byStatus[player.status] = (byStatus[player.status] || 0) + 1
        
        // Calculate age
        const birthDate = new Date(player.date_of_birth)
        const today = new Date()
        const age = today.getFullYear() - birthDate.getFullYear()
        totalAge += age
      })

      return {
        totalPlayers,
        byPosition,
        byStatus,
        averageAge: totalPlayers > 0 ? Math.round(totalAge / totalPlayers) : 0
      }
    } catch (error) {
      console.error('Error getting team roster summary:', error)
      return {
        totalPlayers: 0,
        byPosition: {},
        byStatus: {},
        averageAge: 0
      }
    }
  }

  /**
   * Check jersey number availability
   */
  async checkJerseyNumberAvailability(teamId: string, number: number, excludePlayerId?: string): Promise<boolean> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      let query = supabase
        .from('players')
        .select('id')
        .eq('team_id', teamId)
        .eq('jersey_number', number)

      if (excludePlayerId) {
        query = query.neq('id', excludePlayerId)
      }

      const { data, error } = await query

      if (error) throw error
      
      return data.length === 0
    } catch (error) {
      console.error('Error checking jersey number availability:', error)
      return false
    }
  }

  /**
   * Get available jersey numbers for a team
   */
  async getAvailableJerseyNumbers(teamId: string, maxNumber: number = 99): Promise<number[]> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      const { data, error } = await supabase
        .from('players')
        .select('jersey_number')
        .eq('team_id', teamId)
        .not('jersey_number', 'is', null)

      if (error) throw error

      const usedNumbers = new Set(data.map(p => p.jersey_number).filter(Boolean))
      const available: number[] = []

      for (let i = 1; i <= maxNumber; i++) {
        if (!usedNumbers.has(i)) {
          available.push(i)
        }
      }

      return available
    } catch (error) {
      console.error('Error getting available jersey numbers:', error)
      return []
    }
  }

  /**
   * Assign jersey number to player
   */
  async assignJerseyNumber(playerId: string, jerseyNumber: number): Promise<PlayerProfile | null> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      // First get the player to check team
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('team_id')
        .eq('id', playerId)
        .single()

      if (playerError) throw playerError
      if (!player) return null

      // Check if number is available
      const isAvailable = await this.checkJerseyNumberAvailability(player.team_id, jerseyNumber, playerId)
      if (!isAvailable) {
        throw new Error(`Jersey number ${jerseyNumber} is already taken`)
      }

      // Update player with new jersey number
      const { data, error } = await supabase
        .from('players')
        .update({ jersey_number: jerseyNumber })
        .eq('id', playerId)
        .select(`
          *,
          teams!inner(
            id,
            name,
            organization_id
          )
        `)
        .single()

      if (error) throw error
      return this.mapToPlayerProfile(data)
    } catch (error) {
      console.error('Error assigning jersey number:', error)
      throw error
    }
  }

  /**
   * Remove jersey number from player
   */
  async removeJerseyNumber(playerId: string): Promise<PlayerProfile | null> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      const { data, error } = await supabase
        .from('players')
        .update({ jersey_number: null })
        .eq('id', playerId)
        .select(`
          *,
          teams!inner(
            id,
            name,
            organization_id
          )
        `)
        .single()

      if (error) throw error
      return this.mapToPlayerProfile(data)
    } catch (error) {
      console.error('Error removing jersey number:', error)
      throw error
    }
  }

  /**
   * Get jersey number conflicts for a team
   */
  async getJerseyNumberConflicts(teamId: string): Promise<Array<{ number: number; players: PlayerProfile[] }>> {
    try {
      const supabase = createClientComponentClient<Database>()
      
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          teams!inner(
            id,
            name,
            organization_id
          )
        `)
        .eq('team_id', teamId)
        .not('jersey_number', 'is', null)

      if (error) throw error

      // Group players by jersey number
      const numberMap = new Map<number, PlayerProfile[]>()
      
      data.forEach(player => {
        const profile = this.mapToPlayerProfile(player)
        if (profile && profile.jersey_number) {
          if (!numberMap.has(profile.jersey_number)) {
            numberMap.set(profile.jersey_number, [])
          }
          numberMap.get(profile.jersey_number)!.push(profile)
        }
      })

      // Find conflicts (numbers with multiple players)
      const conflicts: Array<{ number: number; players: PlayerProfile[] }> = []
      numberMap.forEach((players, number) => {
        if (players.length > 1) {
          conflicts.push({ number, players })
        }
      })

      return conflicts
    } catch (error) {
      console.error('Error getting jersey number conflicts:', error)
      return []
    }
  }

  /**
   * Enhance player data with calculated fields
   */
  private async enhancePlayerData(player: any): Promise<PlayerProfile> {
    // Calculate age
    const birthDate = new Date(player.date_of_birth)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    
    // Adjust if birthday hasn't occurred this year
    if (today.getMonth() < birthDate.getMonth() || 
        (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
      age--
    }

    // Get player statistics (mock for now)
    const statistics: PlayerStatistics = {
      totalMatches: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      minutesPlayed: 0,
      averageRating: 0
    }

    return {
      ...player,
      age,
      full_name: `${player.first_name} ${player.last_name}`,
      statistics
    }
  }
}

export const playerService = new PlayerService()
export default PlayerService
