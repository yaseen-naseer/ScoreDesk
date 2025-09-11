# ScoreDesk - Component Architecture

## Component Design Philosophy

ScoreDesk follows atomic design principles with a component-first approach, emphasizing reusability, type safety, and accessibility. All components are built with shadcn/ui as the foundation and extend with custom business logic.

## Component Structure

### 1. Directory Organization
```
components/
├── ui/                    # shadcn/ui base components
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── table.tsx
│   └── ...
├── layout/               # Layout and navigation components
│   ├── header.tsx
│   ├── sidebar.tsx
│   ├── navigation.tsx
│   ├── breadcrumbs.tsx
│   └── footer.tsx
├── forms/                # Form components with validation
│   ├── team-form.tsx
│   ├── player-form.tsx
│   ├── match-form.tsx
│   ├── tournament-form.tsx
│   └── form-fields/
├── match/                # Match-specific components
│   ├── scoreboard/
│   ├── lineup/
│   ├── events/
│   ├── statistics/
│   └── controls/
├── tournament/           # Tournament management components
│   ├── bracket/
│   ├── standings/
│   ├── schedule/
│   └── registration/
├── team/                 # Team and player components
│   ├── roster/
│   ├── profile/
│   └── statistics/
├── charts/               # Data visualization components
│   ├── possession-chart.tsx
│   ├── performance-chart.tsx
│   └── standings-chart.tsx
├── shared/               # Shared utility components
│   ├── data-table/
│   ├── loading/
│   ├── error/
│   ├── confirmation/
│   └── notifications/
└── providers/            # Context providers
    ├── theme-provider.tsx
    ├── auth-provider.tsx
    ├── realtime-provider.tsx
    └── organization-provider.tsx
```

## Core Component Patterns

### 1. Component Base Template
```typescript
// components/shared/base-component.tsx
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface BaseComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  error?: string | null
}

const BaseComponent = forwardRef<HTMLDivElement, BaseComponentProps>(
  ({ className, variant = 'default', size = 'md', loading, error, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative',
          // Variant styles
          {
            'bg-primary text-primary-foreground': variant === 'default',
            'bg-secondary text-secondary-foreground': variant === 'secondary',
            'bg-destructive text-destructive-foreground': variant === 'destructive',
          },
          // Size styles
          {
            'p-2 text-sm': size === 'sm',
            'p-4 text-base': size === 'md',
            'p-6 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} />}
        {children}
      </div>
    )
  }
)

BaseComponent.displayName = 'BaseComponent'
export { BaseComponent }
```

### 2. Data Component Pattern
```typescript
// components/shared/data-component.tsx
import { useQuery } from '@/hooks/use-query'
import { LoadingState } from '@/components/shared/loading-state'
import { ErrorState } from '@/components/shared/error-state'
import { EmptyState } from '@/components/shared/empty-state'

interface DataComponentProps<T> {
  queryKey: string[]
  queryFn: () => Promise<T>
  children: (data: T) => React.ReactNode
  loadingComponent?: React.ReactNode
  errorComponent?: (error: Error) => React.ReactNode
  emptyComponent?: React.ReactNode
  emptyCheck?: (data: T) => boolean
}

export function DataComponent<T>({
  queryKey,
  queryFn,
  children,
  loadingComponent,
  errorComponent,
  emptyComponent,
  emptyCheck
}: DataComponentProps<T>) {
  const { data, isLoading, error } = useQuery(queryKey, queryFn)

  if (isLoading) {
    return loadingComponent || <LoadingState />
  }

  if (error) {
    return errorComponent?.(error) || <ErrorState error={error} />
  }

  if (data && emptyCheck?.(data)) {
    return emptyComponent || <EmptyState />
  }

  return data ? children(data) : null
}
```

## Layout Components

### 1. Application Shell
```typescript
// components/layout/app-shell.tsx
import { Header } from './header'
import { Sidebar } from './sidebar'
import { Breadcrumbs } from './breadcrumbs'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  showSidebar?: boolean
  sidebarCollapsed?: boolean
  onSidebarToggle?: () => void
}

export function AppShell({
  children,
  showSidebar = true,
  sidebarCollapsed = false,
  onSidebarToggle
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header onSidebarToggle={onSidebarToggle} />
      
      <div className="flex">
        {showSidebar && (
          <Sidebar 
            collapsed={sidebarCollapsed}
            onToggle={onSidebarToggle}
          />
        )}
        
        <main className={cn(
          'flex-1 p-6',
          showSidebar && !sidebarCollapsed && 'ml-64',
          showSidebar && sidebarCollapsed && 'ml-16'
        )}>
          <Breadcrumbs />
          <div className="mt-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
```

### 2. Match Layout
```typescript
// components/layout/match-layout.tsx
import { MatchHeader } from '@/components/match/match-header'
import { MatchTabs } from '@/components/match/match-tabs'
import { MatchProvider } from '@/components/providers/match-provider'

interface MatchLayoutProps {
  matchId: string
  children: React.ReactNode
  activeTab?: string
}

export function MatchLayout({ matchId, children, activeTab }: MatchLayoutProps) {
  return (
    <MatchProvider matchId={matchId}>
      <div className="space-y-6">
        <MatchHeader />
        <MatchTabs activeTab={activeTab} />
        <div className="min-h-[calc(100vh-200px)]">
          {children}
        </div>
      </div>
    </MatchProvider>
  )
}
```

## Form Components

### 1. Form Base Component
```typescript
// components/forms/form-base.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

interface FormBaseProps<T extends z.ZodSchema> {
  schema: T
  defaultValues?: z.infer<T>
  onSubmit: (data: z.infer<T>) => Promise<void> | void
  children: (form: any) => React.ReactNode
  submitText?: string
  loading?: boolean
  className?: string
}

export function FormBase<T extends z.ZodSchema>({
  schema,
  defaultValues,
  onSubmit,
  children,
  submitText = 'Submit',
  loading = false,
  className
}: FormBaseProps<T>) {
  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues
  })

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)}
        className={className}
        noValidate
      >
        {children(form)}
        
        <div className="flex justify-end space-x-2 pt-6">
          <Button
            type="submit"
            disabled={loading}
            className="min-w-[100px]"
          >
            {loading && <LoadingSpinner className="mr-2 h-4 w-4" />}
            {submitText}
          </Button>
        </div>
      </form>
    </Form>
  )
}
```

### 2. Team Form Component
```typescript
// components/forms/team-form.tsx
import { z } from 'zod'
import { FormBase } from './form-base'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ColorPicker } from '@/components/ui/color-picker'

const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(255),
  short_name: z.string().max(10).optional(),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  home_venue: z.string().max(255).optional(),
  manager_name: z.string().max(255).optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().max(50).optional()
})

interface TeamFormProps {
  defaultValues?: Partial<z.infer<typeof teamSchema>>
  onSubmit: (data: z.infer<typeof teamSchema>) => Promise<void>
  loading?: boolean
}

export function TeamForm({ defaultValues, onSubmit, loading }: TeamFormProps) {
  return (
    <FormBase
      schema={teamSchema}
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      loading={loading}
      submitText="Save Team"
      className="space-y-6"
    >
      {(form) => (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter team name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="short_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., FCB" maxLength={10} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="primary_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Color</FormLabel>
                  <FormControl>
                    <ColorPicker {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secondary_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secondary Color</FormLabel>
                  <FormControl>
                    <ColorPicker {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Additional fields... */}
        </>
      )}
    </FormBase>
  )
}
```

## Match Components

### 1. Scoreboard Component
```typescript
// components/match/scoreboard/scoreboard.tsx
import { useMatch } from '@/hooks/use-match'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent } from '@/components/ui/card'
import { TeamScore } from './team-score'
import { MatchClock } from './match-clock'
import { MatchStatus } from './match-status'

interface ScoreboardProps {
  matchId: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showControls?: boolean
  className?: string
}

export function Scoreboard({ 
  matchId, 
  size = 'md', 
  showControls = false,
  className 
}: ScoreboardProps) {
  const { match } = useMatch(matchId)
  
  // Real-time updates
  useRealtime({
    channel: `match:${matchId}`,
    table: 'matches',
    filter: `id=eq.${matchId}`
  })

  if (!match) return null

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-6">
        <div className="grid grid-cols-3 gap-4 items-center">
          {/* Home Team */}
          <TeamScore
            team={match.home_team}
            score={match.home_score}
            size={size}
            side="home"
          />

          {/* Match Info */}
          <div className="text-center space-y-2">
            <MatchClock 
              matchId={matchId}
              status={match.status}
              size={size}
            />
            <MatchStatus 
              status={match.status}
              size={size}
            />
          </div>

          {/* Away Team */}
          <TeamScore
            team={match.away_team}
            score={match.away_score}
            size={size}
            side="away"
          />
        </div>

        {showControls && (
          <div className="mt-4 pt-4 border-t">
            <MatchControls matchId={matchId} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### 2. Event Logger Component
```typescript
// components/match/events/event-logger.tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useMatchEvents } from '@/hooks/use-match-events'
import { EventType } from '@/types/match'

interface EventLoggerProps {
  matchId: string
  teamId: string
  onEventLogged?: () => void
}

export function EventLogger({ matchId, teamId, onEventLogged }: EventLoggerProps) {
  const [eventType, setEventType] = useState<EventType>('goal')
  const [playerId, setPlayerId] = useState<string>('')
  const [eventTime, setEventTime] = useState<number>(0)
  const [description, setDescription] = useState('')

  const { logEvent, isLoading } = useMatchEvents(matchId)

  const handleSubmit = async () => {
    try {
      await logEvent({
        team_id: teamId,
        player_id: playerId,
        event_type: eventType,
        event_time: eventTime,
        description
      })
      
      // Reset form
      setDescription('')
      onEventLogged?.()
    } catch (error) {
      console.error('Failed to log event:', error)
    }
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-semibold">Log Event</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <Select
          value={eventType}
          onValueChange={(value) => setEventType(value as EventType)}
        >
          <option value="goal">Goal</option>
          <option value="yellow_card">Yellow Card</option>
          <option value="red_card">Red Card</option>
          <option value="substitution">Substitution</option>
          <option value="corner">Corner</option>
          <option value="foul">Foul</option>
        </Select>

        <Input
          type="number"
          placeholder="Minute"
          value={eventTime}
          onChange={(e) => setEventTime(Number(e.target.value))}
        />
      </div>

      <Input
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <Button 
        onClick={handleSubmit}
        disabled={isLoading || !playerId}
        className="w-full"
      >
        Log Event
      </Button>
    </div>
  )
}
```

## Tournament Components

### 1. Tournament Bracket Component
```typescript
// components/tournament/bracket/tournament-bracket.tsx
import { useTournament } from '@/hooks/use-tournament'
import { BracketRound } from './bracket-round'
import { BracketMatch } from './bracket-match'

interface TournamentBracketProps {
  tournamentId: string
  editable?: boolean
}

export function TournamentBracket({ tournamentId, editable = false }: TournamentBracketProps) {
  const { tournament, matches, isLoading } = useTournament(tournamentId)

  if (isLoading) return <BracketSkeleton />
  if (!tournament || tournament.tournament_type !== 'knockout') {
    return <div>Invalid tournament type for bracket view</div>
  }

  const rounds = organizeBracketRounds(matches)

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex space-x-8 min-w-max">
        {rounds.map((round, index) => (
          <BracketRound
            key={index}
            round={round}
            roundNumber={index + 1}
            editable={editable}
          />
        ))}
      </div>
    </div>
  )
}

// Helper function to organize matches into rounds
function organizeBracketRounds(matches: Match[]) {
  // Implementation to organize matches by round
  return matches.reduce((rounds, match) => {
    const roundIndex = match.round_number - 1
    if (!rounds[roundIndex]) rounds[roundIndex] = []
    rounds[roundIndex].push(match)
    return rounds
  }, [] as Match[][])
}
```

### 2. Standings Table Component
```typescript
// components/tournament/standings/standings-table.tsx
import { useStandings } from '@/hooks/use-standings'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

interface StandingsTableProps {
  tournamentId: string
  groupId?: string
  showGroupName?: boolean
}

export function StandingsTable({ tournamentId, groupId, showGroupName = false }: StandingsTableProps) {
  const { standings, isLoading } = useStandings(tournamentId, groupId)

  if (isLoading) return <StandingsTableSkeleton />

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Team</TableHead>
          {showGroupName && <TableHead>Group</TableHead>}
          <TableHead className="text-center w-16">MP</TableHead>
          <TableHead className="text-center w-16">W</TableHead>
          <TableHead className="text-center w-16">D</TableHead>
          <TableHead className="text-center w-16">L</TableHead>
          <TableHead className="text-center w-20">GF</TableHead>
          <TableHead className="text-center w-20">GA</TableHead>
          <TableHead className="text-center w-20">GD</TableHead>
          <TableHead className="text-center w-16">Pts</TableHead>
          <TableHead className="text-center w-24">Form</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {standings.map((standing, index) => (
          <TableRow key={standing.id}>
            <TableCell className="font-medium">{index + 1}</TableCell>
            <TableCell>
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={standing.team.logo_url} />
                  <AvatarFallback>{standing.team.short_name}</AvatarFallback>
                </Avatar>
                <span>{standing.team.name}</span>
              </div>
            </TableCell>
            {showGroupName && (
              <TableCell>{standing.group?.name}</TableCell>
            )}
            <TableCell className="text-center">{standing.matches_played}</TableCell>
            <TableCell className="text-center">{standing.wins}</TableCell>
            <TableCell className="text-center">{standing.draws}</TableCell>
            <TableCell className="text-center">{standing.losses}</TableCell>
            <TableCell className="text-center">{standing.goals_for}</TableCell>
            <TableCell className="text-center">{standing.goals_against}</TableCell>
            <TableCell className="text-center">
              <span className={cn(
                standing.goal_difference > 0 && 'text-green-600',
                standing.goal_difference < 0 && 'text-red-600'
              )}>
                {standing.goal_difference > 0 ? '+' : ''}{standing.goal_difference}
              </span>
            </TableCell>
            <TableCell className="text-center font-semibold">{standing.points}</TableCell>
            <TableCell>
              <FormIndicator form={standing.form} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

## Shared Components

### 1. Data Table Component
```typescript
// components/shared/data-table/data-table.tsx
import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTablePagination } from './data-table-pagination'
import { DataTableFilters } from './data-table-filters'

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  searchKey?: keyof T
  filters?: FilterDef<T>[]
  pagination?: boolean
  selection?: boolean
  onRowClick?: (row: T) => void
}

export function DataTable<T>({
  data,
  columns,
  searchKey,
  filters,
  pagination = true,
  selection = false,
  onRowClick
}: DataTableProps<T>) {
  const [searchValue, setSearchValue] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  // Filter and search logic
  const filteredData = data.filter(item => {
    if (searchKey && searchValue) {
      const value = String(item[searchKey]).toLowerCase()
      return value.includes(searchValue.toLowerCase())
    }
    return true
  })

  // Pagination logic
  const startIndex = (currentPage - 1) * pageSize
  const paginatedData = pagination 
    ? filteredData.slice(startIndex, startIndex + pageSize)
    : filteredData

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        {searchKey && (
          <Input
            placeholder={`Search by ${String(searchKey)}...`}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="max-w-sm"
          />
        )}
        
        {filters && <DataTableFilters filters={filters} />}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {selection && (
                <TableHead className="w-12">
                  <Checkbox />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead key={column.id} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row, index) => (
              <TableRow 
                key={index}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                onClick={() => onRowClick?.(row)}
              >
                {selection && (
                  <TableCell>
                    <Checkbox />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.id} className={column.className}>
                    {column.cell ? column.cell(row) : String(row[column.accessorKey])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <DataTablePagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredData.length / pageSize)}
          pageSize={pageSize}
          totalItems={filteredData.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  )
}
```

## Provider Components

### 1. Theme Provider
```typescript
// components/providers/theme-provider.tsx
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeProviderState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'scoredesk-theme'
}: {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    }
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
```

### 2. Real-time Provider
```typescript
// components/providers/realtime-provider.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeProviderState {
  subscribe: (config: SubscriptionConfig) => () => void
  isConnected: boolean
}

interface SubscriptionConfig {
  channel: string
  table: string
  filter?: string
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
}

const RealtimeProviderContext = createContext<RealtimeProviderState | undefined>(undefined)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [channels, setChannels] = useState<Map<string, RealtimeChannel>>(new Map())
  const supabase = useSupabase()

  const subscribe = (config: SubscriptionConfig) => {
    const { channel: channelName, table, filter, onInsert, onUpdate, onDelete } = config

    // Remove existing channel if it exists
    const existingChannel = channels.get(channelName)
    if (existingChannel) {
      supabase.removeChannel(existingChannel)
    }

    // Create new channel
    const channel = supabase.channel(channelName)

    // Add postgres changes listener
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table,
      filter
    }, (payload) => {
      switch (payload.eventType) {
        case 'INSERT':
          onInsert?.(payload)
          break
        case 'UPDATE':
          onUpdate?.(payload)
          break
        case 'DELETE':
          onDelete?.(payload)
          break
      }
    })

    // Subscribe to channel
    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED')
    })

    // Store channel reference
    setChannels(prev => new Map(prev).set(channelName, channel))

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel)
      setChannels(prev => {
        const next = new Map(prev)
        next.delete(channelName)
        return next
      })
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel)
      })
    }
  }, [])

  return (
    <RealtimeProviderContext.Provider value={{ subscribe, isConnected }}>
      {children}
    </RealtimeProviderContext.Provider>
  )
}

export const useRealtime = () => {
  const context = useContext(RealtimeProviderContext)
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return context
}
```

## Component Testing Strategy

### 1. Component Test Template
```typescript
// __tests__/components/team-form.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TeamForm } from '@/components/forms/team-form'
import { vi } from 'vitest'

const mockOnSubmit = vi.fn()

describe('TeamForm', () => {
  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('renders all required fields', () => {
    render(<TeamForm onSubmit={mockOnSubmit} />)
    
    expect(screen.getByLabelText('Team Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Primary Color')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Team' })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<TeamForm onSubmit={mockOnSubmit} />)
    
    fireEvent.click(screen.getByRole('button', { name: 'Save Team' }))
    
    await waitFor(() => {
      expect(screen.getByText('Team name is required')).toBeInTheDocument()
    })
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    render(<TeamForm onSubmit={mockOnSubmit} />)
    
    fireEvent.change(screen.getByLabelText('Team Name'), {
      target: { value: 'Test Team' }
    })
    
    fireEvent.click(screen.getByRole('button', { name: 'Save Team' }))
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test Team',
        // ... other expected values
      })
    })
  })
})
```

### 2. Integration Test Example
```typescript
// __tests__/integration/match-scoreboard.test.tsx
import { render, screen } from '@testing-library/react'
import { Scoreboard } from '@/components/match/scoreboard/scoreboard'
import { TestProviders } from '@/test/providers'
import { mockMatch } from '@/test/fixtures'

describe('Scoreboard Integration', () => {
  it('displays match information correctly', () => {
    render(
      <TestProviders>
        <Scoreboard matchId={mockMatch.id} />
      </TestProviders>
    )

    expect(screen.getByText(mockMatch.home_team.name)).toBeInTheDocument()
    expect(screen.getByText(mockMatch.away_team.name)).toBeInTheDocument()
    expect(screen.getByText(mockMatch.home_score.toString())).toBeInTheDocument()
    expect(screen.getByText(mockMatch.away_score.toString())).toBeInTheDocument()
  })

  it('updates in real-time when match data changes', async () => {
    // Test real-time updates
    // Implementation depends on testing strategy for real-time features
  })
})
```
