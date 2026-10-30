// PROTOTYPE — throwaway. Shared bits for the three CHRONO visual directions.
// Only the clock tick, the flip mechanic and stub data are shared; every
// variant owns its own layout, hierarchy and controls.
import { useEffect, useState } from 'react'

/** Ticks on second boundaries; always derives from Date.now(). */
export function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let id: number
    const tick = () => {
      setNow(new Date())
      id = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
    }
    id = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
    return () => clearTimeout(id)
  }, [])
  return now
}

export const pad = (n: number) => String(n).padStart(2, '0')

export const uses12h = (() => {
  const hc = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle
  return hc === 'h12' || hc === 'h11'
})()

export function clockParts(d: Date, twelve = uses12h) {
  let h = d.getHours()
  const meridiem = h < 12 ? 'AM' : 'PM'
  if (twelve) h = h % 12 || 12
  return { hh: pad(h), mm: pad(d.getMinutes()), ss: pad(d.getSeconds()), meridiem, twelve }
}

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export type StubAlarm = {
  id: string
  label: string
  time: string
  days: number[]
  enabled: boolean
}

export const STUB_ALARMS: StubAlarm[] = [
  { id: 'a1', label: 'Wake up', time: '07:00', days: [1, 2, 3, 4, 5], enabled: true },
  { id: 'a2', label: 'Long run', time: '06:15', days: [6], enabled: true },
  { id: 'a3', label: 'Call mum', time: '19:30', days: [0], enabled: false },
  { id: 'a4', label: 'Dentist', time: '14:45', days: [], enabled: true },
]

export function daysLabel(days: number[]) {
  if (days.length === 0) return 'Once'
  if (days.length === 7) return 'Every day'
  if (days.join() === '1,2,3,4,5') return 'Weekdays'
  if (days.join() === '0,6') return 'Weekends'
  return days.map((d) => DAYS[d]).join(' ')
}

/** Stub: next enabled alarm and minutes until it (ignores DST — prototype only). */
export function nextAlarm(alarms: StubAlarm[], now: Date) {
  let best: { alarm: StubAlarm; at: Date } | null = null
  for (const a of alarms) {
    if (!a.enabled) continue
    const [h, m] = a.time.split(':').map(Number)
    for (let i = 0; i < 8; i++) {
      const at = new Date(now)
      at.setDate(now.getDate() + i)
      at.setHours(h, m, 0, 0)
      if (at <= now) continue
      if (a.days.length && !a.days.includes(at.getDay())) continue
      if (!best || at < best.at) best = { alarm: a, at }
      break
    }
  }
  if (!best) return null
  const mins = Math.ceil((best.at.getTime() - now.getTime()) / 60000)
  const inLabel = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${pad(mins % 60)}m`
  return { ...best, inLabel }
}

export const SCENES = ['Midnight City', 'Blue Hour Ocean', 'Misty Pines', 'Desert Dusk', 'Alpine Snow', 'Ink & Smoke']
export const TRACKS = ['Rain', 'Ocean', 'Forest at Dawn', 'Soft Piano', 'Deep Space Drone', 'Café Murmur']

/** One flip card. Mechanics live in index.css; skin via className + CSS vars. */
export function FlipChar({ value, className = '' }: { value: string; className?: string }) {
  const [s, setS] = useState({ cur: value, prev: value, n: 0 })
  if (s.cur !== value) setS({ cur: value, prev: s.cur, n: s.n + 1 })
  const flipping = s.n > 0
  return (
    <span className={`flip ${className}`} aria-hidden="true">
      <span className="flip__half flip__half--top flip__static-top">
        <span className="flip__glyph" key={`t${s.n}`}>{s.cur}</span>
      </span>
      <span className={`flip__half flip__half--bottom flip__static-bottom ${flipping ? 'is-flipping' : ''}`} key={`sb${s.n}`}>
        <span className="flip__glyph">{s.prev}</span>
      </span>
      {flipping && (
        <span key={s.n}>
          <span className="flip__half flip__half--top flip__leaf-top">
            <span className="flip__glyph">{s.prev}</span>
          </span>
          <span className="flip__half flip__half--bottom flip__leaf-bottom">
            <span className="flip__glyph">{s.cur}</span>
          </span>
        </span>
      )}
    </span>
  )
}

/** Visually hidden live time, announced at most once a minute. */
export function SrTime({ now }: { now: Date }) {
  const label = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return (
    <span className="sr-only" aria-live="polite">
      {label}
    </span>
  )
}

/** Global key handler that ignores typing contexts. */
export function useKeys(map: Record<string, () => void>, deps: unknown[]) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const fn = map[e.key.toLowerCase()] ?? map[e.key]
      if (fn) {
        e.preventDefault()
        fn()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
