/**
 * useIsolatedData Hook
 * React hook for organization-scoped data management with caching
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useEnhancedOrganization } from '@/lib/contexts/enhanced-organization-context'
import { DataIsolationService, type IsolatedQuery } from '@/lib/services/data-isolation-service'

export interface UseIsolatedDataOptions {
  enabled?: boolean
  cacheKey?: string
  cacheTTL?: number
  refetchOnMount?: boolean
  refetchOnWindowFocus?: boolean
  refetchInterval?: number
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}

export interface UseIsolatedDataResult<T> {
  data: T[] | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  isStale: boolean
  isFetching: boolean
  refetch: () => Promise<void>
  mutate: (newData: T[] | ((current: T[] | null) => T[])) => void
  invalidate: () => void
}

export function useIsolatedData<T = any>(
  query: IsolatedQuery<T> | null,
  options: UseIsolatedDataOptions = {}
): UseIsolatedDataResult<T> {
  const {
    enabled = true,
    cacheKey: customCacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutes default
    refetchOnMount = true,
    refetchOnWindowFocus = false,
    refetchInterval,
    onSuccess,
    onError
  } = options

  const { currentOrganization } = useEnhancedOrganization()
  
  // State
  const [data, setData] = useState<T[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [lastFetch, setLastFetch] = useState<number | null>(null)

  // Refs
  const serviceRef = useRef<DataIsolationService | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  // Generate cache key
  const cacheKey = customCacheKey || (query ? `${query.tableName}:${JSON.stringify(query)}` : null)

  // Initialize data isolation service
  useEffect(() => {
    if (currentOrganization) {
      serviceRef.current = new DataIsolationService({
        organizationId: currentOrganization.id,
        cachePrefix: 'isolated_data',
        ttl: cacheTTL
      })
    } else {
      serviceRef.current?.destroy()
      serviceRef.current = null
    }

    return () => {
      serviceRef.current?.destroy()
    }
  }, [currentOrganization, cacheTTL])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Check if data is stale
  useEffect(() => {
    if (lastFetch) {
      const age = Date.now() - lastFetch
      setIsStale(age > cacheTTL)
    }
  }, [lastFetch, cacheTTL])

  // Fetch data function
  const fetchData = useCallback(async (forceFresh = false) => {
    if (!query || !serviceRef.current || !cacheKey || !enabled) {
      return
    }

    setIsFetching(true)
    if (!data || forceFresh) {
      setIsLoading(true)
    }
    setIsError(false)
    setError(null)

    try {
      const result = await serviceRef.current.queryIsolated(
        cacheKey,
        query,
        {
          useCache: !forceFresh,
          forceFresh,
          cacheTTL
        }
      )

      if (mountedRef.current) {
        setData(result)
        setLastFetch(Date.now())
        setIsStale(false)
        onSuccess?.(result)
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      
      if (mountedRef.current) {
        setIsError(true)
        setError(errorObj)
        onError?.(errorObj)
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
        setIsFetching(false)
      }
    }
  }, [query, cacheKey, enabled, data, cacheTTL, onSuccess, onError])

  // Initial fetch
  useEffect(() => {
    if (refetchOnMount && enabled) {
      fetchData()
    }
  }, [fetchData, refetchOnMount, enabled])

  // Set up refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(() => {
        fetchData()
      }, refetchInterval)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [fetchData, refetchInterval, enabled])

  // Window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return

    const handleFocus = () => {
      if (isStale) {
        fetchData()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchData, refetchOnWindowFocus, enabled, isStale])

  // Refetch function
  const refetch = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  // Mutate function (optimistic updates)
  const mutate = useCallback((newData: T[] | ((current: T[] | null) => T[])) => {
    if (typeof newData === 'function') {
      setData(current => newData(current))
    } else {
      setData(newData)
    }
    setLastFetch(Date.now())
    setIsStale(false)
  }, [])

  // Invalidate function
  const invalidate = useCallback(() => {
    if (serviceRef.current && cacheKey) {
      serviceRef.current.removeCached(cacheKey)
      setIsStale(true)
    }
  }, [cacheKey])

  return {
    data,
    isLoading,
    isError,
    error,
    isStale,
    isFetching,
    refetch,
    mutate,
    invalidate
  }
}

// Hook for mutations
export interface UseIsolatedMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: Error, variables: TVariables) => void
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void
}

export interface UseIsolatedMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>
  mutateAsync: (variables: TVariables) => Promise<TData>
  isLoading: boolean
  isError: boolean
  error: Error | null
  data: TData | null
  reset: () => void
}

export function useIsolatedMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables, service: DataIsolationService) => Promise<TData>,
  options: UseIsolatedMutationOptions<TData, TVariables> = {}
): UseIsolatedMutationResult<TData, TVariables> {
  const { onSuccess, onError, onSettled } = options
  const { currentOrganization } = useEnhancedOrganization()

  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<TData | null>(null)

  const serviceRef = useRef<DataIsolationService | null>(null)

  // Initialize service
  useEffect(() => {
    if (currentOrganization) {
      serviceRef.current = new DataIsolationService({
        organizationId: currentOrganization.id,
        cachePrefix: 'isolated_mutation',
        ttl: 5 * 60 * 1000
      })
    } else {
      serviceRef.current?.destroy()
      serviceRef.current = null
    }

    return () => {
      serviceRef.current?.destroy()
    }
  }, [currentOrganization])

  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    if (!serviceRef.current) {
      throw new Error('No organization context available')
    }

    setIsLoading(true)
    setIsError(false)
    setError(null)

    try {
      const result = await mutationFn(variables, serviceRef.current)
      setData(result)
      onSuccess?.(result, variables)
      onSettled?.(result, null, variables)
      return result
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      setIsError(true)
      setError(errorObj)
      onError?.(errorObj, variables)
      onSettled?.(undefined, errorObj, variables)
      throw errorObj
    } finally {
      setIsLoading(false)
    }
  }, [mutationFn, onSuccess, onError, onSettled])

  const mutate = useCallback((variables: TVariables) => {
    mutateAsync(variables).catch(() => {
      // Error is already handled in mutateAsync
    })
    return mutateAsync(variables)
  }, [mutateAsync])

  const reset = useCallback(() => {
    setIsLoading(false)
    setIsError(false)
    setError(null)
    setData(null)
  }, [])

  return {
    mutate,
    mutateAsync,
    isLoading,
    isError,
    error,
    data,
    reset
  }
}

export default useIsolatedData
