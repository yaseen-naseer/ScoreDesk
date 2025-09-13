/**
 * Debug Page
 * Real-time debugging and monitoring interface
 */

import { RealtimeDebugConsole } from '@/components/ui/realtime-debug-console'

export default function DebugPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Real-time Debug Console</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Monitor and debug real-time events, subscriptions, and performance metrics.
        </p>
      </div>
      
      <RealtimeDebugConsole />
    </div>
  )
}
