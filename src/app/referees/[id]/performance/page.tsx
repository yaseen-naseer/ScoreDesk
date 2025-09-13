'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, User, Trophy, Calendar, Star } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { RefereePerformanceDashboard } from '@/components/referee'
import { refereePerformanceService } from '@/lib/services/referee-performance-service'

export default function RefereePerformancePage() {
  const params = useParams()
  const { toast } = useToast()
  const [referee, setReferee] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadRefereeData()
  }, [params.id])

  const loadRefereeData = async () => {
    try {
      setIsLoading(true)
      
      // Get referee basic info
      // This would typically come from a referee service
      const mockReferee = {
        id: params.id as string,
        name: 'John Smith',
        specialization: 'referee',
        license_level: 'national',
        organization_name: 'Local Football Association',
        is_active: true,
        experience_years: 5
      }
      
      setReferee(mockReferee)
    } catch (error) {
      console.error('Error loading referee data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load referee information',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!referee) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Referee Not Found</h3>
              <p className="text-muted-foreground mb-4">
                The requested referee could not be found.
              </p>
              <Link href="/referees">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Referees
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/referees">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{referee.name}</h1>
              <p className="text-muted-foreground">{referee.organization_name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{referee.specialization.replace('_', ' ')}</Badge>
            <Badge variant="secondary">{referee.license_level}</Badge>
            <Badge variant={referee.is_active ? 'default' : 'destructive'}>
              {referee.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        {/* Referee Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Experience</p>
                  <p className="text-2xl font-bold">{referee.experience_years} years</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Specialization</p>
                  <p className="text-lg font-bold capitalize">
                    {referee.specialization.replace('_', ' ')}
                  </p>
                </div>
                <User className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">License Level</p>
                  <p className="text-lg font-bold capitalize">{referee.license_level}</p>
                </div>
                <Trophy className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="text-lg font-bold">
                    {referee.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <Star className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Dashboard */}
        <RefereePerformanceDashboard 
          refereeId={params.id as string}
          refereeName={referee.name}
        />
      </div>
    </div>
  )
}
