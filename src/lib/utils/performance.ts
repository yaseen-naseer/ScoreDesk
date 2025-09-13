/**
 * Performance Monitoring Utilities
 * Provides utilities for monitoring and optimizing performance
 */

import { useEffect, useRef } from 'react'

// Performance metrics interface
export interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  memoryUsage?: number
  bundleSize?: number
  cacheHitRate?: number
}

// Web Vitals interface
export interface WebVitals {
  FCP?: number // First Contentful Paint
  LCP?: number // Largest Contentful Paint
  FID?: number // First Input Delay
  CLS?: number // Cumulative Layout Shift
  TTFB?: number // Time to First Byte
}

/**
 * Hook to measure component render performance
 */
export function useRenderPerformance(componentName: string) {
  const renderStart = useRef<number>(0)
  const renderEnd = useRef<number>(0)

  useEffect(() => {
    renderStart.current = performance.now()
    
    return () => {
      renderEnd.current = performance.now()
      const renderTime = renderEnd.current - renderStart.current
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName} render time: ${renderTime.toFixed(2)}ms`)
      }
      
      // Send to analytics in production
      if (process.env.NODE_ENV === 'production' && renderTime > 100) {
        // Log slow renders
        console.warn(`[Performance] Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`)
      }
    }
  }, [componentName])
}

/**
 * Hook to measure async operation performance
 */
export function useAsyncPerformance(operationName: string) {
  const startTime = useRef<number>(0)
  
  const startMeasurement = () => {
    startTime.current = performance.now()
  }
  
  const endMeasurement = () => {
    const duration = performance.now() - startTime.current
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${operationName} duration: ${duration.toFixed(2)}ms`)
    }
    
    return duration
  }
  
  return { startMeasurement, endMeasurement }
}

/**
 * Measure page load performance
 */
export function measurePageLoad() {
  if (typeof window === 'undefined') return

  useEffect(() => {
    const measureLoadTime = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
        const firstByte = navigation.responseStart - navigation.requestStart
        
        const metrics: PerformanceMetrics = {
          loadTime,
          renderTime: domContentLoaded,
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[Performance] Page Load Metrics:', {
            'Load Time': `${loadTime.toFixed(2)}ms`,
            'DOM Content Loaded': `${domContentLoaded.toFixed(2)}ms`,
            'Time to First Byte': `${firstByte.toFixed(2)}ms`,
          })
        }
        
        return metrics
      }
    }
    
    // Measure after page load
    if (document.readyState === 'complete') {
      measureLoadTime()
    } else {
      window.addEventListener('load', measureLoadTime)
      return () => window.removeEventListener('load', measureLoadTime)
    }
  }, [])
}

/**
 * Measure Web Vitals
 */
export function measureWebVitals() {
  if (typeof window === 'undefined') return

  useEffect(() => {
    // Import web-vitals library dynamically
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      const vitals: WebVitals = {}
      
      getCLS((metric) => {
        vitals.CLS = metric.value
        if (process.env.NODE_ENV === 'development') {
          console.log('[Web Vitals] CLS:', metric.value)
        }
      })
      
      getFID((metric) => {
        vitals.FID = metric.value
        if (process.env.NODE_ENV === 'development') {
          console.log('[Web Vitals] FID:', metric.value)
        }
      })
      
      getFCP((metric) => {
        vitals.FCP = metric.value
        if (process.env.NODE_ENV === 'development') {
          console.log('[Web Vitals] FCP:', metric.value)
        }
      })
      
      getLCP((metric) => {
        vitals.LCP = metric.value
        if (process.env.NODE_ENV === 'development') {
          console.log('[Web Vitals] LCP:', metric.value)
        }
      })
      
      getTTFB((metric) => {
        vitals.TTFB = metric.value
        if (process.env.NODE_ENV === 'development') {
          console.log('[Web Vitals] TTFB:', metric.value)
        }
      })
    }).catch(() => {
      // web-vitals not installed, skip measurement
      if (process.env.NODE_ENV === 'development') {
        console.log('[Performance] web-vitals not installed, skipping Web Vitals measurement')
      }
    })
  }, [])
}

/**
 * Preload critical resources
 */
export function preloadCriticalResources() {
  if (typeof window === 'undefined') return

  useEffect(() => {
    // Preload critical CSS
    const criticalCSS = document.createElement('link')
    criticalCSS.rel = 'preload'
    criticalCSS.as = 'style'
    criticalCSS.href = '/styles/critical.css'
    document.head.appendChild(criticalCSS)
    
    // Preload critical fonts
    const criticalFont = document.createElement('link')
    criticalFont.rel = 'preload'
    criticalFont.as = 'font'
    criticalFont.type = 'font/woff2'
    criticalFont.href = '/fonts/inter-var.woff2'
    criticalFont.crossOrigin = 'anonymous'
    document.head.appendChild(criticalFont)
    
    return () => {
      document.head.removeChild(criticalCSS)
      document.head.removeChild(criticalFont)
    }
  }, [])
}

/**
 * Optimize images with intersection observer
 */
export function useOptimizedImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '50px' }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (isInView && src) {
      const img = new Image()
      img.onload = () => {
        setImageSrc(src)
        setIsLoaded(true)
      }
      img.src = src
    }
  }, [isInView, src])

  return { imageSrc, isLoaded, imgRef }
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Re-export React hooks
import { useState, useRef } from 'react'
export { useState, useRef }
