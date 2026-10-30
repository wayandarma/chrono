// Runs the alarm scheduler in the leader tab: detects due/missed occurrences,
// keeps the persisted queue, rings one occurrence at a time, and hands over
// cleanly when leadership moves to another tab.
import { useCallback, useEffect, useRef, useState } from 'react'
import { playingTrack, startTone, stopTrack, type TrackId } from './lib/audio'
import { TAB_ID, broadcast, hasWebLocks, onMessage, startLeadership } from './lib/leader'
import { evaluate, pruneHandled, snoozeId, type Occurrence } from './lib/schedule'
import { useStore } from './lib/store'
import { alarmsStore, runtimeStore, settingsStore, type Runtime } from './state'

const CLAIM_FRESH_MS = 30_000
const AUTO_STOP_MS = 10 * 60_000
const MISSED_CAP = 20

export function useAlarmEngine(now: Date, soundReady: boolean) {
  const runtime = useStore(runtimeStore)
  const [leader, setLeader] = useState(!hasWebLocks)
  const [ringing, setRinging] = useState<Occurrence | null>(null)
  const [remoteRinging, setRemoteRinging] = useState(false)
  const [resumeTrack, setResumeTrack] = useState<TrackId | null>(null)

  const ringingRef = useRef<Occurrence | null>(null)
  const ringStartedAt = useRef(0)
  const stopToneRef = useRef<(() => void) | null>(null)
  const musicWas = useRef<TrackId | null>(null)
  const lastChecked = useRef(runtimeStore.get().lastCheckedAt)
  const lastPersistedCheck = useRef(0)

  useEffect(() => startLeadership(setLeader), [])

  useEffect(
    () =>
      onMessage((m) => {
        if (m.tabId === TAB_ID) return
        if (m.type === 'ringing') setRemoteRinging(true)
        if (m.type === 'ring-ended') setRemoteRinging(false)
      }),
    [],
  )

  const updateRuntime = (fn: (r: Runtime) => Runtime) => runtimeStore.set(fn)

  const silence = useCallback(() => {
    stopToneRef.current?.()
    stopToneRef.current = null
  }, [])

  /** Ends the ringing occurrence: stop, snooze, or auto-stop (recorded as missed). */
  const finish = useCallback(
    (how: 'stop' | 'snooze' | 'timeout') => {
      const occ = ringingRef.current
      if (!occ) return
      silence()
      ringingRef.current = null
      setRinging(null)
      const t = Date.now()
      updateRuntime((r) => ({
        ...r,
        queue: r.queue.filter((q) => q.occurrenceId !== occ.occurrenceId),
        claim: null,
        snoozes:
          how === 'snooze'
            ? [...r.snoozes, (() => {
                const at = t + settingsStore.get().snoozeMinutes * 60_000
                return { occurrenceId: snoozeId(occ.alarmId, at), alarmId: occ.alarmId, label: occ.label, at }
              })()]
            : r.snoozes,
        missed: how === 'timeout' ? [...r.missed, occ].slice(-MISSED_CAP) : r.missed,
      }))
      broadcast({ type: 'ring-ended', tabId: TAB_ID, occurrenceId: occ.occurrenceId })
    },
    [silence],
  )

  // Lost leadership mid-ring: go quiet at once and release the claim so the
  // new leader carries on ringing from the persisted queue.
  useEffect(() => {
    if (leader || !ringingRef.current) return
    silence()
    ringingRef.current = null
    setRinging(null)
    updateRuntime((r) => ({ ...r, claim: null }))
  }, [leader, silence])

  // Scheduler: every tick in the leader tab.
  useEffect(() => {
    if (!leader) return
    const t = now.getTime()
    const rt = runtimeStore.get()
    const alarms = alarmsStore.get()
    const res = evaluate(alarms, rt.snoozes, rt.handled, lastChecked.current, t)
    lastChecked.current = t

    const touched = res.due.length + res.missed.length > 0 || res.snoozesLeft.length !== rt.snoozes.length
    if (touched) {
      const handled = { ...rt.handled }
      for (const o of [...res.due, ...res.missed]) handled[o.occurrenceId] = t
      runtimeStore.set({
        ...rt,
        handled: pruneHandled(handled, t),
        queue: [...rt.queue, ...res.due],
        missed: [...rt.missed, ...res.missed].slice(-MISSED_CAP),
        snoozes: res.snoozesLeft,
        lastCheckedAt: t,
      })
      // One-time alarms are spent once their occurrence has been handled.
      const spent = new Set([...res.due, ...res.missed].map((o) => o.alarmId))
      if (alarms.some((a) => spent.has(a.id) && a.days.length === 0 && a.enabled)) {
        alarmsStore.set((xs) => xs.map((a) => (spent.has(a.id) && a.days.length === 0 ? { ...a, enabled: false, updatedAt: t } : a)))
      }
      lastPersistedCheck.current = t
    } else if (t - lastPersistedCheck.current > 60_000) {
      runtimeStore.set({ ...rt, lastCheckedAt: t })
      lastPersistedCheck.current = t
    }

    const cur = ringingRef.current
    if (cur) {
      if (t - ringStartedAt.current > AUTO_STOP_MS) finish('timeout')
      else if (t - (runtimeStore.get().claim?.claimedAt ?? 0) > 10_000) {
        updateRuntime((r) => ({ ...r, claim: { occurrenceId: cur.occurrenceId, tabId: TAB_ID, claimedAt: t } }))
      }
    }
  }, [now, leader, finish])

  // Start ringing the head of the queue.
  useEffect(() => {
    if (!leader || ringingRef.current) return
    const head = runtime.queue[0]
    if (!head) {
      if (musicWas.current) {
        setResumeTrack(musicWas.current)
        musicWas.current = null
      }
      return
    }
    const t = Date.now()
    const claim = runtime.claim
    // Without Web Locks the claim is the only guard against double rings.
    if (!hasWebLocks && claim && claim.occurrenceId === head.occurrenceId && claim.tabId !== TAB_ID && t - claim.claimedAt < CLAIM_FRESH_MS) return
    updateRuntime((r) => ({ ...r, claim: { occurrenceId: head.occurrenceId, tabId: TAB_ID, claimedAt: t } }))
    broadcast({ type: 'ringing', tabId: TAB_ID, occurrenceId: head.occurrenceId })

    const track = playingTrack()
    if (track) {
      musicWas.current = track
      stopTrack(2)
    }
    ringingRef.current = head
    ringStartedAt.current = t
    setRinging(head)
    setResumeTrack(null)

    if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
      const time = new Date(head.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
      new Notification(head.label || 'Alarm', { body: `CHRONO · ${time}`, tag: head.occurrenceId })
    }
  }, [leader, runtime.queue, runtime.claim])

  // Tone follows ringing + audio availability (starts once sound is unlocked).
  useEffect(() => {
    if (!ringing || !soundReady || stopToneRef.current) return
    const alarm = alarmsStore.get().find((a) => a.id === ringing.alarmId)
    stopToneRef.current = startTone(alarm?.toneId ?? settingsStore.get().defaultTone)
  }, [ringing, soundReady])

  useEffect(() => () => stopToneRef.current?.(), [])

  return {
    leader,
    ringing,
    queueAfter: Math.max(0, runtime.queue.length - (ringing ? 1 : 0)),
    remoteRinging: remoteRinging && !ringing,
    missed: runtime.missed,
    snoozes: runtime.snoozes,
    resumeTrack,
    clearResume: () => setResumeTrack(null),
    snooze: () => finish('snooze'),
    stop: () => finish('stop'),
    dismissMissed: (id?: string) => updateRuntime((r) => ({ ...r, missed: id ? r.missed.filter((m) => m.occurrenceId !== id) : [] })),
  }
}
