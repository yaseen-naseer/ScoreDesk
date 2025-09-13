'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Plus, 
  Minus, 
  AlertTriangle, 
  User, 
  Shield, 
  Activity,
  Timer,
  Stopwatch,
  Zap,
  History,
  Bell
} from 'lucide-react'
import { MatchTimerService, PrecisionTimerState, TimerControl, TimerNotification, InjuryTimeEntry } from '@/lib/services/match-timer-service'

interface ProfessionalTimerControlProps {
  matchId: string
  userId: string
  userRole: string
  className?: string
}

export function ProfessionalTimerControl({ 
  matchId, 
  userId, 
  userRole, 
  className 
}: ProfessionalTimerControlProps) {
  const { toast } = useToast()
  const [timerService] = useState(() => new MatchTimerService({} as any)) // Will be injected
  const [currentState, setCurrentState] = useState<PrecisionTimerState | null>(null)
  const [timerControl, setTimerControl] = useState<TimerControl>({
    canStart: false,
    canPause: false,
    canResume: false,
    canStop: false,
    canAddStoppage: false,
    canAddExtraTime: false,
    canEditTime: false
  })
  const [notifications, setNotifications] = useState<TimerNotification[]>([])
  const [injuryEntries, setInjuryEntries] = useState<InjuryTimeEntry[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [stoppageMinutes, setStoppageMinutes] = useState(1)
  const [injuryPlayerId, setInjuryPlayerId] = useState('')
  const [injuryReason, setInjuryReason] = useState('')
  const [activeInjuryId, setActiveInjuryId] = useState<string | null>(null)

  // Initialize timer service
  useEffect(() => {
    const initializeTimer = async () => {
      const success = await timerService.initializeTimer(matchId, userId, userRole)
      if (success) {
        setIsInitialized(true)
        const control = timerService.getTimerControl(userRole)
        setTimerControl(control)
        setCurrentState(timerService.getCurrentState())
        setInjuryEntries(timerService.getCurrentState()?.injuryTimeEntries || [])
      } else {
        toast({
          title: "Timer Initialization Failed",
          description: "Could not initialize the match timer",
          variant: "destructive"
        })
      }
    }

    initializeTimer()

    // Set up subscriptions
    const unsubscribeState = timerService.onStateChange((state) => {
      setCurrentState(state)
    })

    const unsubscribeNotifications = timerService.onNotification((notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 99)]) // Keep last 100
      toast({
        title: notification.message,
        description: `Severity: ${notification.severity}`,
        variant: notification.severity === 'error' ? 'destructive' : 'default'
      })
    })

    return () => {
      unsubscribeState()
      unsubscribeNotifications()
      timerService.destroy()
    }
  }, [matchId, userId, userRole])

  // Update injury entries when state changes
  useEffect(() => {
    if (currentState) {
      setInjuryEntries(currentState.injuryTimeEntries)
      const activeInjury = currentState.injuryTimeEntries.find(entry => !entry.endTime)
      setActiveInjuryId(activeInjury?.id || null)
    }
  }, [currentState])

  const handleStart = useCallback(async () => {
    const success = await timerService.startTimer(matchId, userId, userRole)
    if (!success) {
      toast({
        title: "Start Failed",
        description: "Could not start the timer",
        variant: "destructive"
      })
    }
  }, [matchId, userId, userRole])

  const handlePause = useCallback(async () => {
    const success = await timerService.pauseTimer(matchId, userId, userRole)
    if (!success) {
      toast({
        title: "Pause Failed",
        description: "Could not pause the timer",
        variant: "destructive"
      })
    }
  }, [matchId, userId, userRole])

  const handleResume = useCallback(async () => {
    const success = await timerService.resumeTimer(matchId, userId, userRole)
    if (!success) {
      toast({
        title: "Resume Failed",
        description: "Could not resume the timer",
        variant: "destructive"
      })
    }
  }, [matchId, userId, userRole])

  const handleAddStoppage = useCallback(async () => {
    const success = await timerService.addStoppageTime(matchId, stoppageMinutes, userId, userRole)
    if (!success) {
      toast({
        title: "Add Stoppage Failed",
        description: "Could not add stoppage time",
        variant: "destructive"
      })
    }
  }, [matchId, stoppageMinutes, userId, userRole])

  const handleStartInjury = useCallback(async () => {
    if (!injuryPlayerId.trim()) {
      toast({
        title: "Player ID Required",
        description: "Please enter a player ID for the injury",
        variant: "destructive"
      })
      return
    }

    const success = await timerService.addInjuryTime(matchId, injuryPlayerId, injuryReason, userId, userRole)
    if (success) {
      setInjuryPlayerId('')
      setInjuryReason('')
    } else {
      toast({
        title: "Start Injury Failed",
        description: "Could not start injury time tracking",
        variant: "destructive"
      })
    }
  }, [matchId, injuryPlayerId, injuryReason, userId, userRole])

  const handleEndInjury = useCallback(async (injuryId: string) => {
    const success = await timerService.endInjuryTime(injuryId, matchId, userId, userRole)
    if (!success) {
      toast({
        title: "End Injury Failed",
        description: "Could not end injury time tracking",
        variant: "destructive"
      })
    }
  }, [matchId, userId, userRole])

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const ms = Math.floor((milliseconds % 1000) / 10)
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(2, '0')}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100'
      case 'paused': return 'text-yellow-600 bg-yellow-100'
      case 'stopped': return 'text-gray-600 bg-gray-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'H1': return '1st Half'
      case 'HT': return 'Half Time'
      case 'H2': return '2nd Half'
      case 'FT': return 'Full Time'
      case 'ET1': return 'Extra Time 1'
      case 'ET2': return 'Extra Time 2'
      case 'AET': return 'After Extra Time'
      case 'PEN': return 'Penalties'
      default: return period
    }
  }

  if (!isInitialized || !currentState) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Initializing timer...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <Tabs defaultValue="control" className="space-y-4">
        <TabsList>
          <TabsTrigger value="control" className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Timer Control
          </TabsTrigger>
          <TabsTrigger value="injury" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Injury Time
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="control" className="space-y-4">
          {/* Main Timer Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Match Timer</span>
                <Badge className={getStatusColor(currentState.status)}>
                  {currentState.status.toUpperCase()}
                </Badge>
              </CardTitle>
              <CardDescription>
                Period: {getPeriodLabel(currentState.currentPeriod)} | 
                Precision: ±{currentState.precision}ms | 
                Last Control: {currentState.lastControlUser} ({currentState.lastControlTime.toLocaleTimeString()})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                {/* Time Display */}
                <div className="text-6xl font-mono font-bold">
                  {formatTime(currentState.currentElapsed)}
                </div>
                
                {/* Stoppage Time */}
                {currentState.stoppageTime > 0 && (
                  <div className="text-2xl text-orange-600 font-mono">
                    +{formatTime(currentState.stoppageTime)}
                  </div>
                )}

                {/* Control Buttons */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {timerControl.canStart && currentState.status === 'stopped' && (
                    <Button onClick={handleStart} size="lg" className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Start
                    </Button>
                  )}
                  
                  {timerControl.canPause && currentState.status === 'running' && (
                    <Button onClick={handlePause} size="lg" variant="outline" className="flex items-center gap-2">
                      <Pause className="h-4 w-4" />
                      Pause
                    </Button>
                  )}
                  
                  {timerControl.canResume && currentState.status === 'paused' && (
                    <Button onClick={handleResume} size="lg" className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Resume
                    </Button>
                  )}
                </div>

                {/* Stoppage Time Controls */}
                {timerControl.canAddStoppage && (
                  <div className="flex items-center gap-2 justify-center">
                    <Label htmlFor="stoppage-minutes">Add Stoppage:</Label>
                    <Input
                      id="stoppage-minutes"
                      type="number"
                      min="1"
                      max="10"
                      value={stoppageMinutes}
                      onChange={(e) => setStoppageMinutes(parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                    <span>min</span>
                    <Button onClick={handleAddStoppage} size="sm" variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timer Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Timer Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Current Period</Label>
                  <div className="font-mono">{getPeriodLabel(currentState.currentPeriod)}</div>
                </div>
                <div>
                  <Label>Period Duration</Label>
                  <div className="font-mono">{formatTime(currentState.periodDuration)}</div>
                </div>
                <div>
                  <Label>Total Paused</Label>
                  <div className="font-mono">{formatTime(currentState.totalPausedDuration)}</div>
                </div>
                <div>
                  <Label>Sync Offset</Label>
                  <div className="font-mono">{currentState.syncOffset}ms</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Your Permissions ({userRole})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(timerControl).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Badge variant={value ? "default" : "secondary"} className="text-xs">
                      {value ? "✓" : "✗"}
                    </Badge>
                    <span className="capitalize">{key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="injury" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Injury Time Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Start Injury Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="injury-player">Player ID</Label>
                  <Input
                    id="injury-player"
                    value={injuryPlayerId}
                    onChange={(e) => setInjuryPlayerId(e.target.value)}
                    placeholder="Enter player ID"
                  />
                </div>
                <div>
                  <Label htmlFor="injury-reason">Reason</Label>
                  <Input
                    id="injury-reason"
                    value={injuryReason}
                    onChange={(e) => setInjuryReason(e.target.value)}
                    placeholder="Injury description"
                  />
                </div>
              </div>
              
              <Button onClick={handleStartInjury} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Start Injury Time
              </Button>

              <Separator />

              {/* Active Injuries */}
              <div>
                <Label>Active Injuries</Label>
                <div className="space-y-2 mt-2">
                  {injuryEntries.filter(entry => !entry.endTime).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Player {entry.playerId}</div>
                        <div className="text-sm text-muted-foreground">
                          Started: {entry.startTime.toLocaleTimeString()}
                        </div>
                        {entry.reason && (
                          <div className="text-sm text-muted-foreground">
                            Reason: {entry.reason}
                          </div>
                        )}
                      </div>
                      <Button 
                        onClick={() => handleEndInjury(entry.id)}
                        size="sm"
                        variant="outline"
                      >
                        End Injury
                      </Button>
                    </div>
                  ))}
                  
                  {injuryEntries.filter(entry => !entry.endTime).length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      No active injuries
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Injury History */}
              <div>
                <Label>Injury History</Label>
                <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                  {injuryEntries.filter(entry => entry.endTime).map((entry) => (
                    <div key={entry.id} className="p-2 border rounded text-sm">
                      <div className="font-medium">Player {entry.playerId}</div>
                      <div className="text-muted-foreground">
                        {entry.startTime.toLocaleTimeString()} - {entry.endTime?.toLocaleTimeString()}
                      </div>
                      <div className="text-muted-foreground">
                        Duration: {Math.floor((entry.duration || 0) / 60000)} minutes
                      </div>
                      {entry.reason && (
                        <div className="text-muted-foreground">
                          Reason: {entry.reason}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {injuryEntries.filter(entry => entry.endTime).length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      No injury history
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Timer Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <Alert key={notification.id} className={`${
                    notification.severity === 'error' ? 'border-red-200 bg-red-50' :
                    notification.severity === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }`}>
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{notification.message}</div>
                          <div className="text-sm text-muted-foreground">
                            {notification.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {notification.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
                
                {notifications.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No notifications yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Operation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {timerService.getOperationHistory().map((operation) => (
                  <div key={operation.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="font-medium capitalize">
                        {operation.type.replace('_', ' ')}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {operation.timestamp.toLocaleTimeString()}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      By {operation.userRole} ({operation.userId})
                    </div>
                    {operation.details && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {JSON.stringify(operation.details)}
                      </div>
                    )}
                  </div>
                ))}
                
                {timerService.getOperationHistory().length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No operations recorded yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
