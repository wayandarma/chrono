import { motion } from 'motion/react'
import { useEffect, useRef, type KeyboardEvent } from "react"
import { daysLabel, type Occurrence } from '../lib/schedule'
import { alarmsStore, settingsStore } from '../state'

type Props = { occurrence: Occurrence; queueAfter: number; accent: string; soundReady: boolean; onSnooze: () => void; onStop: () => void }

/** Full-viewport alarm takeover: focus moves in, Tab stays inside, focus returns after. */
export function RingingScreen({ occurrence, queueAfter, accent, soundReady, onSnooze, onStop }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const alarm = alarmsStore.get().find((a) => a.id === occurrence.alarmId)
  const snoozeMinutes = settingsStore.get().snoozeMinutes
  const time = new Date(occurrence.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    return () => before?.focus?.()
  }, [])

  const trapTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const items = ref.current?.querySelectorAll<HTMLElement>('button')
    if (!items?.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <motion.div
      ref={ref}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="ring-title"
      aria-describedby="ring-desc"
      onKeyDown={trapTab}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="absolute inset-0 z-30 flex flex-col justify-center bg-[oklch(0.06_0.008_250/.95)] px-[clamp(20px,7vw,120px)] text-[oklch(0.95_0.015_85)]"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(60% 60% at 30% 50%, color-mix(in oklch, ${accent}, transparent 78%), transparent)` }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <p className="relative text-[15px] font-semibold tracking-[0.12em] uppercase" style={{ color: accent }}>
        {occurrence.occurrenceId.includes('@snooze@') ? 'Snoozed alarm' : 'Alarm'}
      </p>
      <motion.h2
        id="ring-title"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative mt-2 text-[clamp(64px,11vw,168px)] leading-[0.95] italic [font-family:var(--font-instrument)]"
      >
        {occurrence.label || 'Alarm'}
      </motion.h2>
      <p id="ring-desc" className="relative mt-4 text-[clamp(28px,4vw,48px)]">
        <span className="digits-condensed">{time}</span>
        <span className="text-[0.45em] text-[oklch(0.78_0.015_80)]">
          {alarm ? ` · ${daysLabel(alarm.days)}` : ''}
          {queueAfter ? ` · ${queueAfter} more waiting` : ''}
        </span>
      </p>

      {!soundReady && (
        <p className="soft-pulse relative mt-6 w-fit rounded-full border border-current px-4 py-2 text-[14px] font-semibold" style={{ color: accent }}>
          Tap anywhere to enable alarm sound
        </p>
      )}

      <div className="relative mt-12 flex flex-wrap items-center gap-4">
        <button
          autoFocus
          onClick={onSnooze}
          className="min-h-14 rounded-full px-10 text-[17px] font-semibold text-[var(--on-accent)] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white"
          style={{ background: accent }}
        >
          Snooze {snoozeMinutes} min
        </button>
        <button
          onClick={onStop}
          className="min-h-14 rounded-full border-2 border-[oklch(0.95_0.015_85/.6)] px-9 text-[17px] font-semibold hover:bg-white/10 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          Stop
        </button>
      </div>
      <p className="relative mt-6 text-[13px] text-[oklch(0.78_0.015_80)]">Space snoozes · Tab moves to Stop</p>
    </motion.div>
  )
}
