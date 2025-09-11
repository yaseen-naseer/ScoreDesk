'use client'

import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'

type Organization = Database['public']['Tables']['organizations']['Row']
type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']
type OrganizationMembership = Database['public']['Tables']['organization_memberships']['Row']

export class OrganizationService {
  private supabase = createClient()

  /**
   * Create a new organization with the current user as owner
   */
  async createOrganization(data: {
    name: string
    slug: string
    description?: string
    website?: string
    address: {
      street: string
      city: string
      state: string
      postalCode: string
      country: string
      coordinates?: { latitude: number; longitude: number }
    }
    contactInfo: {
      email?: string
      phone?: string
      website?: string
    }
    socialLinks?: {
      facebook?: string
      twitter?: string
      instagram?: string
      youtube?: string
      website?: string
    }
    settings?: {
      defaultSport: 'football' | 'futsal'
      timezone: string
      language: string
      currency: string
      dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
      timeFormat: '12' | '24'
    }
  }): Promise<{ organization: Organization; membership: OrganizationMembership }> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Check if slug is available
    const { data: existingOrg } = await this.supabase
      .from('organizations')
      .select('id')
      .eq('slug', data.slug)
      .single()

    if (existingOrg) {
      throw new Error('Organization slug already exists')
    }

    // Create organization
    const organizationData: OrganizationInsert = {
      name: data.name,
      slug: data.slug,
      description: data.description,
      website: data.website,
      address: data.address as any,
      contact_info: data.contactInfo as any,
      social_links: data.socialLinks as any,
      settings: data.settings as any
    }

    const { data: organization, error: orgError } = await this.supabase
      .from('organizations')
      .insert(organizationData)
      .select()
      .single()

    if (orgError) throw orgError

    // Create membership for the user as owner
    const { data: membership, error: membershipError } = await this.supabase
      .from('organization_memberships')
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        role: 'owner',
        status: 'active'
      })
      .select()
      .single()

    if (membershipError) throw membershipError

    // Update user profile with current organization
    await this.supabase
      .from('user_profiles')
      .update({
        current_organization_id: organization.id,
        current_role: 'owner'
      })
      .eq('user_id', user.id)

    return { organization, membership }
  }

  /**
   * Check if organization slug is available
   */
  async checkSlugAvailability(slug: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    return !data
  }

  /**
   * Get organization by ID
   */
  async getOrganization(id: string): Promise<Organization | null> {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get organizations for current user
   */
  async getUserOrganizations(): Promise<Array<Organization & { membership: OrganizationMembership }>> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await this.supabase
      .from('organization_memberships')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (error) throw error

    return data.map(item => ({
      ...item.organization,
      membership: {
        id: item.id,
        organization_id: item.organization_id,
        user_id: item.user_id,
        role: item.role,
        status: item.status,
        joined_at: item.joined_at,
        invited_by: item.invited_by,
        invited_at: item.invited_at
      }
    }))
  }

  /**
   * Update organization
   */
  async updateOrganization(id: string, updates: OrganizationUpdate): Promise<Organization> {
    const { data, error } = await this.supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Upload organization logo
   */
  async uploadLogo(organizationId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${organizationId}/logo.${fileExt}`

    const { error: uploadError } = await this.supabase.storage
      .from('organization-assets')
      .upload(fileName, file, { upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = this.supabase.storage
      .from('organization-assets')
      .getPublicUrl(fileName)

    // Update organization with logo URL
    await this.updateOrganization(organizationId, { logo_url: publicUrl })

    return publicUrl
  }

  /**
   * Delete organization (owner only)
   */
  async deleteOrganization(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('organizations')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Get organization members
   */
  async getOrganizationMembers(organizationId: string): Promise<Array<OrganizationMembership & { profile: any }>> {
    const { data, error } = await this.supabase
      .from('organization_memberships')
      .select(`
        *,
        profile:user_profiles(*)
      `)
      .eq('organization_id', organizationId)
      .order('joined_at', { ascending: false })

    if (error) throw error
    return data
  }

  /**
   * Switch user's current organization
   */
  async switchOrganization(organizationId: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user's membership in the organization
    const { data: membership, error: membershipError } = await this.supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      throw new Error('User is not a member of this organization')
    }

    // Update user profile
    const { error } = await this.supabase
      .from('user_profiles')
      .update({
        current_organization_id: organizationId,
        current_role: membership.role
      })
      .eq('user_id', user.id)

    if (error) throw error
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(organizationId: string): Promise<{
    totalMembers: number
    totalTeams: number
    totalPlayers: number
    totalMatches: number
    activeTournaments: number
    liveMatches: number
  }> {
    const [
      { count: totalMembers },
      { count: totalTeams },
      { count: totalPlayers },
      { count: totalMatches },
      { count: activeTournaments },
      { count: liveMatches }
    ] = await Promise.all([
      this.supabase
        .from('organization_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active'),
      
      this.supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true),
      
      this.supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true),
      
      this.supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
      
      this.supabase
        .from('tournaments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('end_date', new Date().toISOString()),
      
      this.supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'live')
    ])

    return {
      totalMembers: totalMembers || 0,
      totalTeams: totalTeams || 0,
      totalPlayers: totalPlayers || 0,
      totalMatches: totalMatches || 0,
      activeTournaments: activeTournaments || 0,
      liveMatches: liveMatches || 0
    }
  }

  /**
   * Generate organization slug from name
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50)
  }

  /**
   * Validate organization slug
   */
  validateSlug(slug: string): { isValid: boolean; error?: string } {
    if (slug.length < 3) {
      return { isValid: false, error: 'Slug must be at least 3 characters' }
    }
    if (slug.length > 50) {
      return { isValid: false, error: 'Slug must be less than 50 characters' }
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return { isValid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' }
    }
    if (slug.startsWith('-') || slug.endsWith('-')) {
      return { isValid: false, error: 'Slug cannot start or end with a hyphen' }
    }
    if (slug.includes('--')) {
      return { isValid: false, error: 'Slug cannot contain consecutive hyphens' }
    }
    return { isValid: true }
  }
}
