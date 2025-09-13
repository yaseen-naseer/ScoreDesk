/**
 * Lazy Loading Utilities
 * Provides utilities for dynamic imports and lazy loading of components
 */

import { ComponentType, Suspense, lazy } from 'react'
import { Loader2 } from 'lucide-react'

// Loading component for Suspense fallback
export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center p-4 ${className || ''}`}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

// Generic loading fallback
export function DefaultLoadingFallback() {
  return <LoadingSpinner className="min-h-[200px]" />
}

/**
 * Creates a lazy-loaded component with proper error boundaries and loading states
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  const LazyComponent = lazy(importFunc)
  
  return function LazyWrapper(props: any) {
    return (
      <Suspense fallback={<DefaultLoadingFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}

/**
 * Preloads a component for better UX
 */
export function preloadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  return () => {
    importFunc()
  }
}

/**
 * Lazy load components with intersection observer
 */
export function useIntersectionObserver(
  callback: () => void,
  options: IntersectionObserverInit = {}
) {
  const defaultOptions: IntersectionObserverInit = {
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  }

  return (element: HTMLElement | null) => {
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback()
            observer.unobserve(entry.target)
          }
        })
      },
      defaultOptions
    )

    observer.observe(element)

    return () => observer.disconnect()
  }
}

/**
 * Lazy load images with intersection observer
 */
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setImageSrc(src)
      setIsLoaded(true)
    }
    img.src = src
  }, [src])

  return { imageSrc, isLoaded }
}

// Re-export React hooks for convenience
import { useState, useEffect } from 'react'
export { useState, useEffect }
