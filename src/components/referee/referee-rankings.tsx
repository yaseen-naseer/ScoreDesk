'use client'

import { useState, useEffect } from 'react'
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Star, 
  Calendar, 
  Award,
  Filter,
  Search,
  Users,
  BarChart3
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { 
  RefereePerformanceService,
  RefereeRanking,
  refereePerformanceService 
} from '@/lib/services/referee-performance-service'

interface RefereeRankingsProps {
  organizationId?: string
  onRefereeSelect?: (refereeId: string) => void
}

export function RefereeRankings({ 
  organizationId,
  onRefereeSelect 
}: RefereeRankingsProps) {
  const { toast } = useToast()
  const [rankings, setRankings] = useState<RefereeRanking[]>([])
  const [filteredRankings, setFilteredRankings] = useState<RefereeRanking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSpecialization, setSelectedSpecialization] = useState('all')
  const [selectedLicenseLevel, setSelectedLicenseLevel] = useState('all')
  const [sortBy, setSortBy] = useState('performance_score')

  useEffect(() => {
    loadRankings()
  }, [organizationId])

  useEffect(() => {
    filterRankings()
  }, [rankings, searchTerm, selectedSpecialization, selectedLicenseLevel, sortBy])

  const loadRankings = async () => {
    try {
      setIsLoading(true)
      const data = await refereePerformanceService.getRefereeRankings(organizationId)
      setRankings(data)
    } catch (error) {
      console.error('Error loading rankings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load referee rankings',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filterRankings = () => {
    let filtered = [...rankings]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(referee => 
        referee.referee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        referee.organization_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Specialization filter
    if (selectedSpecialization !== 'all') {
      filtered = filtered.filter(referee => referee.specialization === selectedSpecialization)
    }

    // License level filter
    if (selectedLicenseLevel !== 'all') {
      filtered = filtered.filter(referee => referee.license_level === selectedLicenseLevel)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'performance_score':
          return b.performance_score - a.performance_score
        case 'average_rating':
          return b.average_rating - a.average_rating
        case 'total_matches':
          return b.total_matches - a.total_matches
        case 'name':
          return a.referee_name.localeCompare(b.referee_name)
        default:
          return a.rank - b.rank
      }
    })

    setFilteredRankings(filtered)
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-200'
    if (rank === 3) return 'bg-orange-100 text-orange-800 border-orange-200'
    if (rank <= 10) return 'bg-blue-100 text-blue-800 border-blue-200'
    return 'bg-gray-50 text-gray-600 border-gray-200'
  }

  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return { level: 'Excellent', color: 'text-green-600' }
    if (score >= 80) return { level: 'Very Good', color: 'text-blue-600' }
    if (score >= 70) return { level: 'Good', color: 'text-yellow-600' }
    if (score >= 60) return { level: 'Fair', color: 'text-orange-600' }
    return { level: 'Poor', color: 'text-red-600' }
  }

  const getSpecializations = () => {
    const specializations = [...new Set(rankings.map(r => r.specialization))]
    return specializations
  }

  const getLicenseLevels = () => {
    const levels = [...new Set(rankings.map(r => r.license_level))]
    return levels.sort()
  }

  const getTopPerformers = () => {
    return rankings.slice(0, 3)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const topPerformers = getTopPerformers()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Referee Rankings</h2>
          <p className="text-muted-foreground">
            Performance rankings based on match performance and availability
          </p>
        </div>
        <Button onClick={loadRankings} variant="outline">
          <BarChart3 className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topPerformers.map((referee, index) => (
          <Card key={referee.referee_id} className={`${index === 0 ? 'ring-2 ring-yellow-400' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={`/api/avatars/${referee.referee_id}`} />
                      <AvatarFallback>
                        {referee.referee_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {index < 3 && (
                      <div className="absolute -top-1 -right-1">
                        <Badge className={`${getRankBadgeColor(index + 1)} text-xs`}>
                          #{index + 1}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">{referee.referee_name}</div>
                    <div className="text-sm text-muted-foreground">{referee.organization_name}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {getTrendIcon(referee.trend)}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Performance Score</span>
                  <span className="font-bold">{referee.performance_score}</span>
                </div>
                <Progress value={referee.performance_score} className="h-2" />
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Rating</div>
                    <div className="font-medium">{referee.average_rating.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Matches</div>
                    <div className="font-medium">{referee.total_matches}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="outline">{referee.specialization.replace('_', ' ')}</Badge>
                  <Badge variant="secondary">{referee.license_level}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rankings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Referees</CardTitle>
              <CardDescription>
                {filteredRankings.length} of {rankings.length} referees
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search referees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedSpecialization} onValueChange={setSelectedSpecialization}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Specialization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specializations</SelectItem>
                {getSpecializations().map(spec => (
                  <SelectItem key={spec} value={spec}>
                    {spec.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedLicenseLevel} onValueChange={setSelectedLicenseLevel}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="License Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {getLicenseLevels().map(level => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rank">Rank</SelectItem>
                <SelectItem value="performance_score">Performance Score</SelectItem>
                <SelectItem value="average_rating">Rating</SelectItem>
                <SelectItem value="total_matches">Matches</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rankings List */}
          <div className="space-y-2">
            {filteredRankings.map((referee) => {
              const performanceLevel = getPerformanceLevel(referee.performance_score)
              
              return (
                <div
                  key={referee.referee_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onRefereeSelect?.(referee.referee_id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Badge 
                          variant="outline" 
                          className={`${getRankBadgeColor(referee.rank)} text-sm font-bold min-w-[2.5rem] justify-center`}
                        >
                          #{referee.rank}
                        </Badge>
                        {referee.rank <= 3 && (
                          <Trophy className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`/api/avatars/${referee.referee_id}`} />
                        <AvatarFallback>
                          {referee.referee_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div>
                      <div className="font-semibold">{referee.referee_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {referee.organization_name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Performance</div>
                      <div className="font-bold">{referee.performance_score}</div>
                      <div className={`text-xs ${performanceLevel.color}`}>
                        {performanceLevel.level}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Rating</div>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="font-bold">{referee.average_rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Matches</div>
                      <div className="font-bold">{referee.total_matches}</div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{referee.specialization.replace('_', ' ')}</Badge>
                      <Badge variant="secondary">{referee.license_level}</Badge>
                      {getTrendIcon(referee.trend)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredRankings.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No referees found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or filters
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Referees</p>
                <p className="text-2xl font-bold">{rankings.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Performance</p>
                <p className="text-2xl font-bold">
                  {rankings.length > 0 
                    ? Math.round(rankings.reduce((sum, r) => sum + r.performance_score, 0) / rankings.length)
                    : 0
                  }
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold">
                  {rankings.length > 0 
                    ? (rankings.reduce((sum, r) => sum + r.average_rating, 0) / rankings.length).toFixed(1)
                    : '0.0'
                  }
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Matches</p>
                <p className="text-2xl font-bold">
                  {rankings.reduce((sum, r) => sum + r.total_matches, 0)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
