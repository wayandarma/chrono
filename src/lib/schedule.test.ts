/// <reference types="node" />
import { afterEach, describe, expect, it } from 'vitest'
import {
  GRACE_MS, classify, daysLabel, evaluate, nextAcross, nextOccurrence, occurrenceId, onceDateFor, pruneHandled,
  resolveWallTime, snoozeId, type Alarm,
} from './schedule'

// Node re-reads process.env.TZ on change, so each test can pin a zone.
const ORIGINAL_TZ = process.env.TZ
function inZone(tz: string) {
  process.env.TZ = tz
}
afterEach(() => {
  process.env.TZ = ORIGINAL_TZ
})

const alarm = (over: Partial<Alarm> = {}): Alarm => ({
  id: 'a1', label: 'Wake up', time: '07:00', days: [1, 2, 3, 4, 5], toneId: 'chime', enabled: true, createdAt: 0, updatedAt: 0, ...over,
})

describe('nextOccurrence', () => {
  it('finds the next matching weekday', () => {
    inZone('Europe/London')
    // Friday 30 Oct 2026, 20:00 → next weekday alarm is Monday 2 Nov 07:00 (GMT)
    const at = nextOccurrence(alarm(), new Date('2026-10-30T20:00:00Z'))
    expect(at?.toISOString()).toBe('2026-11-02T07:00:00.000Z')
  })

  it('returns today when the time is still ahead', () => {
    inZone('Europe/London')
    const at = nextOccurrence(alarm({ days: [5] }), new Date('2026-10-30T06:00:00Z'))
    expect(at?.toISOString()).toBe('2026-10-30T07:00:00.000Z')
  })

  it('fires a one-time alarm only on its date', () => {
    inZone('Europe/London')
    const once = alarm({ days: [], onceDate: '2026-10-31' })
    expect(nextOccurrence(once, new Date('2026-10-30T12:00:00Z'))?.toISOString()).toBe('2026-10-31T07:00:00.000Z')
    expect(nextOccurrence(once, new Date('2026-10-31T08:00:00Z'))).toBeNull()
  })

  it('ignores disabled alarms', () => {
    expect(nextOccurrence(alarm({ enabled: false }), new Date())).toBeNull()
  })
})

describe('onceDateFor', () => {
  it('uses today when the time is still ahead, otherwise tomorrow', () => {
    inZone('Europe/London')
    expect(onceDateFor('21:00', new Date('2026-10-30T20:55:30Z'))).toBe('2026-10-30')
    expect(onceDateFor('20:55', new Date('2026-10-30T20:55:30Z'))).toBe('2026-10-31')
  })
})

describe('daylight saving', () => {
  it('New York spring-forward gap: 02:30 rings at 03:00 EDT', () => {
    inZone('America/New_York')
    expect(resolveWallTime(2026, 2, 8, 2, 30).toISOString()).toBe('2026-03-08T07:00:00.000Z')
  })

  it('London spring-forward gap: 01:30 rings at 02:00 BST', () => {
    inZone('Europe/London')
    expect(resolveWallTime(2026, 2, 29, 1, 30).toISOString()).toBe('2026-03-29T01:00:00.000Z')
  })

  it('Lord Howe 30-minute gap: 02:15 rings at 02:30', () => {
    inZone('Australia/Lord_Howe')
    // DST starts Sun 4 Oct 2026 02:00 (+10:30 → +11:00)
    expect(resolveWallTime(2026, 9, 4, 2, 15).toISOString()).toBe('2026-10-03T15:30:00.000Z')
  })

  it('New York fall-back overlap: 01:30 rings at the first instance (EDT)', () => {
    inZone('America/New_York')
    expect(resolveWallTime(2026, 10, 1, 1, 30).toISOString()).toBe('2026-11-01T05:30:00.000Z')
  })

  it('London fall-back overlap: 01:30 rings at the first instance (BST)', () => {
    inZone('Europe/London')
    expect(resolveWallTime(2026, 9, 25, 1, 30).toISOString()).toBe('2026-10-25T00:30:00.000Z')
  })

  it('a daily alarm in the overlap produces exactly one occurrence that night', () => {
    inZone('America/New_York')
    const daily = alarm({ time: '01:30', days: [0, 1, 2, 3, 4, 5, 6] })
    const res = evaluate([daily], [], {}, Date.parse('2026-11-01T04:00:00Z'), Date.parse('2026-11-01T07:00:00Z'))
    expect([...res.due, ...res.missed].map((o) => o.occurrenceId)).toEqual([occurrenceId('a1', '2026-11-01T05:30:00Z')])
  })

  it('keeps local wall time across the transition (07:00 stays 07:00)', () => {
    inZone('Europe/London')
    const daily = alarm({ days: [0, 1, 2, 3, 4, 5, 6] })
    expect(nextOccurrence(daily, new Date('2026-10-24T08:00:00Z'))?.toISOString()).toBe('2026-10-25T07:00:00.000Z') // GMT
    expect(nextOccurrence(daily, new Date('2026-10-23T08:00:00Z'))?.toISOString()).toBe('2026-10-24T06:00:00.000Z') // BST
  })
})

describe('classify', () => {
  const t = 1_000_000_000_000
  it('splits upcoming, due and missed around the 2-minute grace', () => {
    expect(classify(t, t - 1)).toBe('upcoming')
    expect(classify(t, t)).toBe('due')
    expect(classify(t, t + GRACE_MS)).toBe('due')
    expect(classify(t, t + GRACE_MS + 1)).toBe('missed')
  })
})

describe('evaluate', () => {
  it('reports an occurrence 30 s late as due', () => {
    inZone('Europe/London')
    const now = Date.parse('2026-11-02T07:00:30Z')
    const res = evaluate([alarm()], [], {}, now - 60_000, now)
    expect(res.due.map((o) => o.occurrenceId)).toEqual([occurrenceId('a1', '2026-11-02T07:00:00Z')])
    expect(res.missed).toEqual([])
  })

  it('never makes a stale occurrence audible: hours late is missed', () => {
    inZone('Europe/London')
    const now = Date.parse('2026-11-02T10:00:00Z')
    const res = evaluate([alarm()], [], {}, Date.parse('2026-11-01T22:00:00Z'), now)
    expect(res.due).toEqual([])
    expect(res.missed).toHaveLength(1)
  })

  it('handles each occurrence once', () => {
    inZone('Europe/London')
    const now = Date.parse('2026-11-02T07:00:30Z')
    const handled = { [occurrenceId('a1', '2026-11-02T07:00:00Z')]: now }
    const res = evaluate([alarm()], [], handled, now - 60_000, now)
    expect(res.due).toEqual([])
  })

  it('looks back at most 7 days', () => {
    inZone('Europe/London')
    const now = Date.parse('2026-11-30T12:00:00Z')
    const res = evaluate([alarm({ days: [0, 1, 2, 3, 4, 5, 6] })], [], {}, 0, now)
    expect(res.missed.length).toBeLessThanOrEqual(8)
  })

  it('surfaces due snoozes and keeps future ones', () => {
    const now = 2_000_000_000_000
    const due = { occurrenceId: snoozeId('a1', now - 10_000), alarmId: 'a1', label: 'x', at: now - 10_000 }
    const later = { occurrenceId: snoozeId('a1', now + 60_000), alarmId: 'a1', label: 'x', at: now + 60_000 }
    const res = evaluate([], [due, later], {}, now - 1_000, now)
    expect(res.due.map((o) => o.occurrenceId)).toEqual([due.occurrenceId])
    expect(res.snoozesLeft).toEqual([later])
  })

  it('orders simultaneous due occurrences by time', () => {
    inZone('Europe/London')
    const now = Date.parse('2026-11-02T07:01:00Z')
    const res = evaluate([alarm({ id: 'b', time: '07:01' }), alarm({ id: 'a' })], [], {}, now - 90_000, now)
    expect(res.due.map((o) => o.alarmId)).toEqual(['a', 'b'])
  })
})

describe('helpers', () => {
  it('prunes handled IDs after 7 days', () => {
    const now = 10 * 86_400_000
    expect(pruneHandled({ old: now - 8 * 86_400_000, fresh: now - 1000 }, now)).toEqual({ fresh: now - 1000 })
  })

  it('occurrence IDs carry an unambiguous UTC timestamp', () => {
    expect(occurrenceId('a1', Date.parse('2026-11-02T07:00:00Z'))).toBe('a1@2026-11-02T07:00:00.000Z')
  })

  it('labels day sets', () => {
    expect(daysLabel([])).toBe('Once')
    expect(daysLabel([1, 2, 3, 4, 5])).toBe('Weekdays')
    expect(daysLabel([0, 6])).toBe('Weekends')
    expect(daysLabel([0, 1, 2, 3, 4, 5, 6])).toBe('Every day')
    expect(daysLabel([0, 2])).toBe('Tue Sun')
  })

  it('picks the soonest of alarms and snoozes', () => {
    inZone('Europe/London')
    const now = new Date('2026-11-02T06:00:00Z')
    const snooze = { occurrenceId: 's', alarmId: 'z', label: 'Snoozed', at: now.getTime() + 60_000 }
    expect(nextAcross([alarm()], [snooze], now)?.label).toBe('Snoozed')
  })
})
