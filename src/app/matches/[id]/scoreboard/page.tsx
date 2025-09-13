'use client'

import { useParams } from 'next/navigation'
import { Scoreboard } from '@/components/scoreboard/scoreboard'

export default function FullscreenScoreboardPage() {
  const params = useParams()
  const matchId = params.id as string

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-6">
        <Scoreboard matchId={matchId} className="bg-neutral-900 border-neutral-800" />
      </div>
    </div>
  )
}


