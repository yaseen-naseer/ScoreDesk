'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Optionally log to monitoring here
    // console.error(error)
  }, [error])

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="max-w-md text-center space-y-4">
        <div className="flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-yellow-600" />
        </div>
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground break-all">{error.message}</p>
        <div className="flex items-center justify-center gap-2">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/')}>Go home</Button>
        </div>
      </div>
    </div>
  )
}


