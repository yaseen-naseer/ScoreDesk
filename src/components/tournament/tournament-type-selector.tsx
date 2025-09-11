'use client'

import { useState } from 'react'
import { Trophy, Users, Target, Zap } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export type TournamentFormat = 'league' | 'knockout' | 'group'

interface TournamentTypeSelectorProps {
  selectedFormat: TournamentFormat
  onFormatChange: (format: TournamentFormat) => void
  disabled?: boolean
}

interface TournamentFormatInfo {
  id: TournamentFormat
  name: string
  description: string
  icon: React.ReactNode
  features: string[]
  bestFor: string
  teamCount: string
  duration: string
}

const tournamentFormats: TournamentFormatInfo[] = [
  {
    id: 'league',
    name: 'League',
    description: 'Round-robin format where each team plays every other team',
    icon: <Trophy className="h-6 w-6" />,
    features: [
      'Every team plays every other team',
      'Most matches per team',
      'Fair comparison of all teams',
      'Clear standings table'
    ],
    bestFor: 'Season-long competitions, local leagues',
    teamCount: '4-20 teams',
    duration: 'Longer duration'
  },
  {
    id: 'knockout',
    name: 'Knockout',
    description: 'Single elimination tournament with bracket progression',
    icon: <Target className="h-6 w-6" />,
    features: [
      'Single elimination format',
      'Quick tournament completion',
      'High stakes matches',
      'Clear bracket progression'
    ],
    bestFor: 'Cup competitions, playoffs, short tournaments',
    teamCount: '4-64 teams',
    duration: 'Short duration'
  },
  {
    id: 'group',
    name: 'Group Stage',
    description: 'Teams divided into groups, with group winners advancing',
    icon: <Users className="h-6 w-6" />,
    features: [
      'Teams divided into groups',
      'Group winners advance',
      'Balanced competition',
      'Multiple advancement paths'
    ],
    bestFor: 'Large tournaments, international competitions',
    teamCount: '8-32 teams',
    duration: 'Medium duration'
  }
]

export function TournamentTypeSelector({ selectedFormat, onFormatChange, disabled }: TournamentTypeSelectorProps) {
  const [hoveredFormat, setHoveredFormat] = useState<TournamentFormat | null>(null)

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Choose Tournament Format</h3>
        <p className="text-sm text-muted-foreground">
          Select the format that best fits your tournament needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tournamentFormats.map((format) => {
          const isSelected = selectedFormat === format.id
          const isHovered = hoveredFormat === format.id

          return (
            <Card
              key={format.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
                  : isHovered
                  ? 'ring-1 ring-gray-300 dark:ring-gray-600'
                  : 'hover:shadow-md'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && onFormatChange(format.id)}
              onMouseEnter={() => setHoveredFormat(format.id)}
              onMouseLeave={() => setHoveredFormat(null)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg ${
                      isSelected 
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {format.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{format.name}</CardTitle>
                      <Badge variant={isSelected ? 'default' : 'secondary'} className="text-xs">
                        {format.teamCount}
                      </Badge>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                      <Zap className="h-4 w-4" />
                      <span className="text-sm font-medium">Selected</span>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {format.description}
                </p>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Key Features:</div>
                  <ul className="text-xs space-y-1">
                    {format.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <div className="w-1 h-1 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Best for:</span>
                      <span className="font-medium">{format.bestFor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">{format.duration}</span>
                    </div>
                  </div>
                </div>

                {!disabled && (
                  <Button
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className="w-full mt-3"
                    onClick={(e) => {
                      e.stopPropagation()
                      onFormatChange(format.id)
                    }}
                  >
                    {isSelected ? 'Selected' : 'Select Format'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Format Comparison */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Format Comparison</CardTitle>
          <CardDescription>
            Quick comparison of tournament formats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Format</th>
                  <th className="text-left py-2">Teams</th>
                  <th className="text-left py-2">Matches per Team</th>
                  <th className="text-left py-2">Duration</th>
                  <th className="text-left py-2">Complexity</th>
                </tr>
              </thead>
              <tbody>
                {tournamentFormats.map((format) => (
                  <tr key={format.id} className="border-b">
                    <td className="py-2 font-medium">{format.name}</td>
                    <td className="py-2">{format.teamCount}</td>
                    <td className="py-2">
                      {format.id === 'league' && 'All teams'}
                      {format.id === 'knockout' && '1-6 matches'}
                      {format.id === 'group' && '2-5 matches'}
                    </td>
                    <td className="py-2">{format.duration}</td>
                    <td className="py-2">
                      {format.id === 'league' && 'Simple'}
                      {format.id === 'knockout' && 'Simple'}
                      {format.id === 'group' && 'Medium'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
