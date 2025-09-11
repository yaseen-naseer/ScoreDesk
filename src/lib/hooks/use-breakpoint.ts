'use client'

import { useEffect, useState } from 'react'

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

interface BreakpointConfig {
  sm: number
  md: number
  lg: number
  xl: number
  '2xl': number
}

const breakpoints: BreakpointConfig = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

/**
 * Hook to get the current screen size breakpoint
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('sm')
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setWindowSize({ width, height })

      if (width >= breakpoints['2xl']) {
        setBreakpoint('2xl')
      } else if (width >= breakpoints.xl) {
        setBreakpoint('xl')
      } else if (width >= breakpoints.lg) {
        setBreakpoint('lg')
      } else if (width >= breakpoints.md) {
        setBreakpoint('md')
      } else {
        setBreakpoint('sm')
      }
    }

    // Set initial breakpoint
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isAbove = (bp: Breakpoint) => windowSize.width >= breakpoints[bp]
  const isBelow = (bp: Breakpoint) => windowSize.width < breakpoints[bp]
  const isBetween = (min: Breakpoint, max: Breakpoint) => 
    windowSize.width >= breakpoints[min] && windowSize.width < breakpoints[max]

  return {
    breakpoint,
    windowSize,
    isAbove,
    isBelow,
    isBetween,
    isMobile: isBelow('md'),
    isTablet: isBetween('md', 'lg'),
    isDesktop: isAbove('lg'),
    isSmallDesktop: isBetween('lg', 'xl'),
    isLargeDesktop: isAbove('xl'),
  }
}

/**
 * Hook for responsive values based on breakpoints
 */
export function useResponsiveValue<T>(values: Partial<Record<Breakpoint, T>>, defaultValue: T): T {
  const { breakpoint } = useBreakpoint()
  
  // Get the value for current breakpoint, falling back to smaller breakpoints
  const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm']
  const currentIndex = breakpointOrder.indexOf(breakpoint)
  
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i]
    if (values[bp] !== undefined) {
      return values[bp]!
    }
  }
  
  return defaultValue
}

/**
 * Hook for detecting orientation changes on mobile
 */
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  
  useEffect(() => {
    function handleOrientationChange() {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
    }
    
    handleOrientationChange()
    window.addEventListener('resize', handleOrientationChange)
    
    return () => window.removeEventListener('resize', handleOrientationChange)
  }, [])
  
  return orientation
}

/**
 * Hook for detecting device type based on user agent and screen size
 */
export function useDeviceDetection() {
  const { isMobile, isTablet } = useBreakpoint()
  const [deviceInfo, setDeviceInfo] = useState({
    isTouchDevice: false,
    platform: 'unknown' as 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown'
  })

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    
    let platform: typeof deviceInfo.platform = 'unknown'
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      platform = 'ios'
    } else if (userAgent.includes('android')) {
      platform = 'android'
    } else if (userAgent.includes('windows')) {
      platform = 'windows'
    } else if (userAgent.includes('mac')) {
      platform = 'macos'
    } else if (userAgent.includes('linux')) {
      platform = 'linux'
    }

    setDeviceInfo({ isTouchDevice, platform })
  }, [])

  return {
    ...deviceInfo,
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    canHover: !deviceInfo.isTouchDevice,
    prefersMouse: !isMobile && !deviceInfo.isTouchDevice,
  }
}

/**
 * Hook for managing responsive sidebar state
 */
export function useResponsiveSidebar() {
  const { isMobile, isTablet } = useBreakpoint()
  const [isOpen, setIsOpen] = useState(false)

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false)
    }
  }, [isMobile])

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isMobile && isOpen) {
        const sidebar = document.querySelector('[data-sidebar]')
        if (sidebar && !sidebar.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, isMobile])

  return {
    isOpen,
    setIsOpen,
    shouldShowSidebar: !isMobile || isOpen,
    shouldOverlay: isMobile || isTablet,
    defaultOpen: !isMobile && !isTablet,
  }
}
