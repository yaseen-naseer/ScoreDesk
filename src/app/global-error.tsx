'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-md text-center space-y-4">
            <div className="flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold">Application error</h2>
            <p className="text-sm text-muted-foreground break-all">{error.message}</p>
            <div className="flex items-center justify-center gap-2">
              <Button onClick={() => reset()}>Try again</Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}


