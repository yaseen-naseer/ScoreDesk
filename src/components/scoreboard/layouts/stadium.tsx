'use client'

import { Scoreboard } from '../scoreboard'
import { MatchTimer } from '../match-timer'
import { Card, CardContent } from '@/components/ui/card'

interface StadiumScoreboardProps {
  matchId: string
  className?: string
  homeColor?: string
  awayColor?: string
  homeLogoUrl?: string
  awayLogoUrl?: string
}

export function StadiumScoreboard({ matchId, className, homeColor, awayColor, homeLogoUrl, awayLogoUrl }: StadiumScoreboardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4 md:p-6">
        <div className="grid grid-cols-1 gap-4">
          <Scoreboard matchId={matchId} homeColor={homeColor} awayColor={awayColor} homeLogoUrl={homeLogoUrl} awayLogoUrl={awayLogoUrl} />
          <div className="flex justify-center">
            <MatchTimer isLive={true} periodMinutes={45} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


