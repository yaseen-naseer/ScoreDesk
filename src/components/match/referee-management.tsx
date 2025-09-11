'use client'

import { useState, useEffect } from 'react'
import { UserCheck, Mail, Phone, Award, MapPin, Calendar, Star, Edit, Trash2, Plus, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { refereeService, RefereeWithDetails, RefereeFormData } from '@/lib/services/referee-service'
import { useOrganization } from '@/lib/contexts/organization-context'

export function RefereeManagement() {
  const { currentOrganization } = useOrganization()
  const { toast } = useToast()
  const [referees, setReferees] = useState<RefereeWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingReferee, setEditingReferee] = useState<RefereeWithDetails | null>(null)
  const [formData, setFormData] = useState<RefereeFormData>({
    name: '',
    email: '',
    phone: '',
    license_number: '',
    license_level: 'local',
    specialization: 'referee',
    experience_years: 0,
    max_matches_per_week: 3,
    travel_radius_km: 50,
    preferred_venues: [],
    availability_schedule: {}
  })
  const [statistics, setStatistics] = useState({
    total_referees: 0,
    active_referees: 0,
    inactive_referees: 0,
    referees_by_specialization: {} as Record<string, number>,
    referees_by_license_level: {} as Record<string, number>
  })

  useEffect(() => {
    if (currentOrganization) {
      loadReferees()
      loadStatistics()
    }
  }, [currentOrganization])

  const loadReferees = async () => {
    try {
      setIsLoading(true)
      const refereesData = await refereeService.getOrganizationReferees(currentOrganization!.id)
      setReferees(refereesData)
    } catch (error) {
      console.error('Error loading referees:', error)
      toast({
        title: 'Error',
        description: 'Failed to load referees',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadStatistics = async () => {
    try {
      const stats = await refereeService.getRefereeStatistics(currentOrganization!.id)
      setStatistics(stats)
    } catch (error) {
      console.error('Error loading statistics:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingReferee) {
        // Update existing referee
        const result = await refereeService.updateReferee(editingReferee.id, formData)
        
        if (result.success) {
          toast({
            title: 'Success',
            description: 'Referee updated successfully'
          })
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to update referee',
            variant: 'destructive'
          })
        }
      } else {
        // Create new referee
        const result = await refereeService.createReferee(currentOrganization!.id, formData)
        
        if (result.success) {
          toast({
            title: 'Success',
            description: 'Referee created successfully'
          })
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to create referee',
            variant: 'destructive'
          })
        }
      }

      setIsDialogOpen(false)
      setEditingReferee(null)
      resetForm()
      loadReferees()
      loadStatistics()
    } catch (error) {
      console.error('Error saving referee:', error)
      toast({
        title: 'Error',
        description: 'Failed to save referee',
        variant: 'destructive'
      })
    }
  }

  const handleEdit = (referee: RefereeWithDetails) => {
    setEditingReferee(referee)
    setFormData({
      name: referee.name,
      email: referee.email || '',
      phone: referee.phone || '',
      license_number: referee.license_number || '',
      license_level: referee.license_level || 'local',
      specialization: referee.specialization || 'referee',
      experience_years: referee.experience_years || 0,
      max_matches_per_week: referee.max_matches_per_week || 3,
      travel_radius_km: referee.travel_radius_km || 50,
      preferred_venues: referee.preferred_venues || [],
      availability_schedule: referee.availability_schedule || {}
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (refereeId: string) => {
    if (!confirm('Are you sure you want to delete this referee? This action cannot be undone.')) {
      return
    }

    try {
      const result = await refereeService.deleteReferee(refereeId)
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Referee deleted successfully'
        })
        loadReferees()
        loadStatistics()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete referee',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error deleting referee:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete referee',
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      license_number: '',
      license_level: 'local',
      specialization: 'referee',
      experience_years: 0,
      max_matches_per_week: 3,
      travel_radius_km: 50,
      preferred_venues: [],
      availability_schedule: {}
    })
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingReferee(null)
    resetForm()
  }

  const getLicenseLevelColor = (level: string) => {
    switch (level) {
      case 'fifa':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'continental':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'national':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'regional':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'local':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getSpecializationColor = (specialization: string) => {
    switch (specialization) {
      case 'referee':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'assistant_referee':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'fourth_official':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'var_official':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
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
          <h2 className="text-2xl font-bold">Referee Management</h2>
          <p className="text-muted-foreground">
            Manage referees and officials for your organization
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogClose()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Referee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingReferee ? 'Edit Referee' : 'Add New Referee'}
              </DialogTitle>
              <DialogDescription>
                {editingReferee 
                  ? 'Update referee information and settings'
                  : 'Add a new referee to your organization'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Information */}
              <div className="space-y-2">
                <Label htmlFor="name">Referee Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              {/* License Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="license_number">License Number</Label>
                  <Input
                    id="license_number"
                    value={formData.license_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license_level">License Level</Label>
                  <Select 
                    value={formData.license_level} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, license_level: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fifa">FIFA</SelectItem>
                      <SelectItem value="continental">Continental</SelectItem>
                      <SelectItem value="national">National</SelectItem>
                      <SelectItem value="regional">Regional</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Specialization */}
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Select 
                  value={formData.specialization} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, specialization: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="referee">Referee</SelectItem>
                    <SelectItem value="assistant_referee">Assistant Referee</SelectItem>
                    <SelectItem value="fourth_official">Fourth Official</SelectItem>
                    <SelectItem value="var_official">VAR Official</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Experience and Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experience_years">Experience (Years)</Label>
                  <Input
                    id="experience_years"
                    type="number"
                    min="0"
                    value={formData.experience_years}
                    onChange={(e) => setFormData(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_matches_per_week">Max Matches/Week</Label>
                  <Input
                    id="max_matches_per_week"
                    type="number"
                    min="1"
                    max="7"
                    value={formData.max_matches_per_week}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_matches_per_week: parseInt(e.target.value) || 3 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="travel_radius_km">Travel Radius (km)</Label>
                <Input
                  id="travel_radius_km"
                  type="number"
                  min="0"
                  value={formData.travel_radius_km}
                  onChange={(e) => setFormData(prev => ({ ...prev, travel_radius_km: parseInt(e.target.value) || 50 }))}
                />
              </div>

              {/* Form Actions */}
              <div className="flex space-x-4 pt-4">
                <Button type="submit" className="flex-1">
                  {editingReferee ? 'Update Referee' : 'Create Referee'}
                </Button>
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{statistics.total_referees}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{statistics.active_referees}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{statistics.inactive_referees}</div>
            <div className="text-sm text-muted-foreground">Inactive</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{statistics.referees_by_specialization.referee || 0}</div>
            <div className="text-sm text-muted-foreground">Referees</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{statistics.referees_by_specialization.assistant_referee || 0}</div>
            <div className="text-sm text-muted-foreground">Assistants</div>
          </CardContent>
        </Card>
      </div>

      {/* Referees List */}
      {referees.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No referees found</h3>
            <p className="text-muted-foreground mb-4">
              Add your first referee to start managing match officials
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Referee
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {referees.map((referee) => (
            <Card key={referee.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <UserCheck className="h-5 w-5 text-blue-600" />
                      <span>{referee.name}</span>
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-2">
                      <Badge className={getLicenseLevelColor(referee.license_level || 'local')}>
                        {referee.license_level?.toUpperCase()}
                      </Badge>
                      <Badge className={getSpecializationColor(referee.specialization || 'referee')}>
                        {referee.specialization?.replace('_', ' ')}
                      </Badge>
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-1">
                    {referee.is_active ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Contact Information */}
                {(referee.email || referee.phone) && (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {referee.email && (
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>{referee.email}</span>
                      </div>
                    )}
                    {referee.phone && (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{referee.phone}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* License and Experience */}
                <div className="space-y-1 text-sm text-muted-foreground">
                  {referee.license_number && (
                    <div className="flex items-center space-x-1">
                      <Award className="h-3 w-3" />
                      <span>License: {referee.license_number}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3" />
                    <span>{referee.experience_years} years experience</span>
                  </div>
                </div>

                {/* Performance Stats */}
                {referee.performance_stats && (
                  <div className="bg-muted p-2 rounded text-sm">
                    <div className="flex justify-between">
                      <span>Total Matches:</span>
                      <span className="font-medium">{referee.performance_stats.total_matches}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>This Week:</span>
                      <span className="font-medium">{referee.performance_stats.matches_this_week}/{referee.max_matches_per_week}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(referee)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(referee.id)}
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
