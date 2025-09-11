'use client'

/**
 * Session Timeout Warning Modal
 * Displays warning when user session is about to expire
 */

import React, { useState, useEffect } from 'react'
import { AlertTriangle, Clock, RefreshCw, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useSessionTimeout } from '@/hooks/use-session-management'
import { useAuth } from '@/lib/auth/auth-context'

interface SessionTimeoutModalProps {
  warningTime?: number
  autoExtendThreshold?: number
  onTimeout?: () => void
}

export function SessionTimeoutModal({
  warningTime = 5 * 60 * 1000, // 5 minutes
  autoExtendThreshold = 30 * 1000, // 30 seconds
  onTimeout
}: SessionTimeoutModalProps) {
  const { logout } = useAuth()
  const [autoExtendCountdown, setAutoExtendCountdown] = useState<number | null>(null)

  const {
    showWarning,
    timeLeft,
    dismissWarning,
    extendSession
  } = useSessionTimeout({
    warningTime,
    onTimeout: () => {
      dismissWarning()
      onTimeout?.()
    }
  })

  // Auto-extend countdown
  useEffect(() => {
    if (!timeLeft || timeLeft > autoExtendThreshold) {
      setAutoExtendCountdown(null)
      return
    }

    const countdown = Math.ceil(timeLeft / 1000)
    setAutoExtendCountdown(countdown)

    if (countdown <= 0) {
      handleSignOut()
    }
  }, [timeLeft, autoExtendThreshold])

  const handleExtendSession = () => {
    extendSession()
    setAutoExtendCountdown(null)
  }

  const handleSignOut = () => {
    dismissWarning()
    logout()
  }

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getWarningLevel = (timeLeft: number) => {
    if (timeLeft <= 60000) return 'critical' // 1 minute
    if (timeLeft <= 120000) return 'urgent' // 2 minutes
    return 'warning'
  }

  const warningLevel = timeLeft ? getWarningLevel(timeLeft) : 'warning'
  const progressValue = timeLeft ? (timeLeft / warningTime) * 100 : 0

  if (!showWarning || !timeLeft) return null

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${
              warningLevel === 'critical' 
                ? 'bg-red-100 dark:bg-red-900/20' 
                : warningLevel === 'urgent'
                ? 'bg-orange-100 dark:bg-orange-900/20'
                : 'bg-yellow-100 dark:bg-yellow-900/20'
            }`}>
              {warningLevel === 'critical' ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-600" />
              )}
            </div>
            Session Timeout Warning
          </DialogTitle>
          <DialogDescription>
            Your session will expire soon due to inactivity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Time Remaining */}
          <div className="text-center">
            <div className={`text-3xl font-mono font-bold ${
              warningLevel === 'critical' 
                ? 'text-red-600' 
                : warningLevel === 'urgent'
                ? 'text-orange-600'
                : 'text-yellow-600'
            }`}>
              {formatTime(timeLeft)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Time remaining
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress 
              value={progressValue} 
              className={`h-2 ${
                warningLevel === 'critical' 
                  ? '[&>div]:bg-red-500' 
                  : warningLevel === 'urgent'
                  ? '[&>div]:bg-orange-500'
                  : '[&>div]:bg-yellow-500'
              }`}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Session expires</span>
              <span>Stay signed in</span>
            </div>
          </div>

          {/* Auto-logout warning */}
          {autoExtendCountdown && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You will be automatically signed out in {autoExtendCountdown} seconds.
              </AlertDescription>
            </Alert>
          )}

          {/* Information */}
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              To keep your session active, click "Stay Signed In" or interact with the application.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="flex-1"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
          <Button
            onClick={handleExtendSession}
            className="flex-1"
            disabled={autoExtendCountdown !== null}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Stay Signed In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook for using session timeout modal
export function useSessionTimeoutModal(options: {
  warningTime?: number
  autoExtendThreshold?: number
  onTimeout?: () => void
} = {}) {
  return {
    SessionTimeoutModal: () => <SessionTimeoutModal {...options} />
  }
}

export default SessionTimeoutModal
