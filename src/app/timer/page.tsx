'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSearchParams } from 'next/navigation'
import { ProfessionalTimerControl } from '@/components/match/professional-timer-control'
import { EnhancedMatchTimer } from '@/components/scoreboard/enhanced-match-timer'
import { 
  Timer, 
  Settings, 
  Users, 
  Activity, 
  AlertTriangle, 
  History,
  BarChart3,
  Shield,
  Clock,
  Bell
} from 'lucide-react'

export default function TimerDashboard() {
  const searchParams = useSearchParams()
  const matchId = searchParams.get('matchId') || 'demo-match'
  const userId = searchParams.get('userId') || 'demo-user'
  const userRole = searchParams.get('userRole') || 'referee'

  const [activeTab, setActiveTab] = useState('control')

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Professional Match Timer</h1>
          <p className="text-muted-foreground">
            Match ID: {matchId} | Role: {userRole}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Live
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            3 Connected
          </Badge>
        </div>
      </div>

      {/* Main Timer Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Match Timer
          </CardTitle>
          <CardDescription>
            High-precision timer with millisecond accuracy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <EnhancedMatchTimer
              matchId={matchId}
              userId={userId}
              userRole={userRole}
              isLive={true}
              precision="milliseconds"
              showControls={false}
              className="text-center"
            />
          </div>
        </CardContent>
      </Card>

      {/* Control Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="control" className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Control
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Conflicts
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Sync
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="control" className="space-y-4">
          <ProfessionalTimerControl
            matchId={matchId}
            userId={userId}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permission System
              </CardTitle>
              <CardDescription>
                Role-based access control for timer operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Your Role: {userRole}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Start Timer</span>
                        <Badge variant={userRole === 'referee' ? 'default' : 'secondary'}>
                          {userRole === 'referee' ? 'Allowed' : 'Denied'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Pause Timer</span>
                        <Badge variant={['referee', 'assistant_referee'].includes(userRole) ? 'default' : 'secondary'}>
                          {['referee', 'assistant_referee'].includes(userRole) ? 'Allowed' : 'Denied'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Add Stoppage</span>
                        <Badge variant={['referee', 'assistant_referee', 'fourth_official'].includes(userRole) ? 'default' : 'secondary'}>
                          {['referee', 'assistant_referee', 'fourth_official'].includes(userRole) ? 'Allowed' : 'Denied'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Active Users</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Referee (Master)</span>
                        <Badge variant="default">Online</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Assistant Referee</span>
                        <Badge variant="default">Online</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Fourth Official</span>
                        <Badge variant="outline">Offline</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Conflict Resolution
              </CardTitle>
              <CardDescription>
                Monitor and resolve timer control conflicts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Active Conflicts</h3>
                  <p className="text-muted-foreground">
                    All timer operations are running smoothly
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">0</div>
                    <div className="text-sm text-muted-foreground">Active Conflicts</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">12</div>
                    <div className="text-sm text-muted-foreground">Resolved Today</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">98%</div>
                    <div className="text-sm text-muted-foreground">Auto Resolution</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Synchronization Status
              </CardTitle>
              <CardDescription>
                Real-time synchronization across devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Connection Status</span>
                      <Badge variant="default" className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Connected
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Sync Latency</span>
                      <span className="text-sm font-mono">23ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Last Sync</span>
                      <span className="text-sm">2s ago</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Connected Devices</span>
                      <span className="text-sm">3</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Master Client</span>
                      <span className="text-sm">Referee</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Sync Errors</span>
                      <span className="text-sm text-green-600">0</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Connected Devices</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">Referee - Main Control</span>
                      <Badge variant="default">Master</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">Assistant Referee</span>
                      <Badge variant="outline">Slave</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">Scoreboard Display</span>
                      <Badge variant="outline">Display</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Audit Log
              </CardTitle>
              <CardDescription>
                Complete log of all timer operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {[
                    { time: '14:32:15', user: 'Referee', action: 'Timer Started', severity: 'info' },
                    { time: '14:32:45', user: 'Assistant Referee', action: 'Added 2\' Stoppage', severity: 'info' },
                    { time: '14:33:12', user: 'Referee', action: 'Injury Time Started', severity: 'warning' },
                    { time: '14:35:30', user: 'Referee', action: 'Injury Time Ended', severity: 'info' },
                    { time: '14:37:22', user: 'Referee', action: 'Timer Paused', severity: 'info' },
                  ].map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-muted-foreground">{entry.time}</span>
                        <span className="text-sm font-medium">{entry.user}</span>
                        <span className="text-sm">{entry.action}</span>
                      </div>
                      <Badge variant={entry.severity === 'warning' ? 'destructive' : 'outline'}>
                        {entry.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing 5 of 127 operations
                  </div>
                  <Button variant="outline" size="sm">
                    Export Log
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Timer Analytics
              </CardTitle>
              <CardDescription>
                Performance metrics and statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h4 className="font-medium">Performance Metrics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Timer Precision</span>
                        <span className="text-sm font-mono">±1.2ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Sync Accuracy</span>
                        <span className="text-sm font-mono">99.8%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Average Latency</span>
                        <span className="text-sm font-mono">23ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Uptime</span>
                        <span className="text-sm font-mono">99.9%</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium">Operation Statistics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Total Operations</span>
                        <span className="text-sm">127</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Success Rate</span>
                        <span className="text-sm text-green-600">98.4%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Conflicts Resolved</span>
                        <span className="text-sm">12</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Auto Resolution</span>
                        <span className="text-sm text-blue-600">83%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Most Common Operations</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Start Timer</span>
                      <span>1</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Add Stoppage Time</span>
                      <span>8</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Injury Time</span>
                      <span>3</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Timer Pause</span>
                      <span>2</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
