'use client'

import { Scoreboard } from '../scoreboard'
import { MatchTimer } from '../match-timer'

interface TVScoreboardProps {
  matchId: string
  className?: string
  homeColor?: string
  awayColor?: string
  homeLogoUrl?: string
  awayLogoUrl?: string
}

export function TVScoreboard({ matchId, className, homeColor, awayColor, homeLogoUrl, awayLogoUrl }: TVScoreboardProps) {
  return (
    <div className={`w-full bg-black text-white p-4 ${className || ''}`}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <MatchTimer isLive={true} periodMinutes={45} />
          <div className="flex-1 px-4">
            <Scoreboard matchId={matchId} homeColor={homeColor} awayColor={awayColor} homeLogoUrl={homeLogoUrl} awayLogoUrl={awayLogoUrl} />
          </div>
          <div className="text-xs opacity-70">TV Mode</div>
        </div>
      </div>
    </div>
  )
}


