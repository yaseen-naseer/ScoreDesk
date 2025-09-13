'use client'

import { Scoreboard } from '../scoreboard'
import { MatchTimer } from '../match-timer'

interface MobileScoreboardProps {
  matchId: string
  className?: string
  homeColor?: string
  awayColor?: string
  homeLogoUrl?: string
  awayLogoUrl?: string
}

export function MobileScoreboard({ matchId, className, homeColor, awayColor, homeLogoUrl, awayLogoUrl }: MobileScoreboardProps) {
  return (
    <div className={`p-3 ${className || ''}`}>
      <div className="space-y-3">
        <Scoreboard matchId={matchId} homeColor={homeColor} awayColor={awayColor} homeLogoUrl={homeLogoUrl} awayLogoUrl={awayLogoUrl} />
        <MatchTimer isLive={true} periodMinutes={45} />
      </div>
    </div>
  )
}


