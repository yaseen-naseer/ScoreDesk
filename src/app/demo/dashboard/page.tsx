import { Metadata } from 'next'
import { AppShell } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Info,
  BarChart3,
  Users,
  Trophy,
  Activity,
  Calendar,
  TrendingUp
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Dashboard Demo - ScoreDesk',
  description: 'Interactive demo of the ScoreDesk organization dashboard',
}

export default function DashboardDemoPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        {/* Demo Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Demo</h1>
            <p className="text-muted-foreground">
              Interactive preview of the ScoreDesk organization dashboard
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Info className="h-3 w-3" />
            Demo Mode
          </Badge>
        </div>

        {/* Demo Notice */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This is a demo of the dashboard with sample data. In the real application, 
            this would show live data from your organization's activities.
          </AlertDescription>
        </Alert>

        {/* Dashboard Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Key Metrics
              </CardTitle>
              <CardDescription>
                Real-time statistics and KPIs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                <li>• Tournament statistics</li>
                <li>• Team performance metrics</li>
                <li>• Player activity data</li>
                <li>• Match completion rates</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Activity Trends
              </CardTitle>
              <CardDescription>
                Growth and performance analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                <li>• 30-day activity comparisons</li>
                <li>• Growth trend indicators</li>
                <li>• Performance benchmarks</li>
                <li>• Usage pattern analysis</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Events
              </CardTitle>
              <CardDescription>
                Scheduled activities and reminders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                <li>• Upcoming matches</li>
                <li>• Tournament schedules</li>
                <li>• Member activities</li>
                <li>• Important deadlines</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest matches and results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                <li>• Recent match results</li>
                <li>• Live match indicators</li>
                <li>• Team activity logs</li>
                <li>• Statistics updates</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Management
              </CardTitle>
              <CardDescription>
                Team and member insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                <li>• Team performance rankings</li>
                <li>• Member role distribution</li>
                <li>• Activity participation</li>
                <li>• Registration statistics</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                <li>• Create new tournament</li>
                <li>• Schedule matches</li>
                <li>• Invite members</li>
                <li>• Generate reports</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Demo Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
          <Button asChild>
            <a href="/dashboard">
              View Live Dashboard
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/organizations/create">
              Create Organization
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/help/dashboard">
              Dashboard Guide
            </a>
          </Button>
        </div>

        {/* Feature Status */}
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Features Status</CardTitle>
            <CardDescription>
              Current implementation status of dashboard components
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">✅ Completed</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Organization metrics service</li>
                  <li>• Dashboard data hooks</li>
                  <li>• Statistics overview cards</li>
                  <li>• Activity trends display</li>
                  <li>• Recent matches widget</li>
                  <li>• Upcoming events widget</li>
                  <li>• Team performance metrics</li>
                  <li>• Membership overview</li>
                  <li>• Quick actions panel</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">🚧 Future Enhancements</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Interactive charts with Chart.js</li>
                  <li>• Real-time data updates</li>
                  <li>• Custom date range filtering</li>
                  <li>• Export capabilities</li>
                  <li>• Mobile-optimized views</li>
                  <li>• Advanced analytics</li>
                  <li>• Performance benchmarking</li>
                  <li>• Notification center</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
