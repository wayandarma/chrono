import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { TONES, startTone } from '../../lib/audio'
import { daysLabel, onceDateFor, type Alarm, type ToneId } from '../../lib/schedule'
import { useStore } from '../../lib/store'
import { alarmsStore, settingsStore } from '../../state'
import { Chip, Note, Switch } from '../ui'

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const PRESETS: [string, number[]][] = [
  ['Once', []],
  ['Weekdays', [1, 2, 3, 4, 5]],
  ['Weekends', [0, 6]],
  ['Every day', [0, 1, 2, 3, 4, 5, 6]],
]

type Props = { leader: boolean }

export function AlarmsPanel({ leader }: Props) {
  const alarms = useStore(alarmsStore)
  const [editing, setEditing] = useState<Alarm | 'new' | null>(null)

  const toggle = (a: Alarm) =>
    alarmsStore.set((xs) =>
      xs.map((x) => {
        if (x.id !== a.id) return x
        const enabled = !x.enabled
        // Re-enabling a one-time alarm schedules it for its next time.
        return { ...x, enabled, onceDate: x.days.length === 0 && enabled ? onceDateFor(x.time, new Date()) : x.onceDate, updatedAt: Date.now() }
      }),
    )

  if (editing) {
    return (
      <AlarmEditor
        initial={editing === 'new' ? null : editing}
        onDone={() => setEditing(null)}
      />
    )
  }

  const sorted = [...alarms].sort((a, b) => a.time.localeCompare(b.time))
  return (
    <div>
      {sorted.length === 0 ? (
        <p className="py-10 text-[17px] text-[var(--muted)]">No alarms set.</p>
      ) : (
        <ul>
          {sorted.map((a) => (
            <li key={a.id} className="flex items-center gap-4 border-b border-[var(--line)] py-4">
              <button
                onClick={() => setEditing(a)}
                className={`flex flex-1 items-center gap-4 text-left transition-opacity ${a.enabled ? '' : 'opacity-45'}`}
                aria-label={`Edit ${a.label || 'alarm'} at ${a.time}, ${daysLabel(a.days)}`}
              >
                <span className="digits-condensed text-[44px] leading-none">{a.time}</span>
                <span className="leading-tight">
                  <span className="block text-[21px] italic [font-family:var(--font-instrument)]">{a.label || 'Alarm'}</span>
                  <span className="text-[12px] font-semibold tracking-[0.1em] text-[var(--muted)] uppercase">{daysLabel(a.days)}</span>
                </span>
              </button>
              <Switch on={a.enabled} label={`${a.label || 'Alarm'} at ${a.time}`} onChange={() => toggle(a)} />
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => setEditing('new')}
        className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full border-2 border-[var(--accent)] text-[15px] font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--on-accent)]"
      >
        + New alarm
      </button>

      {alarms.length > 0 && <NotificationsOffer />}

      <Note>
        {leader ? (
          <>
            <span className="font-semibold text-[var(--fg)]">Alarms active — keep CHRONO open.</span> Browsers can't wake a closed tab, so
            alarms only ring while this page is open.
          </>
        ) : (
          <>Alarms are handled in another CHRONO tab. Close it, or bring this one to the front to take over.</>
        )}
      </Note>
    </div>
  )
}

function NotificationsOffer() {
  const supported = 'Notification' in window
  const [perm, setPerm] = useState(supported ? Notification.permission : 'denied')
  if (!supported) return null
  if (perm === 'granted') return <Note>Notifications on — shown when an alarm rings while this tab is in the background.</Note>
  if (perm === 'denied') return <Note>Notifications off. You can change this in your browser's site settings.</Note>
  return (
    <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-[var(--line)] p-4">
      <span className="text-[14px] leading-snug">
        Show a notification when an alarm rings in a background tab?
        <span className="block text-[12px] text-[var(--muted)]">It won't make alarms ring when CHRONO is closed.</span>
      </span>
      <button onClick={() => void Notification.requestPermission().then(setPerm)} className="min-h-11 shrink-0 rounded-full border border-[var(--accent)] px-4 text-[14px] font-semibold text-[var(--accent)]">
        Enable notifications
      </button>
    </div>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')

function AlarmEditor({ initial, onDone }: { initial: Alarm | null; onDone: () => void }) {
  const defaultTone = settingsStore.get().defaultTone
  const soon = new Date(Date.now() + 60_000)
  const [time, setTime] = useState(initial?.time ?? `${pad(soon.getHours())}:${pad(soon.getMinutes())}`)
  const [label, setLabel] = useState(initial?.label ?? '')
  const [days, setDays] = useState<number[]>(initial?.days ?? [])
  const [tone, setTone] = useState<ToneId>(initial?.toneId ?? defaultTone)
  const preview = useRef<(() => void) | null>(null)

  useEffect(() => () => preview.current?.(), [])

  const playPreview = () => {
    preview.current?.()
    const stop = startTone(tone, 0, 0.5)
    preview.current = stop
    setTimeout(stop, 2600)
  }
  const toggleDay = (d: number) => setDays((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d].sort()))

  const save = () => {
    const now = Date.now()
    const alarm: Alarm = {
      id: initial?.id ?? crypto.randomUUID(),
      label: label.trim(),
      time,
      days,
      toneId: tone,
      enabled: true,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
      onceDate: days.length === 0 ? onceDateFor(time, new Date(now)) : undefined,
    }
    alarmsStore.set((xs) => (xs.some((x) => x.id === alarm.id) ? xs.map((x) => (x.id === alarm.id ? alarm : x)) : [...xs, alarm]))
    onDone()
  }

  const field = 'mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-4 text-[var(--fg)] outline-none focus:border-[var(--accent)]'

  return (
    <motion.form
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      onSubmit={(e) => {
        e.preventDefault()
        if (time) save()
      }}
      className="flex flex-col gap-6 pt-4"
    >
      <p className="text-[15px] font-semibold">{initial ? 'Edit alarm' : 'New alarm'}</p>
      <label className="block">
        <span className="legend">Time</span>
        <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={`${field} digits-condensed h-20 text-[48px]`} />
      </label>
      <label className="block">
        <span className="legend">Label</span>
        <input type="text" value={label} maxLength={40} placeholder="Wake up" onChange={(e) => setLabel(e.target.value)} className={`${field} h-12 text-[16px]`} />
      </label>
      <fieldset>
        <legend className="legend">Repeat</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map(([name, ds]) => (
            <Chip key={name} on={ds.join() === days.join()} onClick={() => setDays(ds)}>
              {name}
            </Chip>
          ))}
        </div>
        <div className="mt-3 flex justify-between gap-1">
          {DAY_ORDER.map((d) => (
            <button
              type="button"
              key={d}
              aria-pressed={days.includes(d)}
              aria-label={DAY_FULL[d]}
              onClick={() => toggleDay(d)}
              className={`grid h-11 w-11 place-items-center rounded-full text-[14px] font-semibold ${
                days.includes(d) ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'border border-[var(--line)] text-[var(--muted)] hover:text-[var(--fg)]'
              }`}
            >
              {DAY_SHORT[d]}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <span className="legend">Sound</span>
        <div className="mt-2 flex gap-2">
          <select value={tone} onChange={(e) => setTone(e.target.value as ToneId)} aria-label="Alarm sound" className={`${field} mt-0 h-12 flex-1 text-[16px] [&>option]:bg-[var(--bar)]`}>
            {TONES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={playPreview} className="min-h-12 rounded-xl border border-[var(--line)] px-4 text-[14px] font-semibold hover:border-[var(--muted)]">
            ▶ Preview
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="min-h-12 rounded-full bg-[var(--accent)] px-8 text-[15px] font-semibold text-[var(--on-accent)]">
          Save
        </button>
        <button type="button" onClick={onDone} className="min-h-12 px-4 text-[15px] font-semibold text-[var(--muted)] hover:text-[var(--fg)]">
          Cancel
        </button>
        <span className="flex-1" />
        {initial && (
          <button
            type="button"
            onClick={() => {
              alarmsStore.set((xs) => xs.filter((x) => x.id !== initial.id))
              onDone()
            }}
            className="min-h-12 px-2 text-[15px] font-semibold text-[oklch(0.7_0.16_25)]"
          >
            Delete
          </button>
        )}
      </div>
    </motion.form>
  )
}
