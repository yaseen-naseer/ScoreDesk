import { Database } from '@/lib/supabase/types'

type VenueRow = Database['public']['Tables']['venues']['Row']
type VenueInsert = Database['public']['Tables']['venues']['Insert']
type VenueUpdate = Database['public']['Tables']['venues']['Update']

export class VenueService {
  constructor(private supabase: any) {}

  async listByOrganization(organizationId: string): Promise<VenueRow[]> {
    const { data, error } = await this.supabase
      .from('venues')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name')

    if (error) throw error
    return data || []
  }

  async getById(id: string): Promise<VenueRow | null> {
    const { data, error } = await this.supabase
      .from('venues')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async create(payload: VenueInsert): Promise<VenueRow | null> {
    const { data, error } = await this.supabase
      .from('venues')
      .insert(payload)
      .select('*')
      .single()

    if (error) throw error
    return data
  }

  async update(id: string, updates: VenueUpdate): Promise<VenueRow | null> {
    const { data, error } = await this.supabase
      .from('venues')
      .update({ ...updates, updated_at: new Date().toISOString() as any })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return data
  }

  async remove(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('venues')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  }

  async isAvailable(venueId: string, scheduledAt: string, durationMinutes = 90): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('check_venue_availability', {
      venue_id_param: venueId,
      match_date_param: scheduledAt,
      match_duration_minutes: durationMinutes
    })
    if (error) throw error
    return Boolean(data)
  }
}


