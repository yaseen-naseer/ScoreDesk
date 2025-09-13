/**
 * Analytics Page
 * Real-time analytics and performance monitoring
 */

import { RealtimeAnalyticsDashboard } from '@/components/ui/realtime-analytics-dashboard'

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Real-time Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Monitor subscription performance, system health, and usage patterns.
        </p>
      </div>
      
      <RealtimeAnalyticsDashboard />
    </div>
  )
}
