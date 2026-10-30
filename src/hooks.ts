import { useEffect, useState } from 'react'
import { audioRunning, onAudioState, unlockAudio } from './lib/audio'

/** Ticks on second boundaries; the value always comes from Date.now(). */
export function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let id = 0
    const tick = () => {
      setNow(new Date())
      id = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
    }
    id = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
    // Catch up immediately when a throttled background tab comes back.
    const onVisible = () => document.visibilityState === 'visible' && setNow(new Date())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return now
}

export function useMedia(query: string) {
  const [match, setMatch] = useState(() => matchMedia(query).matches)
  useEffect(() => {
    const mq = matchMedia(query)
    const on = () => setMatch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

/** Unlocks audio on any real gesture; reports whether the context is actually running. */
export function useSoundReady() {
  const [ready, setReady] = useState(audioRunning)
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    const off = onAudioState(setReady)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      off()
    }
  }, [])
  return ready
}

export type WakeLockStatus = { state: 'off' | 'on' | 'unsupported' | 'failed'; reason?: string }

/** Holds a screen wake lock while `want` is true; re-acquires when the tab becomes visible. */
export function useWakeLock(want: boolean): WakeLockStatus {
  const supported = 'wakeLock' in navigator
  const [status, setStatus] = useState<WakeLockStatus>({ state: supported ? 'off' : 'unsupported' })

  useEffect(() => {
    if (!supported || !want) {
      setStatus({ state: supported ? 'off' : 'unsupported' })
      return
    }
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || sentinel) return
      try {
        sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) return void sentinel.release()
        setStatus({ state: 'on' })
        sentinel.addEventListener('release', () => {
          sentinel = null
          if (!cancelled) setStatus({ state: 'off', reason: 'Released while the tab was hidden' })
        })
      } catch (e) {
        setStatus({ state: 'failed', reason: e instanceof Error ? e.message : 'The browser refused' })
      }
    }
    void acquire()
    const onVisible = () => void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release()
    }
  }, [want, supported])

  return status
}
