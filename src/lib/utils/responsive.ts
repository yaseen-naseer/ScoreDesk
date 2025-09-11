import { type ClassValue } from 'clsx'

/**
 * Responsive design utilities for ScoreDesk
 */

export type ResponsiveValue<T> = {
  sm?: T
  md?: T
  lg?: T
  xl?: T
  '2xl'?: T
  default: T
}

/**
 * Generate responsive classes for Tailwind CSS
 */
export function responsive<T extends string>(
  values: ResponsiveValue<T>
): string {
  const classes: string[] = [values.default]
  
  if (values.sm) classes.push(`sm:${values.sm}`)
  if (values.md) classes.push(`md:${values.md}`)
  if (values.lg) classes.push(`lg:${values.lg}`)
  if (values.xl) classes.push(`xl:${values.xl}`)
  if (values['2xl']) classes.push(`2xl:${values['2xl']}`)
  
  return classes.join(' ')
}

/**
 * Responsive grid utilities
 */
export const responsiveGrid = {
  // Cards grid
  cards: responsive({
    default: 'grid-cols-1',
    md: 'grid-cols-2',
    lg: 'grid-cols-3',
    xl: 'grid-cols-4'
  }),
  
  // Team cards
  teams: responsive({
    default: 'grid-cols-1',
    sm: 'grid-cols-2',
    lg: 'grid-cols-3',
    xl: 'grid-cols-4',
    '2xl': 'grid-cols-5'
  }),
  
  // Player cards
  players: responsive({
    default: 'grid-cols-2',
    sm: 'grid-cols-3',
    md: 'grid-cols-4',
    lg: 'grid-cols-5',
    xl: 'grid-cols-6',
    '2xl': 'grid-cols-8'
  }),
  
  // Match cards
  matches: responsive({
    default: 'grid-cols-1',
    md: 'grid-cols-2',
    xl: 'grid-cols-3'
  }),
  
  // Statistics grid
  stats: responsive({
    default: 'grid-cols-1',
    sm: 'grid-cols-2',
    lg: 'grid-cols-3',
    xl: 'grid-cols-4'
  }),
  
  // Dashboard layout
  dashboard: responsive({
    default: 'grid-cols-1',
    lg: 'grid-cols-2',
    xl: 'grid-cols-3'
  })
}

/**
 * Responsive spacing utilities
 */
export const responsiveSpacing = {
  container: responsive({
    default: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }),
  
  section: responsive({
    default: 'space-y-4',
    md: 'space-y-6',
    lg: 'space-y-8'
  }),
  
  gap: responsive({
    default: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8'
  })
}

/**
 * Responsive text utilities
 */
export const responsiveText = {
  title: responsive({
    default: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl'
  }),
  
  subtitle: responsive({
    default: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  }),
  
  body: responsive({
    default: 'text-sm',
    md: 'text-base'
  }),
  
  caption: responsive({
    default: 'text-xs',
    md: 'text-sm'
  })
}

/**
 * Match control specific responsive utilities
 */
export const matchControlResponsive = {
  scoreboard: responsive({
    default: 'text-4xl',
    sm: 'text-5xl',
    md: 'text-6xl',
    lg: 'text-7xl',
    xl: 'text-8xl'
  }),
  
  timer: responsive({
    default: 'text-2xl',
    sm: 'text-3xl',
    md: 'text-4xl',
    lg: 'text-5xl'
  }),
  
  teamName: responsive({
    default: 'text-lg',
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl'
  }),
  
  controls: responsive({
    default: 'grid-cols-2',
    sm: 'grid-cols-3',
    md: 'grid-cols-4',
    lg: 'grid-cols-6'
  })
}

/**
 * Responsive layout patterns for common UI elements
 */
export const layoutPatterns = {
  // Sidebar + Main content
  sidebarLayout: {
    container: 'flex min-h-screen',
    sidebar: responsive({
      default: 'hidden',
      lg: 'block w-64 flex-shrink-0'
    }),
    main: 'flex-1 overflow-hidden'
  },
  
  // Header + Content
  headerLayout: {
    container: 'min-h-screen flex flex-col',
    header: 'flex-shrink-0',
    content: 'flex-1 overflow-auto'
  },
  
  // Card layout
  cardLayout: {
    container: responsive({
      default: 'p-4',
      md: 'p-6'
    }),
    header: responsive({
      default: 'mb-4',
      md: 'mb-6'
    }),
    content: responsive({
      default: 'space-y-4',
      md: 'space-y-6'
    })
  },
  
  // Form layout
  formLayout: {
    container: responsive({
      default: 'space-y-4',
      md: 'space-y-6'
    }),
    fieldGroup: responsive({
      default: 'grid-cols-1',
      md: 'grid-cols-2'
    }),
    actions: responsive({
      default: 'flex-col',
      sm: 'flex-row justify-end'
    })
  }
}

/**
 * Responsive breakpoint utilities
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const

/**
 * Helper function to check if current width matches breakpoint
 */
export function matchesBreakpoint(width: number, breakpoint: keyof typeof breakpoints): boolean {
  return width >= breakpoints[breakpoint]
}

/**
 * Get appropriate value for current breakpoint
 */
export function getResponsiveValue<T>(
  width: number,
  values: ResponsiveValue<T>
): T {
  if (width >= breakpoints['2xl'] && values['2xl']) return values['2xl']
  if (width >= breakpoints.xl && values.xl) return values.xl
  if (width >= breakpoints.lg && values.lg) return values.lg
  if (width >= breakpoints.md && values.md) return values.md
  if (width >= breakpoints.sm && values.sm) return values.sm
  return values.default
}

/**
 * Sports-specific responsive patterns
 */
export const sportsResponsive = {
  // Player jersey numbers
  jerseyNumber: responsive({
    default: 'text-lg',
    sm: 'text-xl',
    md: 'text-2xl'
  }),
  
  // Match score display
  score: responsive({
    default: 'text-3xl',
    sm: 'text-4xl',
    md: 'text-5xl',
    lg: 'text-6xl'
  }),
  
  // Tournament bracket
  bracket: responsive({
    default: 'text-xs',
    sm: 'text-sm',
    md: 'text-base'
  }),
  
  // Statistics table
  statsTable: responsive({
    default: 'text-xs',
    md: 'text-sm'
  }),
  
  // Live match controls
  liveControls: responsive({
    default: 'grid-cols-1',
    sm: 'grid-cols-2',
    md: 'grid-cols-3',
    lg: 'grid-cols-4'
  })
}
