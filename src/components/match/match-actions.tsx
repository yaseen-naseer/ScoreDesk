'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { matchService, MatchWithDetails } from '@/lib/services/match-service'
import { Play, Pause, RotateCw, FlagCheckered } from 'lucide-react'

interface MatchActionsProps {
  match: MatchWithDetails
  onChange?: () => void
  className?: string
}

export function MatchActions({ match, onChange, className }: MatchActionsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)

  const handle = async (action: 'start' | 'pause' | 'resume' | 'end') => {
    try {
      setLoading(action)
      let result: { success: boolean; error?: string }
      if (action === 'start') result = await matchService.startMatch(match.id)
      else if (action === 'pause') result = await matchService.pauseMatch(match.id)
      else if (action === 'resume') result = await matchService.resumeMatch(match.id)
      else result = await matchService.endMatch(match.id)

      if (result.success) {
        toast({ title: 'Success', description: `Match ${action}ed successfully` })
        onChange?.()
      } else {
        toast({ title: 'Error', description: result.error || 'Action failed', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Unexpected error', variant: 'destructive' })
    } finally {
      setLoading(null)
    }
  }

  const canStart = match.status === 'scheduled' || match.status === 'paused'
  const canPause = match.status === 'live'
  const canResume = match.status === 'paused'
  const canEnd = match.status === 'live' || match.status === 'paused'

  return (
    <div className={`flex flex-wrap gap-2 ${className || ''}`}>
      <Button size="sm" disabled={!canStart || loading !== null} onClick={() => handle('start')}>
        <Play className="h-4 w-4 mr-2" /> Start
      </Button>
      <Button size="sm" variant="outline" disabled={!canPause || loading !== null} onClick={() => handle('pause')}>
        <Pause className="h-4 w-4 mr-2" /> Pause
      </Button>
      <Button size="sm" variant="outline" disabled={!canResume || loading !== null} onClick={() => handle('resume')}>
        <RotateCw className="h-4 w-4 mr-2" /> Resume
      </Button>
      <Button size="sm" variant="secondary" disabled={!canEnd || loading !== null} onClick={() => handle('end')}>
        <FlagCheckered className="h-4 w-4 mr-2" /> End
      </Button>
    </div>
  )
}


