'use client'

/**
 * Player Eligibility & Medical Management Component
 * Comprehensive player eligibility tracking and medical information storage
 */

import React, { useState, useEffect } from 'react'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Calendar,
  FileText,
  Heart,
  Activity,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  AlertCircle,
  Info,
  Stethoscope,
  Pill,
  Bandage,
  Thermometer,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { type PlayerProfile } from '@/lib/services/player-service'

interface PlayerEligibilityProps {
  teamId: string
  players: PlayerProfile[]
  onPlayerUpdate?: (player: PlayerProfile) => void
  className?: string
}

interface EligibilityStatus {
  id: string
  playerId: string
  status: 'eligible' | 'ineligible' | 'pending' | 'suspended'
  reason?: string
  validFrom: string
  validUntil?: string
  requirements: EligibilityRequirement[]
  lastChecked: string
  checkedBy: string
}

interface EligibilityRequirement {
  id: string
  name: string
  type: 'medical' | 'administrative' | 'disciplinary' | 'contractual'
  status: 'met' | 'pending' | 'failed' | 'expired'
  dueDate?: string
  completedDate?: string
  notes?: string
  required: boolean
}

interface MedicalRecord {
  id: string
  playerId: string
  type: 'injury' | 'illness' | 'vaccination' | 'checkup' | 'treatment'
  title: string
  description: string
  date: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'resolved' | 'ongoing' | 'monitoring'
  doctor?: string
  clinic?: string
  medications?: string[]
  followUpDate?: string
  restrictions?: string[]
  attachments?: string[]
  isConfidential: boolean
  createdBy: string
  createdAt: string
}

interface InsuranceInfo {
  id: string
  playerId: string
  provider: string
  policyNumber: string
  coverageType: 'health' | 'injury' | 'disability' | 'life'
  validFrom: string
  validUntil: string
  coverageAmount?: number
  deductible?: number
  emergencyContact?: string
  emergencyPhone?: string
  notes?: string
}

export function PlayerEligibilityManagement({ 
  teamId, 
  players, 
  onPlayerUpdate,
  className 
}: PlayerEligibilityProps) {
  const { toast } = useToast()
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfile | null>(null)
  const [eligibilityStatuses, setEligibilityStatuses] = useState<Map<string, EligibilityStatus>>(new Map())
  const [medicalRecords, setMedicalRecords] = useState<Map<string, MedicalRecord[]>>(new Map())
  const [insuranceInfo, setInsuranceInfo] = useState<Map<string, InsuranceInfo[]>>(new Map())
  const [showMedicalDialog, setShowMedicalDialog] = useState(false)
  const [showEligibilityDialog, setShowEligibilityDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showConfidential, setShowConfidential] = useState(false)

  // Mock data for demonstration
  useEffect(() => {
    initializeMockData()
  }, [players])

  const initializeMockData = () => {
    const mockEligibilityStatuses = new Map<string, EligibilityStatus>()
    const mockMedicalRecords = new Map<string, MedicalRecord[]>()
    const mockInsuranceInfo = new Map<string, InsuranceInfo[]>()

    players.forEach(player => {
      // Mock eligibility status
      mockEligibilityStatuses.set(player.id, {
        id: `eligibility-${player.id}`,
        playerId: player.id,
        status: Math.random() > 0.8 ? 'ineligible' : 'eligible',
        reason: Math.random() > 0.8 ? 'Medical clearance pending' : undefined,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        requirements: [
          {
            id: 'medical-clearance',
            name: 'Medical Clearance',
            type: 'medical',
            status: 'met',
            completedDate: new Date().toISOString(),
            required: true
          },
          {
            id: 'insurance-verification',
            name: 'Insurance Verification',
            type: 'administrative',
            status: 'met',
            completedDate: new Date().toISOString(),
            required: true
          },
          {
            id: 'contract-signature',
            name: 'Contract Signature',
            type: 'contractual',
            status: 'met',
            completedDate: new Date().toISOString(),
            required: true
          }
        ],
        lastChecked: new Date().toISOString(),
        checkedBy: 'Medical Team'
      })

      // Mock medical records
      mockMedicalRecords.set(player.id, [
        {
          id: `medical-${player.id}-1`,
          playerId: player.id,
          type: 'checkup',
          title: 'Annual Medical Checkup',
          description: 'Routine annual medical examination',
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          severity: 'low',
          status: 'resolved',
          doctor: 'Dr. Smith',
          clinic: 'Sports Medicine Clinic',
          isConfidential: false,
          createdBy: 'Medical Team',
          createdAt: new Date().toISOString()
        },
        {
          id: `medical-${player.id}-2`,
          playerId: player.id,
          type: 'vaccination',
          title: 'COVID-19 Vaccination',
          description: 'Second dose of COVID-19 vaccine',
          date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          severity: 'low',
          status: 'resolved',
          doctor: 'Dr. Johnson',
          clinic: 'Community Health Center',
          isConfidential: false,
          createdBy: 'Medical Team',
          createdAt: new Date().toISOString()
        }
      ])

      // Mock insurance info
      mockInsuranceInfo.set(player.id, [
        {
          id: `insurance-${player.id}-1`,
          playerId: player.id,
          provider: 'HealthPlus Insurance',
          policyNumber: 'HP-2024-001234',
          coverageType: 'health',
          validFrom: new Date().toISOString(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          coverageAmount: 100000,
          deductible: 1000,
          emergencyContact: 'Emergency Contact',
          emergencyPhone: '+1-555-0123',
          notes: 'Primary health insurance coverage'
        }
      ])
    })

    setEligibilityStatuses(mockEligibilityStatuses)
    setMedicalRecords(mockMedicalRecords)
    setInsuranceInfo(mockInsuranceInfo)
  }

  const getEligibilityColor = (status: string) => {
    switch (status) {
      case 'eligible': return 'bg-green-100 text-green-800 border-green-200'
      case 'ineligible': return 'bg-red-100 text-red-800 border-red-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'suspended': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getEligibilityIcon = (status: string) => {
    switch (status) {
      case 'eligible': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'ineligible': return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />
      case 'suspended': return <AlertTriangle className="h-4 w-4 text-orange-600" />
      default: return <Info className="h-4 w-4 text-gray-600" />
    }
  }

  const getMedicalTypeIcon = (type: string) => {
    switch (type) {
      case 'injury': return <Bandage className="h-4 w-4 text-red-500" />
      case 'illness': return <Thermometer className="h-4 w-4 text-orange-500" />
      case 'vaccination': return <Shield className="h-4 w-4 text-blue-500" />
      case 'checkup': return <Stethoscope className="h-4 w-4 text-green-500" />
      case 'treatment': return <Pill className="h-4 w-4 text-purple-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.position.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (filterStatus === 'all') return matchesSearch
    
    const eligibility = eligibilityStatuses.get(player.id)
    return matchesSearch && eligibility?.status === filterStatus
  })

  const getEligibilitySummary = () => {
    const summary = {
      total: players.length,
      eligible: 0,
      ineligible: 0,
      pending: 0,
      suspended: 0
    }

    eligibilityStatuses.forEach(status => {
      summary[status.status as keyof typeof summary]++
    })

    return summary
  }

  const summary = getEligibilitySummary()

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Player Eligibility & Medical Management</h2>
            <p className="text-muted-foreground">
              Track player eligibility, medical records, and compliance status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={showConfidential}
              onCheckedChange={setShowConfidential}
            />
            <Label className="text-sm">Show Confidential Records</Label>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{summary.total}</div>
                  <div className="text-sm text-muted-foreground">Total Players</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{summary.eligible}</div>
                  <div className="text-sm text-muted-foreground">Eligible</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <div className="text-2xl font-bold">{summary.ineligible}</div>
                  <div className="text-sm text-muted-foreground">Ineligible</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <div className="text-2xl font-bold">{summary.pending}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold">{summary.suspended}</div>
                  <div className="text-sm text-muted-foreground">Suspended</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Players</SelectItem>
              <SelectItem value="eligible">Eligible</SelectItem>
              <SelectItem value="ineligible">Ineligible</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Players List */}
        <div className="space-y-4">
          {filteredPlayers.map((player) => {
            const eligibility = eligibilityStatuses.get(player.id)
            const medicalRecords = medicalRecords.get(player.id) || []
            const insuranceInfo = insuranceInfo.get(player.id) || []

            return (
              <Card key={player.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={player.profile_image_url || ''} />
                        <AvatarFallback>
                          {player.first_name[0]}{player.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{player.full_name}</h3>
                          {eligibility && (
                            <Badge className={getEligibilityColor(eligibility.status)}>
                              {eligibility.status.charAt(0).toUpperCase() + eligibility.status.slice(1)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{player.position.charAt(0).toUpperCase() + player.position.slice(1)}</span>
                          <span>•</span>
                          <span>Age {player.age}</span>
                          <span>•</span>
                          <span>{player.jersey_number ? `#${player.jersey_number}` : 'No Jersey'}</span>
                        </div>
                        {eligibility?.reason && (
                          <p className="text-sm text-orange-600 mt-1">{eligibility.reason}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPlayer(player)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  </div>

                  {/* Eligibility Requirements */}
                  {eligibility && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Eligibility Requirements</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {eligibility.requirements.map((requirement) => (
                          <div key={requirement.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                            {requirement.status === 'met' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : requirement.status === 'pending' ? (
                              <Clock className="h-4 w-4 text-yellow-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-sm">{requirement.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Medical Records Summary */}
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Stethoscope className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Recent Medical Records</span>
                    </div>
                    <div className="space-y-2">
                      {medicalRecords.slice(0, 2).map((record) => (
                        <div key={record.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                          {getMedicalTypeIcon(record.type)}
                          <span className="text-sm">{record.title}</span>
                          <Badge className={getSeverityColor(record.severity)}>
                            {record.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(record.date).toLocaleDateString()}
                          </span>
                          {record.isConfidential && (
                            <Lock className="h-3 w-3 text-orange-500" />
                          )}
                        </div>
                      ))}
                      {medicalRecords.length > 2 && (
                        <p className="text-xs text-muted-foreground">
                          +{medicalRecords.length - 2} more records
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Insurance Summary */}
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Insurance Coverage</span>
                    </div>
                    <div className="space-y-1">
                      {insuranceInfo.map((insurance) => (
                        <div key={insurance.id} className="flex items-center gap-2 text-sm">
                          <span>{insurance.provider}</span>
                          <Badge variant="outline">{insurance.coverageType}</Badge>
                          <span className="text-muted-foreground">
                            Expires: {new Date(insurance.validUntil).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Player Detail Dialog */}
        <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Player Eligibility & Medical Details</DialogTitle>
              <DialogDescription>
                Comprehensive view of {selectedPlayer?.full_name}'s eligibility and medical information
              </DialogDescription>
            </DialogHeader>
            
            {selectedPlayer && (
              <Tabs defaultValue="eligibility" className="w-full">
                <TabsList>
                  <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
                  <TabsTrigger value="medical">Medical Records</TabsTrigger>
                  <TabsTrigger value="insurance">Insurance</TabsTrigger>
                  <TabsTrigger value="compliance">Compliance</TabsTrigger>
                </TabsList>
                
                <TabsContent value="eligibility">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={selectedPlayer.profile_image_url || ''} />
                        <AvatarFallback>
                          {selectedPlayer.first_name[0]}{selectedPlayer.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-semibold">{selectedPlayer.full_name}</h3>
                        <p className="text-muted-foreground">
                          {selectedPlayer.position} • Age {selectedPlayer.age}
                        </p>
                      </div>
                    </div>
                    
                    {eligibilityStatuses.get(selectedPlayer.id) && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            {getEligibilityIcon(eligibilityStatuses.get(selectedPlayer.id)!.status)}
                            Eligibility Status
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm text-muted-foreground">Status</Label>
                                <p className="font-medium">
                                  {eligibilityStatuses.get(selectedPlayer.id)!.status.charAt(0).toUpperCase() + 
                                   eligibilityStatuses.get(selectedPlayer.id)!.status.slice(1)}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm text-muted-foreground">Valid Until</Label>
                                <p className="font-medium">
                                  {new Date(eligibilityStatuses.get(selectedPlayer.id)!.validUntil!).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            <div>
                              <Label className="text-sm text-muted-foreground">Requirements</Label>
                              <div className="space-y-2 mt-2">
                                {eligibilityStatuses.get(selectedPlayer.id)!.requirements.map((req) => (
                                  <div key={req.id} className="flex items-center justify-between p-3 border rounded">
                                    <div className="flex items-center gap-2">
                                      {req.status === 'met' ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                      ) : req.status === 'pending' ? (
                                        <Clock className="h-4 w-4 text-yellow-600" />
                                      ) : (
                                        <XCircle className="h-4 w-4 text-red-600" />
                                      )}
                                      <span className="font-medium">{req.name}</span>
                                      <Badge variant="outline">{req.type}</Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {req.completedDate ? 
                                        `Completed: ${new Date(req.completedDate).toLocaleDateString()}` :
                                        req.dueDate ? 
                                        `Due: ${new Date(req.dueDate).toLocaleDateString()}` :
                                        'Pending'
                                      }
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="medical">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Medical Records</h3>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Record
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {(medicalRecords.get(selectedPlayer.id) || []).map((record) => (
                        <Card key={record.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                {getMedicalTypeIcon(record.type)}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{record.title}</h4>
                                    <Badge className={getSeverityColor(record.severity)}>
                                      {record.severity}
                                    </Badge>
                                    <Badge variant="outline">{record.status}</Badge>
                                    {record.isConfidential && (
                                      <Lock className="h-4 w-4 text-orange-500" />
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {record.description}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                    <span>{new Date(record.date).toLocaleDateString()}</span>
                                    {record.doctor && <span>Dr. {record.doctor}</span>}
                                    {record.clinic && <span>{record.clinic}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="insurance">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Insurance Information</h3>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Insurance
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {(insuranceInfo.get(selectedPlayer.id) || []).map((insurance) => (
                        <Card key={insurance.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-medium">{insurance.provider}</h4>
                                  <Badge variant="outline">{insurance.coverageType}</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <Label className="text-muted-foreground">Policy Number</Label>
                                    <p className="font-medium">{insurance.policyNumber}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Valid Until</Label>
                                    <p className="font-medium">
                                      {new Date(insurance.validUntil).toLocaleDateString()}
                                    </p>
                                  </div>
                                  {insurance.coverageAmount && (
                                    <div>
                                      <Label className="text-muted-foreground">Coverage Amount</Label>
                                      <p className="font-medium">${insurance.coverageAmount.toLocaleString()}</p>
                                    </div>
                                  )}
                                  {insurance.deductible && (
                                    <div>
                                      <Label className="text-muted-foreground">Deductible</Label>
                                      <p className="font-medium">${insurance.deductible.toLocaleString()}</p>
                                    </div>
                                  )}
                                </div>
                                {insurance.notes && (
                                  <p className="text-sm text-muted-foreground mt-2">{insurance.notes}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="compliance">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Compliance Monitoring</h3>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Compliance Checklist</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span>Medical Clearance</span>
                            </div>
                            <Badge className="bg-green-100 text-green-800">Complete</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span>Insurance Verification</span>
                            </div>
                            <Badge className="bg-green-100 text-green-800">Complete</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-yellow-600" />
                              <span>Annual Physical</span>
                            </div>
                            <Badge className="bg-yellow-100 text-yellow-800">Due Soon</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span>Contract Signature</span>
                            </div>
                            <Badge className="bg-green-100 text-green-800">Complete</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default PlayerEligibilityManagement
