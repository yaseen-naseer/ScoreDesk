'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface MatchTimerProps {
  isLive?: boolean
  startTimestamp?: number | null
  initialElapsedMs?: number
  periodMinutes?: number
  onTick?: (ms: number) => void
  className?: string
  persistKey?: string // optional key to persist timer state (e.g., `match:{id}:timer`)
}

function format(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function MatchTimer({
  isLive = false,
  startTimestamp = null,
  initialElapsedMs = 0,
  periodMinutes = 45,
  onTick,
  className,
  persistKey
}: MatchTimerProps) {
  const raf = useRef<number | null>(null)
  const anchor = useRef<number | null>(null)
  const [running, setRunning] = useState<boolean>(isLive)
  const [elapsed, setElapsed] = useState<number>(initialElapsedMs)
  const [stoppageMs, setStoppageMs] = useState<number>(0)
  const [extraPeriods, setExtraPeriods] = useState<number>(0) // number of 15' extra-time periods (0,1,2)
  const [period, setPeriod] = useState<'H1'|'HT'|'H2'|'FT'|'ET1'|'ET2'|'AET'>('H1')

  const loop = useCallback((t: number) => {
    if (anchor.current === null) anchor.current = t
    const delta = t - anchor.current
    const next = elapsed + delta
    setElapsed(next)
    onTick?.(next)
    anchor.current = t
    raf.current = requestAnimationFrame(loop)
  }, [elapsed, onTick])

  // Load persisted state
  useEffect(() => {
    if (!persistKey) return
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(persistKey) : null
      if (raw) {
        const s = JSON.parse(raw)
        if (typeof s.elapsed === 'number') setElapsed(s.elapsed)
        if (typeof s.running === 'boolean') setRunning(s.running)
        if (typeof s.stoppageMs === 'number') setStoppageMs(s.stoppageMs)
        if (typeof s.extraPeriods === 'number') setExtraPeriods(s.extraPeriods)
        if (typeof s.period === 'string') setPeriod(s.period)
      } else if (isLive && startTimestamp && !elapsed) {
        setElapsed(Date.now() - startTimestamp)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (running) {
      raf.current = requestAnimationFrame(loop)
    } else if (raf.current) {
      cancelAnimationFrame(raf.current)
      raf.current = null
      anchor.current = null
    }
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [running, loop])

  // Persist state
  useEffect(() => {
    if (!persistKey) return
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          persistKey,
          JSON.stringify({ elapsed, running, stoppageMs, extraPeriods, period })
        )
      }
    } catch {}
  }, [persistKey, elapsed, running, stoppageMs, extraPeriods, period])

  const toggle = () => setRunning(r => !r)
  const addStoppageMinute = () => setStoppageMs(ms => ms + 60_000)
  const addExtraPeriod = () => setExtraPeriods(n => Math.min(2, n + 1))

  const periodMs = periodMinutes * 60_000
  const extraPeriodMs = 15 * 60_000
  const regulationMs = 2 * periodMs
  const etTotalMs = extraPeriods * extraPeriodMs
  const displayMs = Math.min(elapsed, regulationMs + etTotalMs) + stoppageMs

  // Auto period transitions based on elapsed
  useEffect(() => {
    const h1End = periodMs
    const h2Start = periodMs
    const h2End = 2 * periodMs
    const et1End = h2End + extraPeriodMs
    const et2End = h2End + 2 * extraPeriodMs

    if (elapsed < h1End) {
      if (period !== 'H1') setPeriod('H1')
    } else if (elapsed >= h1End && elapsed < h2Start) {
      if (period !== 'HT') setPeriod('HT')
    } else if (elapsed >= h2Start && elapsed < h2End) {
      if (period !== 'H2') setPeriod('H2')
    } else if (elapsed >= h2End && extraPeriods >= 1 && elapsed < et1End) {
      if (period !== 'ET1') setPeriod('ET1')
    } else if (elapsed >= et1End && extraPeriods >= 2 && elapsed < et2End) {
      if (period !== 'ET2') setPeriod('ET2')
    } else if (elapsed >= h2End && extraPeriods === 0) {
      if (period !== 'FT') setPeriod('FT')
    } else if (elapsed >= et2End && extraPeriods === 2) {
      if (period !== 'AET') setPeriod('AET')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, extraPeriods, periodMs])

  return (
    <div className={className} role="region" aria-label="Match timer">
      <div className="flex items-center gap-3" aria-live="polite">
        <Badge variant={running ? 'secondary' : 'outline'}>{period}</Badge>
        <span className="font-mono text-2xl">{format(displayMs)}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" onClick={toggle}>{running ? 'Pause' : 'Resume'}</Button>
        <Button size="sm" variant="outline" onClick={addStoppageMinute}>+1' ST</Button>
        <Button size="sm" variant="outline" onClick={addExtraPeriod}>+ET</Button>
      </div>
    </div>
  )
}


