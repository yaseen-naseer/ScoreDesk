'use client'

import { useState } from 'react'
import { Users, BarChart3, Award, Calendar, Filter, Search, Plus } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { RefereeRankings } from '@/components/referee'
import { RefereeNotificationSettings } from '@/components/referee/referee-notification-settings'
import { useToast } from '@/hooks/use-toast'

export default function RefereesPage() {
  const { toast } = useToast()
  const [selectedRefereeId, setSelectedRefereeId] = useState<string | null>(null)

  const handleRefereeSelect = (refereeId: string) => {
    setSelectedRefereeId(refereeId)
    // Navigate to referee performance page
    window.location.href = `/referees/${refereeId}/performance`
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Referees</h1>
            <p className="text-muted-foreground">
              Manage referees and track performance across your organization
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Reports
            </Button>
            <Link href="/referees/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Referee
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Referees</p>
                  <p className="text-2xl font-bold">24</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mt-2">
                <Badge variant="outline" className="text-green-600">
                  +3 this month
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Referees</p>
                  <p className="text-2xl font-bold">22</p>
                </div>
                <Award className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-2">
                <Badge variant="outline" className="text-green-600">
                  92% active
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Performance</p>
                  <p className="text-2xl font-bold">4.2</p>
                </div>
                <BarChart3 className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="mt-2">
                <Badge variant="outline" className="text-blue-600">
                  Above average
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Matches This Month</p>
                  <p className="text-2xl font-bold">156</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <div className="mt-2">
                <Badge variant="outline" className="text-purple-600">
                  +12% vs last month
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="rankings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rankings">Rankings</TabsTrigger>
            <TabsTrigger value="list">All Referees</TabsTrigger>
            <TabsTrigger value="notifications">Notification Settings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="rankings" className="space-y-4">
            <RefereeRankings onRefereeSelect={handleRefereeSelect} />
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Referees</CardTitle>
                <CardDescription>
                  Complete list of referees in your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Referee List View</h3>
                  <p className="text-muted-foreground mb-4">
                    This view will show a detailed list of all referees with management options.
                  </p>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Referee
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <RefereeNotificationSettings 
              refereeId={selectedRefereeId || 'default-referee-id'}
              refereeName="All Referees"
              onSettingsUpdated={() => {
                toast({
                  title: 'Success',
                  description: 'Notification settings updated successfully'
                })
              }}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>
                  Detailed analytics and insights into referee performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
                  <p className="text-muted-foreground mb-4">
                    This view will show comprehensive analytics and performance insights.
                  </p>
                  <Button variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Reports</CardTitle>
                <CardDescription>
                  Generate and download performance reports for referees
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Report Generation</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate comprehensive performance reports for individual referees or groups.
                  </p>
                  <div className="flex items-center justify-center space-x-4">
                    <Button variant="outline">
                      <Award className="h-4 w-4 mr-2" />
                      Individual Reports
                    </Button>
                    <Button variant="outline">
                      <Users className="h-4 w-4 mr-2" />
                      Group Reports
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
