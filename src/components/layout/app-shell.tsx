'use client'

import * as React from 'react'
import { Header } from './header'
import { Sidebar } from './sidebar'
import { MobileNav, BottomNav, MatchControlFAB } from './mobile-nav'
import { useBreakpoint, useResponsiveSidebar } from '@/lib/hooks/use-breakpoint'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  className?: string
  showBottomNav?: boolean
  showFAB?: boolean
}

export function AppShell({ 
  children, 
  className, 
  showBottomNav = true, 
  showFAB = true 
}: AppShellProps) {
  const { isMobile, isTablet } = useBreakpoint()
  const { isOpen, setIsOpen, shouldOverlay } = useResponsiveSidebar()

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Header */}
      <Header onMenuClick={() => setIsOpen(true)} />
      
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Desktop Sidebar */}
        {!shouldOverlay && (
          <div className="hidden lg:block">
            <Sidebar />
          </div>
        )}

        {/* Mobile Navigation */}
        <MobileNav isOpen={isOpen} onOpenChange={setIsOpen} />

        {/* Main Content */}
        <main className={cn(
          "flex-1 overflow-y-auto",
          showBottomNav && isMobile && "pb-16" // Add padding for bottom nav
        )}>
          <div className={cn(
            "container mx-auto",
            isMobile ? "p-4" : "p-6"
          )}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {showBottomNav && <BottomNav />}

      {/* Floating Action Button for match control */}
      {showFAB && <MatchControlFAB />}
    </div>
  )
}

// Specialized layouts for different contexts

interface MatchControlShellProps {
  children: React.ReactNode
  matchInfo?: {
    homeTeam: string
    awayTeam: string
    score: string
    time: string
    status: 'live' | 'paused' | 'scheduled'
  }
}

export function MatchControlShell({ children, matchInfo }: MatchControlShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Match-specific header with minimal chrome */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium">
              {matchInfo ? (
                <span>{matchInfo.homeTeam} vs {matchInfo.awayTeam}</span>
              ) : (
                <span>Match Control</span>
              )}
            </div>
            {matchInfo && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{matchInfo.time}</span>
                <span className="font-mono">{matchInfo.score}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {matchInfo?.status === 'live' && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-medium text-red-600 dark:text-red-400">LIVE</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="h-[calc(100vh-3.5rem)] overflow-hidden">
        {children}
      </main>
    </div>
  )
}

interface StatsViewShellProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function StatsViewShell({ children, title = "Statistics", subtitle }: StatsViewShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">{title}</h1>
              {subtitle && (
                <p className="text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

// Layout context for sharing state between layout components
interface LayoutContextType {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  currentMatch?: {
    id: string
    homeTeam: string
    awayTeam: string
    score: string
    time: string
    status: 'live' | 'paused' | 'scheduled' | 'completed'
  }
  setCurrentMatch: (match: LayoutContextType['currentMatch']) => void
}

const LayoutContext = React.createContext<LayoutContextType | undefined>(undefined)

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [currentMatch, setCurrentMatch] = React.useState<LayoutContextType['currentMatch']>()

  const value = React.useMemo(() => ({
    sidebarOpen,
    setSidebarOpen,
    currentMatch,
    setCurrentMatch,
  }), [sidebarOpen, currentMatch])

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayout() {
  const context = React.useContext(LayoutContext)
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}

// Enhanced AppShell with layout context
export function EnhancedAppShell({ children, className }: AppShellProps) {
  return (
    <LayoutProvider>
      <AppShell className={className}>
        {children}
      </AppShell>
    </LayoutProvider>
  )
}
