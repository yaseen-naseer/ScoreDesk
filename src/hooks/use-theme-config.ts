'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeConfig {
  mode: ThemeMode
  isSystemDark: boolean
  isDark: boolean
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

/**
 * Hook for enhanced theme management with ScoreDesk-specific features
 */
export function useThemeConfig(): ThemeConfig {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted before using theme
  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate current dark state
  const isSystemDark = systemTheme === 'dark'
  const isDark = mounted ? (theme === 'dark' || (theme === 'system' && isSystemDark)) : false

  const setMode = (mode: ThemeMode) => {
    setTheme(mode)
  }

  const toggleMode = () => {
    if (!mounted) return
    
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  return {
    mode: (mounted ? theme : 'system') as ThemeMode,
    isSystemDark,
    isDark,
    setMode,
    toggleMode,
  }
}

/**
 * Hook for theme-aware colors that work with ScoreDesk's sports theme
 */
export function useThemeColors() {
  const { isDark } = useThemeConfig()

  return {
    // Match status colors
    live: isDark ? 'hsl(0 84% 70%)' : 'hsl(0 84% 60%)',
    scheduled: isDark ? 'hsl(210 40% 55%)' : 'hsl(210 40% 45%)',
    completed: isDark ? 'hsl(142 76% 45%)' : 'hsl(142 76% 36%)',
    cancelled: isDark ? 'hsl(0 0% 55%)' : 'hsl(0 0% 45%)',
    
    // Team colors (for charts and team representations)
    team: {
      primary: isDark ? 'hsl(142 76% 45%)' : 'hsl(142 76% 36%)',
      secondary: isDark ? 'hsl(221 83% 63%)' : 'hsl(221 83% 53%)',
      accent: isDark ? 'hsl(45 100% 61%)' : 'hsl(45 100% 51%)',
      danger: isDark ? 'hsl(0 84% 70%)' : 'hsl(0 84% 60%)',
      warning: isDark ? 'hsl(45 100% 61%)' : 'hsl(45 100% 51%)',
    },
    
    // Chart colors for statistics
    chart: {
      1: isDark ? 'hsl(142 76% 45%)' : 'hsl(142 76% 36%)',
      2: isDark ? 'hsl(221 83% 63%)' : 'hsl(221 83% 53%)',
      3: isDark ? 'hsl(45 100% 61%)' : 'hsl(45 100% 51%)',
      4: isDark ? 'hsl(0 84% 70%)' : 'hsl(0 84% 60%)',
      5: isDark ? 'hsl(271 81% 66%)' : 'hsl(271 81% 56%)',
    },
    
    // Event type colors
    event: {
      goal: isDark ? 'hsl(142 76% 45%)' : 'hsl(142 76% 36%)',
      yellowCard: isDark ? 'hsl(45 100% 61%)' : 'hsl(45 100% 51%)',
      redCard: isDark ? 'hsl(0 84% 70%)' : 'hsl(0 84% 60%)',
      substitution: isDark ? 'hsl(221 83% 63%)' : 'hsl(221 83% 53%)',
      corner: isDark ? 'hsl(271 81% 66%)' : 'hsl(271 81% 56%)',
    }
  }
}

/**
 * Hook for responsive theme configuration
 */
export function useResponsiveTheme() {
  const [isMobile, setIsMobile] = useState(false)
  const { mode, setMode, isDark } = useThemeConfig()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-adjust theme for mobile devices in direct sunlight
  useEffect(() => {
    if (isMobile && mode === 'system') {
      // Could add ambient light sensor support here in the future
    }
  }, [isMobile, mode])

  return {
    isMobile,
    isDark,
    mode,
    setMode,
    // Recommended theme for match control (high contrast)
    useMatchControlTheme: () => setMode('light'),
    // Recommended theme for statistics viewing
    useStatsViewTheme: () => setMode(isDark ? 'dark' : 'light'),
  }
}

/**
 * Hook for accessibility-aware theme settings
 */
export function useAccessibleTheme() {
  const { isDark, mode, setMode } = useThemeConfig()
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)

  useEffect(() => {
    // Check for reduced motion preference
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(reducedMotionQuery.matches)
    
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }
    
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
    
    // Check for high contrast preference
    const contrastQuery = window.matchMedia('(prefers-contrast: high)')
    setHighContrast(contrastQuery.matches)
    
    const handleContrastChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches)
    }
    
    contrastQuery.addEventListener('change', handleContrastChange)
    
    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange)
      contrastQuery.removeEventListener('change', handleContrastChange)
    }
  }, [])

  return {
    isDark,
    mode,
    setMode,
    prefersReducedMotion,
    highContrast,
    // Accessibility-optimized theme recommendation
    accessibleMode: highContrast ? 'light' : mode,
  }
}
