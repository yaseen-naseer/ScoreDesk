'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { sessionManager } from '@/lib/auth/session-manager'

interface SessionMonitorProps {
  warningMinutes?: number
  maxInactiveMinutes?: number
  children: React.ReactNode
}

/**
 * Component that monitors session activity and warns about session expiration
 */
export default function SessionMonitor({
  warningMinutes = 10,
  maxInactiveMinutes = 120,
  children,
}: SessionMonitorProps) {
  const { user, signOut } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)

  useEffect(() => {
    if (!user) return

    const checkSession = () => {
      const lastActivity = sessionManager.getLastActivity()
      const timeSinceActivity = Date.now() - lastActivity
      const warningThreshold = (maxInactiveMinutes - warningMinutes) * 60 * 1000
      const expirationThreshold = maxInactiveMinutes * 60 * 1000

      if (timeSinceActivity >= expirationThreshold) {
        // Session expired, sign out
        signOut()
        setShowWarning(false)
      } else if (timeSinceActivity >= warningThreshold) {
        // Show warning
        const remaining = Math.ceil((expirationThreshold - timeSinceActivity) / 60000)
        setTimeRemaining(remaining)
        setShowWarning(true)
      } else {
        // All good
        setShowWarning(false)
      }
    }

    // Check immediately
    checkSession()

    // Check every minute
    const interval = setInterval(checkSession, 60000)

    return () => clearInterval(interval)
  }, [user, signOut, warningMinutes, maxInactiveMinutes])

  const handleExtendSession = () => {
    sessionManager.updateActivity()
    setShowWarning(false)
  }

  const handleSignOut = () => {
    signOut()
  }

  if (!showWarning) {
    return <>{children}</>
  }

  return (
    <>
      {children}
      
      {/* Session Warning Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          
          <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-md w-full">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Session Expiring Soon
                </h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your session will expire in <strong>{timeRemaining} minute{timeRemaining !== 1 ? 's' : ''}</strong> due to inactivity.
                Would you like to extend your session?
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleExtendSession}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                Extend Session
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
