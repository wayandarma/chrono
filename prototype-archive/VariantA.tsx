// PROTOTYPE — Variant A "Instrument": CHRONO as a physical desk object.
// Light, warm, tactile. The clock is a device in a sunlit room; controls are
// hardware keys on its plinth; panels are a paper drawer that slides out.
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { VariantProps } from './PrototypeApp'
import {
  FlipChar, SCENES, STUB_ALARMS, SrTime, TRACKS, clockParts, daysLabel, nextAlarm, useKeys, useNow,
} from './shared'

export const name = 'Instrument'

type Panel = 'alarms' | 'scene' | 'sound' | 'style' | null

const css = `
.va { --paper: oklch(0.945 0.018 80); --ink: oklch(0.27 0.02 50); --ink-soft: oklch(0.46 0.025 55);
  --ember: oklch(0.6 0.16 42); --enamel: oklch(0.905 0.022 78); --card: oklch(0.235 0.014 52); }
.va-room { background:
  radial-gradient(120% 80% at 20% 0%, oklch(0.985 0.03 85) 0%, transparent 60%),
  linear-gradient(170deg, var(--paper), oklch(0.89 0.025 70)); }
.va-light { position:absolute; inset:-20%; pointer-events:none; mix-blend-mode:soft-light;
  background: repeating-linear-gradient(115deg, transparent 0 9%, oklch(1 0.03 85 / .7) 9% 16%, transparent 16% 24%);
  filter: blur(28px); animation: va-drift 40s ease-in-out infinite alternate; }
@keyframes va-drift { to { transform: translate3d(6%, 3%, 0) rotate(2deg); } }
.va-flip { --flip-w: .74em; --flip-h: 1.08em; --flip-radius: .06em; --flip-bg: var(--card);
  --flip-bg-bottom: oklch(0.21 0.013 52); --flip-fg: oklch(0.95 0.02 85); --flip-gap: .014em;
  --flip-dur: 640ms; font-family: var(--font-archivo); font-variation-settings: 'wdth' 70; font-weight: 700;
  box-shadow: 0 .02em 0 oklch(1 0 0 / .08) inset, 0 .03em .06em oklch(0.1 0.02 50 / .5); border-radius: var(--flip-radius); }
.va-housing { background: linear-gradient(180deg, oklch(0.93 0.022 80), var(--enamel) 40%, oklch(0.86 0.025 74));
  box-shadow: 0 1px 0 oklch(1 0 0 / .9) inset, 0 -2px 0 oklch(0.7 0.03 60 / .5) inset,
    0 30px 60px -20px oklch(0.35 0.05 50 / .45), 0 8px 18px -8px oklch(0.35 0.05 50 / .35); }
.va-window { background: oklch(0.17 0.012 50);
  box-shadow: 0 3px 6px oklch(0 0 0 / .55) inset, 0 -1px 0 oklch(1 0 0 / .5); }
.va-key { background: linear-gradient(180deg, oklch(0.97 0.012 82), oklch(0.88 0.02 76));
  box-shadow: 0 1px 0 oklch(1 0 0) inset, 0 3px 0 oklch(0.72 0.03 62), 0 6px 12px -4px oklch(0.35 0.05 50 / .4);
  transition: transform 120ms var(--ease-out-quart), box-shadow 120ms var(--ease-out-quart); }
.va-key:active, .va-key[aria-pressed=true] { transform: translateY(2px);
  box-shadow: 0 1px 0 oklch(1 0 0) inset, 0 1px 0 oklch(0.72 0.03 62), 0 2px 6px -3px oklch(0.35 0.05 50 / .4); }
.va-drawer { background:
  repeating-linear-gradient(to bottom, transparent 0 39px, oklch(0.6 0.04 240 / .16) 39px 40px), var(--paper); }
.va-ring { animation: va-tremble 900ms ease-in-out infinite; }
@keyframes va-tremble { 0%,100% { transform: rotate(0) } 25% { transform: rotate(-.6deg) } 75% { transform: rotate(.6deg) } }
@media (prefers-reduced-motion: reduce) { .va-light, .va-ring { animation: none } }
`

export function VariantA({ ringing, onRingEnd }: VariantProps) {
  const now = useNow()
  const { hh, mm, ss, meridiem, twelve } = clockParts(now)
  const [alarms, setAlarms] = useState(STUB_ALARMS)
  const [panel, setPanel] = useState<Panel>(null)
  const [immersive, setImmersive] = useState(false)
  const [reveal, setReveal] = useState(true)
  const [scene, setScene] = useState(SCENES[0])
  const [track, setTrack] = useState<string | null>(null)
  const hideT = useRef(0)
  const next = nextAlarm(alarms, now)

  // Immersive: controls reveal for 3s on input.
  useEffect(() => {
    if (!immersive) return setReveal(true)
    const poke = () => {
      setReveal(true)
      clearTimeout(hideT.current)
      hideT.current = window.setTimeout(() => setReveal(false), 3000)
    }
    poke()
    window.addEventListener('pointermove', poke)
    window.addEventListener('keydown', poke)
    return () => {
      window.removeEventListener('pointermove', poke)
      window.removeEventListener('keydown', poke)
    }
  }, [immersive])

  const toggle = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p))
  useKeys(
    ringing
      ? { ' ': onRingEnd, escape: () => {} }
      : { i: () => setImmersive((v) => !v), a: () => toggle('alarms'), s: () => toggle('scene'), t: () => toggle('style'), m: () => setTrack((t) => (t ? null : TRACKS[0])), escape: () => setPanel(null) },
    [ringing],
  )

  const controlsShown = !immersive || reveal
  const date = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="va va-room relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 pb-24 pt-10 text-[var(--ink)] [font-family:var(--font-manrope)]">
      <style>{css}</style>
      <div className="va-light" />
      <SrTime now={now} />

      {/* Device */}
      <motion.div
        animate={{ scale: immersive ? 1.12 : 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className={`relative ${ringing ? 'va-ring' : ''}`}
      >
        <div className="va-housing rounded-[2.2rem] p-[clamp(10px,1.6vw,18px)]">
          <div className="va-window flex flex-col items-center gap-[0.06em] rounded-[1.5rem] px-[0.14em] py-[0.12em] text-[clamp(88px,21vw,260px)] leading-none portrait:max-sm:text-[clamp(110px,40vw,220px)] sm:flex-row sm:gap-[0.12em]">
            <div className="flex gap-[0.04em]">
              <FlipChar value={hh[0]} className="va-flip" />
              <FlipChar value={hh[1]} className="va-flip" />
            </div>
            <div className="flex gap-[0.04em]">
              <FlipChar value={mm[0]} className="va-flip" />
              <FlipChar value={mm[1]} className="va-flip" />
            </div>
          </div>
          {/* seconds sweep + meridiem, engraved into the housing lip */}
          <div className="mt-3 flex items-center gap-3 px-2 text-[11px] font-semibold tracking-[0.2em] text-[var(--ink-soft)] uppercase">
            <span>{twelve ? meridiem : '24h'}</span>
            <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-[oklch(0.78_0.025_70)]">
              <div className="absolute inset-y-0 left-0 bg-[var(--ember)] transition-[width] duration-1000 ease-linear" style={{ width: `${(Number(ss) / 59) * 100}%` }} />
            </div>
            <span className="tabular-nums">{ss}</span>
          </div>
        </div>
      </motion.div>

      {/* Plinth: date, next alarm, hardware keys */}
      <motion.div
        inert={!controlsShown}
        animate={{ opacity: controlsShown ? 1 : 0, y: controlsShown ? 0 : 12 }}
        transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
        className="mt-[clamp(28px,5vh,56px)] flex flex-col items-center gap-5"
      >
        <div className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1">
          <p className="text-[clamp(22px,2.6vw,30px)] italic [font-family:var(--font-instrument)]">{date}</p>
          {next ? (
            <button onClick={() => setPanel('alarms')} className="group flex items-center gap-2 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ember)]" />
              {next.alarm.label} at {next.alarm.time} · in {next.inLabel}
            </button>
          ) : (
            <span className="text-sm text-[var(--ink-soft)]">Alarms paused</span>
          )}
        </div>

        <nav aria-label="Controls" className="flex items-end gap-[clamp(10px,2.4vw,22px)]">
          {(
            [
              ['alarms', 'Alarms', 'A'],
              ['scene', 'Scene', 'S'],
              ['sound', 'Sound', 'M'],
              ['style', 'Style', 'T'],
            ] as const
          ).map(([id, label, key]) => (
            <Key key={id} label={label} hint={key} pressed={panel === id} led={id === 'sound' && !!track} onClick={() => toggle(id)} />
          ))}
          <Key label={immersive ? 'Exit' : 'Immerse'} hint="I" pressed={immersive} onClick={() => setImmersive((v) => !v)} />
        </nav>
      </motion.div>

      <p className="absolute left-5 top-5 text-[11px] font-semibold tracking-[0.3em] text-[var(--ink-soft)] uppercase">
        Chrono <span className="font-normal tracking-normal normal-case opacity-70">— {scene}</span>
      </p>

      {/* Paper drawer */}
      <AnimatePresence>
        {panel && !ringing && (
          <motion.section
            key="drawer"
            role="dialog"
            aria-label={panel}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="va-drawer fixed inset-x-0 bottom-0 z-20 mx-auto max-h-[70dvh] w-full max-w-xl overflow-auto rounded-t-[1.6rem] px-6 pb-16 pt-4 shadow-[0_-20px_50px_-20px_oklch(0.3_0.05_50/.45)]"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[oklch(0.75_0.03_65)]" />
            <div className="flex items-baseline justify-between">
              <h2 className="text-4xl capitalize italic [font-family:var(--font-instrument)]">{panel}</h2>
              <button onClick={() => setPanel(null)} className="text-sm text-[var(--ink-soft)] underline-offset-4 hover:underline">Close</button>
            </div>

            {panel === 'alarms' && (
              <ul className="mt-4">
                {alarms.map((a) => (
                  <li key={a.id} className="flex h-20 items-center gap-4 border-b border-[oklch(0.6_0.04_240/.2)]">
                    <span className={`text-5xl font-bold tabular-nums [font-family:var(--font-archivo)] [font-variation-settings:'wdth'_70] ${a.enabled ? '' : 'opacity-35'}`}>{a.time}</span>
                    <span className="flex-1 leading-tight">
                      <span className="block text-xl italic [font-family:var(--font-instrument)]">{a.label}</span>
                      <span className="text-xs tracking-wide text-[var(--ink-soft)] uppercase">{daysLabel(a.days)}</span>
                    </span>
                    <Switch on={a.enabled} label={`${a.label} enabled`} onChange={() => setAlarms((xs) => xs.map((x) => (x.id === a.id ? { ...x, enabled: !x.enabled } : x)))} />
                  </li>
                ))}
                <li className="pt-4">
                  <button className="text-[var(--ember)] underline-offset-4 hover:underline">+ New alarm</button>
                </li>
              </ul>
            )}
            {panel === 'scene' && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {SCENES.map((s, i) => (
                  <button key={s} onClick={() => setScene(s)} className={`aspect-[4/3] rounded-xl p-2 text-left text-xs font-semibold text-white ring-offset-2 ring-offset-[var(--paper)] ${scene === s ? 'ring-2 ring-[var(--ember)]' : ''}`}
                    style={{ background: `linear-gradient(160deg, oklch(0.55 0.08 ${40 + i * 50}), oklch(0.3 0.06 ${60 + i * 50}))` }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {panel === 'sound' && (
              <ul className="mt-4">
                {TRACKS.map((t) => (
                  <li key={t} className="flex h-10 items-center border-b border-[oklch(0.6_0.04_240/.2)]">
                    <button onClick={() => setTrack((c) => (c === t ? null : t))} className="flex w-full items-center gap-3 text-left">
                      <span className="w-5 text-[var(--ember)]">{track === t ? '❚❚' : '▶'}</span>
                      <span className={track === t ? 'font-semibold' : ''}>{t}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {panel === 'style' && (
              <div className="mt-4 flex flex-wrap gap-3">
                {['Paper', 'Midnight', 'Ember', 'Mono', 'Neon'].map((t) => (
                  <button key={t} className={`rounded-full border px-4 py-2 text-sm ${t === 'Paper' ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]' : 'border-[oklch(0.7_0.03_65)]'}`}>{t}</button>
                ))}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Ringing */}
      <AnimatePresence>
        {ringing && (
          <motion.div
            role="alertdialog"
            aria-label={`Alarm: ${STUB_ALARMS[0].label}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex flex-col items-center justify-end gap-6 bg-[oklch(0.6_0.16_42/.18)] pb-24 backdrop-blur-[2px]"
          >
            <p className="text-[clamp(40px,6vw,72px)] italic [font-family:var(--font-instrument)]">{STUB_ALARMS[0].label}</p>
            <div className="flex items-center gap-6">
              <button autoFocus onClick={onRingEnd} className="rounded-full bg-[var(--ember)] px-10 py-5 text-lg font-semibold text-[oklch(0.98_0.01_80)] shadow-[0_10px_30px_-10px_oklch(0.5_0.16_42)] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink)]">
                Snooze · 9 min
              </button>
              <button onClick={onRingEnd} className="rounded-full border border-[var(--ink)] px-7 py-5 font-semibold focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink)]">Stop</button>
            </div>
            <p className="text-xs text-[var(--ink-soft)]">+1 more after this</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Key({ label, hint, pressed, led, onClick }: { label: string; hint: string; pressed: boolean; led?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={pressed} aria-keyshortcuts={hint} className="group flex flex-col items-center gap-2 focus-visible:outline-none">
      <span className="va-key relative grid h-[clamp(44px,6vw,56px)] w-[clamp(44px,6vw,56px)] place-items-center rounded-full group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-[var(--ember)]">
        <span className={`h-1.5 w-1.5 rounded-full transition-colors ${pressed || led ? 'bg-[var(--ember)] shadow-[0_0_8px_var(--ember)]' : 'bg-[oklch(0.75_0.02_70)]'}`} />
      </span>
      <span className="text-[10px] font-semibold tracking-[0.18em] text-[var(--ink-soft)] uppercase">{label}</span>
    </button>
  )
}

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: () => void }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onChange}
      className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${on ? 'bg-[var(--ember)]' : 'bg-[oklch(0.8_0.02_70)]'}`}>
      <span className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-[oklch(0.98_0.01_80)] shadow transition-transform duration-300 ease-[var(--ease-out-quart)] ${on ? 'translate-x-5' : ''}`} />
    </button>
  )
}
