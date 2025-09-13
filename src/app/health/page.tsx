import { HealthDashboard } from '@/components/ui/health-dashboard'
import { ConnectionStatus } from '@/components/ui/connection-status'

export default function HealthPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground mt-2">
            Monitor real-time connections, database health, and system performance
          </p>
        </div>
        <ConnectionStatus />
      </div>

      <div className="grid gap-6">
        <HealthDashboard />
      </div>
    </div>
  )
}
