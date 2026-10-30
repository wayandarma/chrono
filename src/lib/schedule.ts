// Pure alarm scheduling. No timers, no storage — everything takes `now`.
//
// Alarms are stored as local wall-clock time; each occurrence is resolved to a
// UTC instant whose ISO string (with `Z`) forms the occurrence ID. Timers only
// wake us up: due/missed is always decided by comparing real timestamps.

export type ToneId = 'chime' | 'pulse' | 'beep'

export type Alarm = {
  id: string
  label: string
  /** Local wall-clock time, "HH:MM". */
  time: string
  /** Weekdays (0 = Sunday). Empty = one-time alarm on `onceDate`. */
  days: number[]
  toneId: ToneId
  enabled: boolean
  createdAt: number
  updatedAt: number
  /** Local date "YYYY-MM-DD" for one-time alarms. */
  onceDate?: string
}

export type Snooze = { occurrenceId: string; alarmId: string; label: string; at: number }

export type Occurrence = { occurrenceId: string; alarmId: string; label: string; scheduledAt: number }

export const GRACE_MS = 2 * 60_000
export const HANDLED_TTL_MS = 7 * 24 * 60 * 60_000
const LOOKBACK_DAYS = 7

export const occurrenceId = (alarmId: string, at: Date | number | string) => `${alarmId}@${new Date(at).toISOString()}`
export const snoozeId = (alarmId: string, at: number) => `${alarmId}@snooze@${new Date(at).toISOString()}`

export function parseTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  return { h, m }
}

export const localDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * The instant a wall-clock time happens on a given local date.
 * - Nonexistent time (spring-forward gap): the first valid instant after it.
 * - Repeated time (fall-back overlap): the first instance (ECMAScript picks
 *   the earlier offset for ambiguous local times).
 */
export function resolveWallTime(y: number, mo: number, d: number, h: number, m: number): Date {
  const t = new Date(y, mo, d, h, m, 0, 0)
  if (t.getHours() === h && t.getMinutes() === m) return t
  // In a gap the engine pushed us forward by the gap length; walk back to the
  // transition instant, i.e. the first minute whose wall time is past target.
  const target = h * 60 + m
  let ms = t.getTime()
  for (let i = 0; i < 180; i++) {
    const prev = new Date(ms - 60_000)
    if (prev.getDate() !== d || prev.getHours() * 60 + prev.getMinutes() < target) break
    ms -= 60_000
  }
  return new Date(ms)
}

function occursOn(alarm: Alarm, day: Date) {
  if (alarm.days.length === 0) return alarm.onceDate === localDateKey(day)
  return alarm.days.includes(day.getDay())
}

function instantOn(alarm: Alarm, day: Date) {
  const { h, m } = parseTime(alarm.time)
  return resolveWallTime(day.getFullYear(), day.getMonth(), day.getDate(), h, m)
}

/** Next occurrence strictly after `after`, or null (disabled / one-time in the past). */
export function nextOccurrence(alarm: Alarm, after: Date): Date | null {
  if (!alarm.enabled) return null
  for (let i = 0; i <= 8; i++) {
    const day = new Date(after.getFullYear(), after.getMonth(), after.getDate() + i, 12)
    if (!occursOn(alarm, day)) continue
    const at = instantOn(alarm, day)
    if (at > after) return at
  }
  return null
}

/** Occurrences with an instant in (from, to]. */
export function occurrencesBetween(alarm: Alarm, from: Date, to: Date): Date[] {
  if (!alarm.enabled) return []
  const out: Date[] = []
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12)
  for (let day = start; day.getTime() <= to.getTime() + 86_400_000; day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 12)) {
    if (!occursOn(alarm, day)) continue
    const at = instantOn(alarm, day)
    if (at > from && at <= to) out.push(at)
  }
  return out
}

/** The local date a new one-time alarm should fire on. */
export function onceDateFor(time: string, now: Date) {
  const { h, m } = parseTime(time)
  const today = resolveWallTime(now.getFullYear(), now.getMonth(), now.getDate(), h, m)
  const day = today > now ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12)
  return localDateKey(day)
}

export type OccurrenceState = 'upcoming' | 'due' | 'missed'

export function classify(scheduledAt: number, now: number): OccurrenceState {
  const late = now - scheduledAt
  if (late < 0) return 'upcoming'
  return late <= GRACE_MS ? 'due' : 'missed'
}

export type Evaluation = { due: Occurrence[]; missed: Occurrence[]; snoozesLeft: Snooze[] }

/**
 * Everything that came due since the last check. Occurrences already in
 * `handled` are skipped, so each one is acted on exactly once. Anything later
 * than the grace period is missed — never audible.
 */
export function evaluate(alarms: Alarm[], snoozes: Snooze[], handled: Record<string, number>, lastCheckedAt: number, now: number): Evaluation {
  const due: Occurrence[] = []
  const missed: Occurrence[] = []
  const from = new Date(Math.max(lastCheckedAt, now - LOOKBACK_DAYS * 86_400_000))
  const to = new Date(now)

  for (const alarm of alarms) {
    for (const at of occurrencesBetween(alarm, from, to)) {
      const occ = { occurrenceId: occurrenceId(alarm.id, at), alarmId: alarm.id, label: alarm.label, scheduledAt: at.getTime() }
      if (handled[occ.occurrenceId]) continue
      ;(classify(occ.scheduledAt, now) === 'due' ? due : missed).push(occ)
    }
  }

  const snoozesLeft: Snooze[] = []
  for (const s of snoozes) {
    if (s.at > now) {
      snoozesLeft.push(s)
      continue
    }
    if (handled[s.occurrenceId]) continue
    const occ = { occurrenceId: s.occurrenceId, alarmId: s.alarmId, label: s.label, scheduledAt: s.at }
    ;(classify(s.at, now) === 'due' ? due : missed).push(occ)
  }

  const byTime = (a: Occurrence, b: Occurrence) => a.scheduledAt - b.scheduledAt
  return { due: due.sort(byTime), missed: missed.sort(byTime), snoozesLeft }
}

export function pruneHandled(handled: Record<string, number>, now: number) {
  const out: Record<string, number> = {}
  for (const [id, at] of Object.entries(handled)) if (now - at < HANDLED_TTL_MS) out[id] = at
  return out
}

/** Soonest upcoming occurrence across alarms and snoozes. */
export function nextAcross(alarms: Alarm[], snoozes: Snooze[], now: Date) {
  let best: { at: Date; label: string; alarmId: string } | null = null
  for (const a of alarms) {
    const at = nextOccurrence(a, now)
    if (at && (!best || at < best.at)) best = { at, label: a.label, alarmId: a.id }
  }
  for (const s of snoozes) {
    if (s.at > now.getTime() && (!best || s.at < best.at.getTime())) best = { at: new Date(s.at), label: s.label, alarmId: s.alarmId }
  }
  return best
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export function daysLabel(days: number[]) {
  if (days.length === 0) return 'Once'
  if (days.length === 7) return 'Every day'
  const key = [...days].sort().join()
  if (key === '1,2,3,4,5') return 'Weekdays'
  if (key === '0,6') return 'Weekends'
  return [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DAY_SHORT[d]).join(' ')
}

export function untilLabel(ms: number) {
  const mins = Math.max(1, Math.ceil(ms / 60_000))
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  if (h < 48) return `${h}h ${String(mins % 60).padStart(2, '0')}m`
  return `${Math.round(h / 24)}d`
}
