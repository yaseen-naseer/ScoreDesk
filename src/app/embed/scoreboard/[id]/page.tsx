'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { Scoreboard } from '@/components/scoreboard/scoreboard'

export default function EmbedScoreboardPage() {
  const params = useParams()
  const sp = useSearchParams()
  const matchId = params.id as string
  const bg = sp.get('bg') || 'black'

  return (
    <div className="min-h-screen" style={{ backgroundColor: bg }}>
      <div className="px-2 py-2">
        <Scoreboard matchId={matchId} className="mx-auto max-w-screen-xl bg-transparent border-transparent" />
      </div>
    </div>
  )
}


