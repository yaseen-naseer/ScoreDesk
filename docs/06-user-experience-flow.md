# ScoreDesk - User Experience Flow

## UX Design Principles

ScoreDesk prioritizes **real-time collaboration**, **intuitive navigation**, and **accessibility** to ensure seamless operation during high-pressure match situations. The interface adapts to different user roles and provides contextual information when needed.

## User Journey Maps

### 1. Tournament Administrator Journey

#### Initial Setup Flow
```
1. Organization Registration
   └─ Create account with Supabase Auth
   └─ Set up organization profile
   └─ Configure organization settings
   └─ Invite team managers and referees

2. Tournament Creation
   └─ Choose tournament format (League/Group/Knockout/Standalone)
   └─ Set basic tournament information
   └─ Configure rules and settings
   └─ Set registration deadline and fees

3. Team Registration Management
   └─ Review team applications
   └─ Approve/reject team registrations
   └─ Assign teams to groups (if applicable)
   └─ Generate tournament schedule

4. Match Management
   └─ Assign referees to matches
   └─ Update match venues and times
   └─ Monitor match progress
   └─ Review and approve match results
```

#### Daily Operations Flow
```
Dashboard → Tournaments → Active Tournament → Matches Today
                                           └─ Live Matches Monitor
                                           └─ Pending Results Review
                                           └─ Referee Assignments
```

### 2. Referee Journey

#### Pre-Match Flow
```
1. Match Assignment Notification
   └─ Receive email/app notification
   └─ Review match details and teams
   └─ Confirm availability
   └─ Access match control interface

2. Pre-Match Setup
   └─ Verify team lineups
   └─ Check player eligibility
   └─ Set up match clock
   └─ Test real-time connectivity
```

#### Match Control Flow
```
Match Start → Time Control → Event Recording → Half-Time Management → Second Half → Match End
     ↓            ↓              ↓                    ↓                  ↓            ↓
  Clock Start   Goal Scored   Yellow Card         Stop Clock         Resume      Final Score
  Period Track  Substitution  Injury Time         Team Talk          Clock       Match Report
  Live Status   Corner Kick   Stoppage Time       Formation          Events      Statistics
```

#### Post-Match Flow
```
Match End → Review Statistics → Submit Final Report → Share Results
            ↓                    ↓                    ↓
         Verify Events      Add Match Notes      Broadcast Summary
         Check Scores       Upload Photos       Update Standings
         Validate Cards     Technical Report    Social Media Share
```

### 3. Statistics Operator Journey

#### Real-Time Data Entry Flow
```
Match Start → Live Statistics Tracking → Data Validation → Export Reports
              ↓                         ↓                  ↓
           Ball Possession           Cross-check with    Match Summary
           Shots On/Off Target       Referee Events      Performance Data
           Pass Accuracy             Real-time Sync      Broadcasting Feed
           Player Performance        Error Correction    Historical Archive
```

#### Multi-User Coordination
```
Stats Operator Interface:
┌─────────────────────────────────────────────────────┐
│ Live Match: Team A vs Team B                        │
├─────────────────┬─────────────────┬─────────────────┤
│ Referee Panel   │ Statistics Panel│ Observers Panel │
│ (Clock Control) │ (Data Entry)    │ (View Only)     │
│                 │                 │                 │
│ ✓ Online        │ ✓ Online        │ ✓ Online        │
│ ✓ Connected     │ ✓ Connected     │ ✓ Connected     │
└─────────────────┴─────────────────┴─────────────────┘
```

### 4. Team Manager Journey

#### Team Setup Flow
```
1. Team Registration
   └─ Complete team profile
   └─ Upload team logo and colors
   └─ Add player roster
   └─ Submit tournament applications

2. Player Management
   └─ Add new players
   └─ Update player information
   └─ Manage player eligibility
   └─ Set player positions and numbers

3. Match Preparation
   └─ Receive match schedule
   └─ Set starting lineup
   └─ Plan substitutions
   └─ Submit team sheet
```

#### Match Day Experience
```
Pre-Match → Live Match Monitoring → Post-Match Analysis
    ↓              ↓                        ↓
Submit Lineup   Watch Live Stats      Review Performance
Check Players   Track Possession      Download Reports
Final Changes   Monitor Cards         Player Statistics
Team Talk       Score Updates         Match Highlights
```

### 5. Broadcaster/Media Journey

#### Live Coverage Flow
```
Match Selection → Live Data Access → Content Creation → Distribution
        ↓               ↓                ↓               ↓
    Browse Matches   Real-time Feed   Generate Graphics  Social Media
    Filter by League Live Statistics  Create Commentary  Website Integration
    Set Alerts       Score Updates    Export Highlights  Mobile Apps
    Subscribe        Player Stats     Match Summary      API Access
```

## Screen Flows and Wireframes

### 1. Authentication Flow

```
Landing Page → Sign In → Organization Selection → Dashboard
     ↓           ↓            ↓                    ↓
  Learn More   Sign Up    Create Org           Role-based
  Features     Email      Join Existing        Interface
  Pricing      Password   Invite Code          Navigation
  Contact      Social     Setup Wizard        Quick Actions
```

#### Authentication Screens
```
┌─────────────────────────────────────────────────────┐
│                    ScoreDesk                        │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │              Welcome Back               │   │
│  │                                             │   │
│  │  Email:    [_________________]             │   │
│  │  Password: [_________________]             │   │
│  │                                             │   │
│  │  [ ] Remember me    Forgot Password?       │   │
│  │                                             │   │
│  │          [Sign In] [Sign Up]              │   │
│  │                                             │   │
│  │         ─────── or ───────                 │   │
│  │                                             │   │
│  │     [Continue with Google] [GitHub]        │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│              Dark Mode Toggle: ●○                  │
└─────────────────────────────────────────────────────┘
```

### 2. Dashboard Layout

#### Multi-Role Dashboard Structure
```
┌─────────────────────────────────────────────────────┐
│ Header: Logo | Org Selector | User Menu | Theme     │
├─────────┬───────────────────────────────────────────┤
│ Sidebar │                Main Content               │
│         │                                           │
│ • Home  │  ┌─────────────────────────────────────┐ │
│ • Matches  │  │          Quick Stats            │ │
│ • Teams │  │  Live: 2  Today: 5  This Week: 12  │ │
│ • Players  │  └─────────────────────────────────────┘ │
│ • Tourns│  │                                           │
│ • Stats │  │  ┌─────────────┐ ┌─────────────────┐ │
│ • Reports  │  │ Live Matches │ │ Recent Activity │ │
│ • Settings │  │             │ │                 │ │
│         │  │ Team A vs B │ │ Goal - J.Doe    │ │
│ ○ Online│  │ Team C vs D │ │ Card - M.Smith  │ │
└─────────┤  │             │ │ Sub - K.Johnson │ │
          │  └─────────────┘ └─────────────────┘ │
          └───────────────────────────────────────────┘
```

### 3. Match Control Interface

#### Real-Time Match Control
```
┌─────────────────────────────────────────────────────┐
│                Match Control Center                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│     Team A        [25:30]        Team B           │
│       2      1st Half • Live        1             │
│                                                     │
│ ┌─────────────┐                   ┌─────────────┐ │
│ │Clock Control│                   │Event Logger │ │
│ │             │                   │             │ │
│ │ [Start/Stop]│                   │Type: [Goal▼]│ │
│ │ [Add Time]  │                   │Player:[___] │ │
│ │ [Half Time] │                   │Time:  [25]  │ │
│ │ [End Match] │                   │[Log Event]  │ │
│ └─────────────┘                   └─────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │                Event Timeline                   │ │
│ │ 25' ⚽ GOAL - J.Doe (Team A)                   │ │
│ │ 22' 🟨 YELLOW - M.Smith (Team B)               │ │
│ │ 18' ↔️ SUB - K.Johnson → L.Brown (Team A)      │ │
│ │ 15' ⚽ GOAL - P.Wilson (Team B)                 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 4. Statistics Dashboard

#### Live Statistics Interface
```
┌─────────────────────────────────────────────────────┐
│ Live Statistics: Team A vs Team B                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Ball Possession                                     │
│ Team A ████████████████░░░░ 65%                    │
│ Team B ░░░░████████████░░░░ 35%                    │
│                                                     │
│ ┌──────────────┬──────────────┬──────────────────┐ │
│ │   Shots      │    Fouls     │     Corners      │ │
│ │   12  |  8   │   6   |  4   │    5   |   2    │ │
│ │ Team A│Team B│ Team A│Team B│ Team A │ Team B  │ │
│ └──────────────┴──────────────┴──────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │            Real-time Updates                    │ │
│ │ [Auto Sync: ON]  Last Update: 25:45           │ │
│ │                                                 │ │
│ │ Quick Actions:                                  │ │
│ │ [+Shot] [+Foul] [+Corner] [+Card] [+Save]     │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 5. Tournament Management

#### Tournament Overview
```
┌─────────────────────────────────────────────────────┐
│ Summer League 2024                                  │
├─────────────────────────────────────────────────────┤
│ Status: Active | Teams: 16 | Matches: 120          │
│                                                     │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │
│ │  Standings  │ │  Fixtures   │ │    Statistics   │ │
│ │             │ │             │ │                 │ │
│ │ 1. Team A   │ │ Today (3)   │ │ Goals: 156      │ │
│ │ 2. Team B   │ │ Tomorrow(2) │ │ Cards: 45       │ │
│ │ 3. Team C   │ │ This Week   │ │ Avg Goals: 2.6  │ │
│ │ 4. Team D   │ │    (8)      │ │ Top Scorer:     │ │
│ │ ...         │ │             │ │ J.Doe (12)      │ │
│ └─────────────┘ └─────────────┘ └─────────────────┘ │
│                                                     │
│ Quick Actions:                                      │
│ [New Match] [Add Team] [Generate Schedule] [Export] │
└─────────────────────────────────────────────────────┘
```

## Responsive Design Breakpoints

### 1. Mobile First Approach (320px+)
```css
/* Mobile Portrait */
@media (min-width: 320px) {
  .scoreboard {
    flex-direction: column;
    padding: 1rem;
  }
  
  .navigation {
    display: none; /* Hidden sidebar */
  }
  
  .mobile-nav {
    display: block; /* Bottom navigation */
  }
}
```

### 2. Tablet Design (768px+)
```css
/* Tablet Landscape */
@media (min-width: 768px) {
  .scoreboard {
    flex-direction: row;
    padding: 1.5rem;
  }
  
  .sidebar {
    display: block;
    width: 240px;
  }
  
  .main-content {
    margin-left: 240px;
  }
}
```

### 3. Desktop Design (1024px+)
```css
/* Desktop */
@media (min-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
  
  .match-control {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

### 4. Large Screen (1440px+)
```css
/* Large Desktop */
@media (min-width: 1440px) {
  .dashboard-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .tournament-view {
    grid-template-columns: 300px 1fr 300px;
  }
}
```

## Accessibility Standards

### 1. WCAG 2.1 Compliance

#### Keyboard Navigation
```typescript
// Keyboard navigation patterns
const KeyboardShortcuts = {
  'Ctrl+N': 'New Match',
  'Ctrl+S': 'Save Changes',
  'Space': 'Start/Stop Timer',
  'Escape': 'Close Modal',
  'Tab': 'Navigate Forward',
  'Shift+Tab': 'Navigate Backward',
  'Enter': 'Activate Button',
  'F1': 'Help'
}
```

#### Screen Reader Support
```jsx
// ARIA labels and descriptions
<button
  aria-label="Start match timer"
  aria-describedby="timer-help"
  onClick={startTimer}
>
  Start
</button>

<div id="timer-help" className="sr-only">
  Starts the official match timer. Current time: {matchTime}
</div>

// Live regions for real-time updates
<div aria-live="polite" aria-atomic="true">
  {lastEvent && `Latest event: ${lastEvent.description}`}
</div>
```

#### Color and Contrast
```css
/* High contrast theme support */
:root {
  --primary: #2563eb;
  --primary-contrast: #ffffff;
  --error: #dc2626;
  --success: #16a34a;
  --warning: #ca8a04;
}

@media (prefers-contrast: high) {
  :root {
    --primary: #000000;
    --primary-contrast: #ffffff;
    --background: #ffffff;
    --foreground: #000000;
  }
}

/* Focus indicators */
.focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

### 2. Motion and Animation Preferences
```css
/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Safe animations for essential feedback */
.score-update {
  animation: scoreFlash 0.3s ease-in-out;
}

@keyframes scoreFlash {
  0%, 100% { background-color: transparent; }
  50% { background-color: var(--success-bg); }
}
```

## Error Handling and User Feedback

### 1. Error State Patterns

#### Connection Error
```jsx
<div className="error-state">
  <AlertCircle className="h-8 w-8 text-destructive" />
  <h3>Connection Lost</h3>
  <p>Unable to connect to the server. Please check your internet connection.</p>
  <Button onClick={retry}>Retry Connection</Button>
</div>
```

#### Validation Error
```jsx
<FormField>
  <FormLabel>Team Name</FormLabel>
  <FormControl>
    <Input 
      {...field} 
      aria-invalid={!!error}
      aria-describedby="team-name-error"
    />
  </FormControl>
  {error && (
    <FormMessage id="team-name-error">
      {error.message}
    </FormMessage>
  )}
</FormField>
```

#### Loading States
```jsx
// Skeleton loading for data tables
<TableRow>
  {columns.map((_, index) => (
    <TableCell key={index}>
      <Skeleton className="h-4 w-full" />
    </TableCell>
  ))}
</TableRow>

// Button loading state
<Button disabled={isLoading}>
  {isLoading && <Spinner className="mr-2 h-4 w-4" />}
  {isLoading ? 'Saving...' : 'Save Changes'}
</Button>
```

### 2. Success Feedback

#### Toast Notifications
```jsx
// Success notification
toast({
  title: "Match Created",
  description: "The match has been successfully scheduled.",
  variant: "success",
  duration: 3000
})

// Action notification with undo
toast({
  title: "Player Removed",
  description: "John Doe has been removed from the team.",
  action: (
    <Button variant="outline" onClick={undoRemove}>
      Undo
    </Button>
  )
})
```

#### Progress Indicators
```jsx
// Multi-step form progress
<Progress value={currentStep / totalSteps * 100} className="mb-4" />

// File upload progress
<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span>Uploading team logo...</span>
    <span>{uploadProgress}%</span>
  </div>
  <Progress value={uploadProgress} />
</div>
```

## Performance Considerations

### 1. Optimization Strategies

#### Virtual Scrolling for Large Lists
```jsx
// Player list with virtual scrolling
import { FixedSizeList as List } from 'react-window'

function PlayersList({ players }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <PlayerCard player={players[index]} />
    </div>
  )

  return (
    <List
      height={400}
      itemCount={players.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </List>
  )
}
```

#### Debounced Search
```jsx
// Search input with debouncing
function SearchInput({ onSearch }) {
  const [value, setValue] = useState('')
  const debouncedValue = useDebounce(value, 300)

  useEffect(() => {
    onSearch(debouncedValue)
  }, [debouncedValue, onSearch])

  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Search players..."
    />
  )
}
```

#### Memoization for Expensive Components
```jsx
// Memoized tournament standings
const TournamentStandings = memo(({ standings }) => {
  const sortedStandings = useMemo(() => 
    standings.sort((a, b) => b.points - a.points),
    [standings]
  )

  return (
    <Table>
      {sortedStandings.map(standing => (
        <StandingRow key={standing.id} standing={standing} />
      ))}
    </Table>
  )
})
```

### 2. Real-time Performance

#### Connection State Management
```jsx
function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, isConnected }
}
```

#### Optimistic Updates
```jsx
function useOptimisticMatch() {
  const [match, setMatch] = useState(null)

  const updateScore = async (newScore) => {
    // Optimistic update
    setMatch(prev => ({ ...prev, score: newScore }))

    try {
      await api.updateMatch(match.id, { score: newScore })
    } catch (error) {
      // Revert on error
      setMatch(prev => ({ ...prev, score: prev.score }))
      toast.error('Failed to update score')
    }
  }

  return { match, updateScore }
}
```

## Internationalization (i18n)

### 1. Multi-language Support Structure
```
locales/
├── en/
│   ├── common.json
│   ├── match.json
│   ├── tournament.json
│   └── validation.json
├── es/
├── fr/
└── pt/
```

### 2. Translation Implementation
```jsx
// Using next-intl for translations
import { useTranslations } from 'next-intl'

function MatchControls() {
  const t = useTranslations('match')

  return (
    <div>
      <Button>{t('start_match')}</Button>
      <Button>{t('pause_match')}</Button>
      <Button>{t('end_match')}</Button>
    </div>
  )
}

// Date and time localization
function MatchSchedule({ match }) {
  const locale = useLocale()
  
  const formatDateTime = (date) => {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(date))
  }

  return (
    <span>{formatDateTime(match.scheduled_at)}</span>
  )
}
```
