/**
 * Testing Page
 * Real-time testing and validation interface
 */

import { RealtimeTestingDashboard } from '@/components/ui/realtime-testing-dashboard'

export default function TestingPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Real-time Testing</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Test and validate real-time functionality, performance, and reliability.
        </p>
      </div>
      
      <RealtimeTestingDashboard />
    </div>
  )
}
