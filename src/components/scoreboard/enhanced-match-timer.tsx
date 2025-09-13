'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { useSupabase } from '@/components/providers/supabase-provider'
import { MatchTimerService, PrecisionTimerState, TimerPeriod } from '@/lib/services/match-timer-service'
import { useToast } from '@/hooks/use-toast'

interface EnhancedMatchTimerProps {
  matchId: string
  userId: string
  userRole: string
  isLive?: boolean
  startTimestamp?: number | null
  periodMinutes?: number
  onTick?: (ms: number) => void
  className?: string
  showControls?: boolean
  precision?: 'seconds' | 'milliseconds'
}

export function EnhancedMatchTimer({
  matchId,
  userId,
  userRole,
  isLive = false,
  startTimestamp = null,
  periodMinutes = 45,
  onTick,
  className,
  showControls = false,
  precision = 'seconds'
}: EnhancedMatchTimerProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [timerService] = useState(() => new MatchTimerService(supabase))
  const [currentState, setCurrentState] = useState<PrecisionTimerState | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const animationFrameRef = useRef<number | null>(null)
  const lastTickTime = useRef<number>(0)

  // Initialize timer service
  useEffect(() => {
    const initializeTimer = async () => {
      const success = await timerService.initializeTimer(matchId, userId, userRole)
      if (success) {
        setIsInitialized(true)
        setCurrentState(timerService.getCurrentState())
        
        // If timer is running, start the animation loop
        if (isLive && timerService.getCurrentState()?.status === 'running') {
          startAnimationLoop()
        }
      }
    }

    initializeTimer()

    // Set up state change subscription
    const unsubscribe = timerService.onStateChange((state) => {
      setCurrentState(state)
      
      // Start/stop animation loop based on status
      if (state.status === 'running') {
        startAnimationLoop()
      } else {
        stopAnimationLoop()
      }
    })

    return () => {
      unsubscribe()
      stopAnimationLoop()
      timerService.destroy()
    }
  }, [matchId, userId, userRole])

  // Animation loop for smooth updates
  const animationLoop = useCallback((timestamp: number) => {
    if (!currentState || currentState.status !== 'running') {
      return
    }

    // Throttle updates to prevent excessive re-renders
    const now = performance.now()
    if (now - lastTickTime.current >= (precision === 'milliseconds' ? 16 : 1000)) {
      const updatedState = timerService.getCurrentState()
      if (updatedState) {
        setCurrentState(updatedState)
        onTick?.(updatedState.currentElapsed)
      }
      lastTickTime.current = now
    }

    animationFrameRef.current = requestAnimationFrame(animationLoop)
  }, [currentState, precision, onTick])

  const startAnimationLoop = useCallback(() => {
    if (animationFrameRef.current) {
      return // Already running
    }
    animationFrameRef.current = requestAnimationFrame(animationLoop)
  }, [animationLoop])

  const stopAnimationLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    
    if (precision === 'milliseconds') {
      const ms = Math.floor((milliseconds % 1000) / 10)
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(2, '0')}`
    } else {
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
  }

  const getPeriodLabel = (period: TimerPeriod): string => {
    switch (period) {
      case 'H1': return '1st Half'
      case 'HT': return 'Half Time'
      case 'H2': return '2nd Half'
      case 'FT': return 'Full Time'
      case 'ET1': return 'ET 1'
      case 'ET2': return 'ET 2'
      case 'AET': return 'After ET'
      case 'PEN': return 'Penalties'
      default: return period
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      case 'stopped': return 'bg-gray-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getPeriodColor = (period: TimerPeriod) => {
    switch (period) {
      case 'H1': return 'bg-blue-500'
      case 'HT': return 'bg-purple-500'
      case 'H2': return 'bg-blue-600'
      case 'FT': return 'bg-green-600'
      case 'ET1': return 'bg-orange-500'
      case 'ET2': return 'bg-orange-600'
      case 'AET': return 'bg-red-500'
      case 'PEN': return 'bg-indigo-500'
      default: return 'bg-gray-500'
    }
  }

  if (!isInitialized || !currentState) {
    return (
      <div className={className} role="region" aria-label="Match timer">
        <div className="flex items-center gap-3" aria-live="polite">
          <Badge variant="outline">Loading...</Badge>
          <span className="font-mono text-2xl">00:00</span>
        </div>
      </div>
    )
  }

  const displayTime = currentState.currentElapsed + currentState.stoppageTime
  const hasStoppageTime = currentState.stoppageTime > 0

  return (
    <div className={className} role="region" aria-label="Match timer">
      <div className="flex items-center gap-3" aria-live="polite">
        {/* Period Badge */}
        <Badge 
          className={`${getPeriodColor(currentState.currentPeriod)} text-white`}
        >
          {getPeriodLabel(currentState.currentPeriod)}
        </Badge>

        {/* Status Indicator */}
        <div className={`w-3 h-3 rounded-full ${getStatusColor(currentState.status)}`} 
             title={`Timer ${currentState.status}`} />

        {/* Main Time Display */}
        <span className="font-mono text-2xl font-bold">
          {formatTime(currentState.currentElapsed)}
        </span>

        {/* Stoppage Time */}
        {hasStoppageTime && (
          <span className="font-mono text-lg text-orange-600 font-medium">
            +{formatTime(currentState.stoppageTime)}
          </span>
        )}

        {/* Precision Indicator */}
        {precision === 'milliseconds' && (
          <span className="text-xs text-muted-foreground font-mono">
            ±{currentState.precision}ms
          </span>
        )}
      </div>

      {/* Additional Info */}
      <div className="mt-2 text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-4">
          <span>Period: {formatTime(currentState.periodDuration)}</span>
          {currentState.totalPausedDuration > 0 && (
            <span>Paused: {formatTime(currentState.totalPausedDuration)}</span>
          )}
        </div>
        
        {currentState.lastControlUser && (
          <div className="text-xs">
            Last control: {currentState.lastControlUser} ({currentState.lastControlTime.toLocaleTimeString()})
          </div>
        )}

        {/* Active Injuries */}
        {currentState.injuryTimeEntries.filter(entry => !entry.endTime).length > 0 && (
          <div className="text-orange-600 font-medium">
            {currentState.injuryTimeEntries.filter(entry => !entry.endTime).length} active injury(ies)
          </div>
        )}
      </div>

      {/* Controls (if enabled) */}
      {showControls && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => timerService.startTimer(matchId, userId, userRole)}
            disabled={currentState.status === 'running'}
            className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Start
          </button>
          <button
            onClick={() => timerService.pauseTimer(matchId, userId, userRole)}
            disabled={currentState.status !== 'running'}
            className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
          >
            Pause
          </button>
          <button
            onClick={() => timerService.resumeTimer(matchId, userId, userRole)}
            disabled={currentState.status !== 'paused'}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Resume
          </button>
          <button
            onClick={() => timerService.addStoppageTime(matchId, 1, userId, userRole)}
            className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            +1' ST
          </button>
        </div>
      )}
    </div>
  )
}
