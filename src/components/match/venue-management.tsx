'use client'

import { useState, useEffect } from 'react'
import { MapPin, Users, DollarSign, Phone, Mail, Edit, Trash2, Plus, CheckCircle, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useOrganization } from '@/lib/contexts/organization-context'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

interface Venue {
  id: string
  organization_id: string
  name: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  capacity?: number
  surface_type?: 'grass' | 'artificial' | 'hybrid' | 'indoor' | 'futsal'
  field_dimensions?: Record<string, any>
  facilities?: Record<string, any>
  contact_person?: string
  contact_phone?: string
  contact_email?: string
  hourly_rate?: number
  is_active: boolean
  availability_schedule?: Record<string, any>
  created_at: string
  updated_at: string
}

interface VenueFormData {
  name: string
  address: string
  city: string
  state: string
  country: string
  postal_code: string
  capacity: number
  surface_type: string
  contact_person: string
  contact_phone: string
  contact_email: string
  hourly_rate: number
}

export function VenueManagement() {
  const { currentOrganization } = useOrganization()
  const { toast } = useToast()
  const [venues, setVenues] = useState<Venue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null)
  const [formData, setFormData] = useState<VenueFormData>({
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    capacity: 0,
    surface_type: 'grass',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    hourly_rate: 0
  })

  useEffect(() => {
    if (currentOrganization) {
      loadVenues()
    }
  }, [currentOrganization])

  const loadVenues = async () => {
    try {
      setIsLoading(true)
      const { data: venuesData, error } = await supabase
        .from('venues')
        .select('*')
        .eq('organization_id', currentOrganization!.id)
        .order('name')

      if (error) {
        throw error
      }

      setVenues(venuesData || [])
    } catch (error) {
      console.error('Error loading venues:', error)
      toast({
        title: 'Error',
        description: 'Failed to load venues',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingVenue) {
        // Update existing venue
        const { error } = await supabase
          .from('venues')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingVenue.id)

        if (error) {
          throw error
        }

        toast({
          title: 'Success',
          description: 'Venue updated successfully'
        })
      } else {
        // Create new venue
        const { error } = await supabase
          .from('venues')
          .insert({
            ...formData,
            organization_id: currentOrganization!.id,
            is_active: true
          })

        if (error) {
          throw error
        }

        toast({
          title: 'Success',
          description: 'Venue created successfully'
        })
      }

      setIsDialogOpen(false)
      setEditingVenue(null)
      resetForm()
      loadVenues()
    } catch (error) {
      console.error('Error saving venue:', error)
      toast({
        title: 'Error',
        description: 'Failed to save venue',
        variant: 'destructive'
      })
    }
  }

  const handleEdit = (venue: Venue) => {
    setEditingVenue(venue)
    setFormData({
      name: venue.name,
      address: venue.address || '',
      city: venue.city || '',
      state: venue.state || '',
      country: venue.country || '',
      postal_code: venue.postal_code || '',
      capacity: venue.capacity || 0,
      surface_type: venue.surface_type || 'grass',
      contact_person: venue.contact_person || '',
      contact_phone: venue.contact_phone || '',
      contact_email: venue.contact_email || '',
      hourly_rate: venue.hourly_rate || 0
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (venueId: string) => {
    if (!confirm('Are you sure you want to delete this venue? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueId)

      if (error) {
        throw error
      }

      toast({
        title: 'Success',
        description: 'Venue deleted successfully'
      })
      loadVenues()
    } catch (error) {
      console.error('Error deleting venue:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete venue',
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postal_code: '',
      capacity: 0,
      surface_type: 'grass',
      contact_person: '',
      contact_phone: '',
      contact_email: '',
      hourly_rate: 0
    })
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingVenue(null)
    resetForm()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Venue Management</h2>
          <p className="text-muted-foreground">
            Manage venues for your organization
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogClose()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Venue
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVenue ? 'Edit Venue' : 'Add New Venue'}
              </DialogTitle>
              <DialogDescription>
                {editingVenue 
                  ? 'Update venue information'
                  : 'Add a new venue to your organization'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Information */}
              <div className="space-y-2">
                <Label htmlFor="name">Venue Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                  />
                </div>
              </div>

              {/* Venue Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="0"
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surface_type">Surface Type</Label>
                  <Select 
                    value={formData.surface_type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, surface_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grass">Grass</SelectItem>
                      <SelectItem value="artificial">Artificial</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="indoor">Indoor</SelectItem>
                      <SelectItem value="futsal">Futsal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Phone</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              {/* Form Actions */}
              <div className="flex space-x-4 pt-4">
                <Button type="submit" className="flex-1">
                  {editingVenue ? 'Update Venue' : 'Create Venue'}
                </Button>
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Venues List */}
      {venues.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No venues found</h3>
            <p className="text-muted-foreground mb-4">
              Add your first venue to start managing match locations
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Venue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map((venue) => (
            <Card key={venue.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <span>{venue.name}</span>
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-2">
                      <Badge variant="outline" className="capitalize">
                        {venue.surface_type}
                      </Badge>
                      {venue.capacity && (
                        <Badge variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          {venue.capacity}
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-1">
                    {venue.is_active ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Location */}
                {(venue.address || venue.city) && (
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-start space-x-1">
                      <MapPin className="h-4 w-4 mt-0.5" />
                      <div>
                        {venue.address && <div>{venue.address}</div>}
                        {(venue.city || venue.state) && (
                          <div>
                            {venue.city && venue.state 
                              ? `${venue.city}, ${venue.state}`
                              : venue.city || venue.state
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                {(venue.contact_person || venue.contact_phone || venue.contact_email) && (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {venue.contact_person && (
                      <div className="font-medium">{venue.contact_person}</div>
                    )}
                    {venue.contact_phone && (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{venue.contact_phone}</span>
                      </div>
                    )}
                    {venue.contact_email && (
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>{venue.contact_email}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Hourly Rate */}
                {venue.hourly_rate && venue.hourly_rate > 0 && (
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    <span>${venue.hourly_rate}/hour</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(venue)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(venue.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
