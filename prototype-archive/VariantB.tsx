// PROTOTYPE — Variant B "Cinema": CHRONO as a film frame.
// Full-bleed scene, letterbox bars carrying the chrome, a typographic menu
// instead of icons, serif digits set like an opening title, and panels as an
// editorial column. Immersive mode = the letterbox opens up.
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { VariantProps } from './PrototypeApp'
import {
  FlipChar, SCENES, STUB_ALARMS, SrTime, TRACKS, clockParts, daysLabel, nextAlarm, useKeys, useNow,
} from './shared'

export const name = 'Cinema'
export const switcherBottom = 'calc(clamp(44px, 9vh, 92px) + 10px)'

type Panel = 'alarms' | 'scene' | 'sound' | 'style' | null

const css = `
.vb { --ink: oklch(0.08 0.008 250); --ivory: oklch(0.94 0.02 85); --muted: oklch(0.72 0.02 80);
  --sodium: oklch(0.78 0.14 68); }
.vb-scene { position:absolute; inset:0; overflow:hidden;
  background: linear-gradient(180deg, oklch(0.2 0.03 235), oklch(0.13 0.02 245) 60%, oklch(0.1 0.015 250)); }
.vb-bokeh { position:absolute; inset:-10%; filter: blur(22px); animation: vb-drift 60s ease-in-out infinite alternate;
  background:
    radial-gradient(circle at 12% 62%, oklch(0.8 0.14 68 / .55) 0 2.2%, transparent 2.6%),
    radial-gradient(circle at 22% 70%, oklch(0.75 0.12 60 / .4) 0 3%, transparent 3.5%),
    radial-gradient(circle at 38% 58%, oklch(0.9 0.05 85 / .35) 0 1.6%, transparent 2%),
    radial-gradient(circle at 55% 66%, oklch(0.78 0.14 68 / .5) 0 2.6%, transparent 3%),
    radial-gradient(circle at 63% 52%, oklch(0.7 0.13 25 / .45) 0 1.8%, transparent 2.2%),
    radial-gradient(circle at 74% 72%, oklch(0.8 0.14 68 / .4) 0 3.4%, transparent 3.9%),
    radial-gradient(circle at 86% 60%, oklch(0.9 0.04 200 / .3) 0 2%, transparent 2.4%),
    radial-gradient(circle at 93% 75%, oklch(0.78 0.14 68 / .5) 0 2.4%, transparent 2.8%),
    radial-gradient(60% 30% at 50% 80%, oklch(0.5 0.1 60 / .25), transparent); }
@keyframes vb-drift { to { transform: translate3d(-4%, -2%, 0) scale(1.05); } }
.vb-rain { position:absolute; inset:-50% 0 0 0; opacity:.22;
  background: repeating-linear-gradient(100deg, transparent 0 46px, oklch(0.9 0.02 230 / .5) 46px 47px, transparent 47px 91px);
  animation: vb-rain 0.9s linear infinite; }
@keyframes vb-rain { to { transform: translate3d(-24px, 50%, 0); } }
.vb-vignette { position:absolute; inset:0; background: radial-gradient(120% 90% at 40% 50%, transparent 40%, oklch(0.05 0.01 250 / .75)); }
.vb-flip { --flip-w: .66em; --flip-h: 1.02em; --flip-radius: .035em; --flip-bg: oklch(0.13 0.012 245 / .78);
  --flip-bg-bottom: oklch(0.11 0.012 245 / .82); --flip-fg: var(--ivory); --flip-gap: .008em; --flip-dur: 760ms;
  font-family: var(--font-bodoni); font-weight: 500; font-optical-sizing: auto;
  box-shadow: 0 .04em .12em oklch(0 0 0 / .5); border-radius: var(--flip-radius); }
.vb-link { position: relative; }
.vb-link::after { content:''; position:absolute; left:0; right:0; bottom:-4px; height:1px; background: currentColor;
  transform: scaleX(0); transform-origin: left; transition: transform 400ms var(--ease-out-expo); }
.vb-link:hover::after, .vb-link[aria-pressed=true]::after, .vb-link:focus-visible::after { transform: scaleX(1); }
@media (prefers-reduced-motion: reduce) { .vb-bokeh, .vb-rain { animation: none } }
`

export function VariantB({ ringing, onRingEnd }: VariantProps) {
  const now = useNow()
  const { hh, mm, ss, meridiem, twelve } = clockParts(now)
  const [alarms, setAlarms] = useState(STUB_ALARMS)
  const [panel, setPanel] = useState<Panel>(null)
  const [immersive, setImmersive] = useState(false)
  const [reveal, setReveal] = useState(true)
  const [scene, setScene] = useState(SCENES[0])
  const [track, setTrack] = useState<string | null>(TRACKS[0])
  const hideT = useRef(0)
  const next = nextAlarm(alarms, now)

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
      ? { ' ': onRingEnd }
      : { i: () => setImmersive((v) => !v), a: () => toggle('alarms'), s: () => toggle('scene'), t: () => toggle('style'), m: () => setTrack((t) => (t ? null : TRACKS[0])), escape: () => setPanel(null) },
    [ringing],
  )

  const barsShown = !immersive || reveal
  const date = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  const bar = 'clamp(44px, 9vh, 92px)'

  return (
    <div className="vb relative h-dvh overflow-hidden text-[var(--ivory)] [font-family:var(--font-manrope)]">
      <style>{css}</style>
      <SrTime now={now} />
      <div className="vb-scene" aria-hidden>
        <div className="vb-bokeh" />
        <div className="vb-rain" />
        <div className="vb-vignette" />
      </div>

      {/* Title-card clock, set low-left like an opening credit */}
      <motion.div
        animate={{ y: immersive ? '-4vh' : 0, scale: immersive ? 1.06 : 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: 'left bottom' }}
        className="absolute bottom-[calc(clamp(44px,9vh,92px)+6vh)] left-[clamp(16px,7vw,120px)] right-4"
      >
        <p className="mb-3 text-[clamp(18px,2vw,26px)] italic [font-family:var(--font-instrument)] text-[var(--muted)]">{date}</p>
        <div className="flex flex-col items-start leading-none sm:flex-row sm:items-end sm:gap-[0.1em] text-[clamp(96px,17vw,250px)] portrait:max-sm:text-[clamp(120px,38vw,210px)]">
          <div className="flex gap-[0.03em]">
            <FlipChar value={hh[0]} className="vb-flip" />
            <FlipChar value={hh[1]} className="vb-flip" />
          </div>
          <div className="flex gap-[0.03em] max-sm:mt-[0.05em]">
            <FlipChar value={mm[0]} className="vb-flip" />
            <FlipChar value={mm[1]} className="vb-flip" />
          </div>
          <div className="flex items-baseline gap-2 pb-[0.06em] text-[0.16em] max-sm:mt-2">
            <span className="w-[1.2em] overflow-hidden italic [font-family:var(--font-bodoni)] tabular-nums">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={ss} className="block" initial={{ y: '-100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}>
                  {ss}
                </motion.span>
              </AnimatePresence>
            </span>
            {twelve && <span className="text-[0.55em] tracking-[0.3em] text-[var(--muted)]">{meridiem}</span>}
          </div>
        </div>
      </motion.div>

      {/* Letterbox — top */}
      <motion.header
        inert={!barsShown}
        animate={{ y: barsShown ? 0 : '-100%' }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-x-0 top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-[var(--ink)] px-[clamp(16px,4vw,48px)] text-[11px] tracking-[0.32em] uppercase"
        style={{ height: bar }}
      >
        <span className="font-semibold">Chrono</span>
        <span className="text-[15px] tracking-normal normal-case italic [font-family:var(--font-instrument)] text-[var(--muted)] max-sm:hidden">{scene}</span>
        <button onClick={() => setPanel('alarms')} className="vb-link justify-self-end text-right text-[var(--muted)] hover:text-[var(--ivory)]">
          {next ? <>{next.alarm.label} · {next.alarm.time} <span className="text-[var(--sodium)]">in {next.inLabel}</span></> : 'Alarms paused'}
        </button>
      </motion.header>

      {/* Letterbox — bottom: typographic menu */}
      <motion.nav
        inert={!barsShown}
        aria-label="Controls"
        animate={{ y: barsShown ? 0 : '100%' }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-[clamp(16px,3vw,40px)] overflow-x-auto bg-[var(--ink)] px-[clamp(16px,4vw,48px)] pb-8 text-[11px] font-semibold tracking-[0.32em] uppercase sm:pb-0"
        style={{ height: bar }}
      >
        {(['alarms', 'scene', 'sound', 'style'] as const).map((p) => (
          <button key={p} onClick={() => toggle(p)} aria-pressed={panel === p} className={`vb-link shrink-0 ${panel === p ? 'text-[var(--sodium)]' : 'text-[var(--ivory)]/80 hover:text-[var(--ivory)]'}`}>
            {p}
          </button>
        ))}
        <span className="flex-1" />
        {track && <span className="shrink-0 tracking-normal normal-case italic text-[14px] [font-family:var(--font-instrument)] text-[var(--muted)] max-sm:hidden">Now playing — {track}</span>}
        <button onClick={() => setImmersive((v) => !v)} aria-pressed={immersive} className="vb-link shrink-0 text-[var(--ivory)]/80 hover:text-[var(--ivory)]">
          {immersive ? 'Close frame' : 'Open frame'}
        </button>
      </motion.nav>

      {/* Editorial column */}
      <AnimatePresence>
        {panel && !ringing && (
          <motion.section
            key="col"
            role="dialog"
            aria-label={panel}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-y-0 left-0 z-20 w-[min(460px,100vw)] overflow-auto [scrollbar-color:oklch(0.3_0.01_250)_transparent] bg-[oklch(0.08_0.008_250/.97)] backdrop-blur-xl px-[clamp(20px,3vw,40px)] pb-20 pt-[clamp(44px,9vh,92px)]"
          >
            <div className="flex items-baseline justify-between border-b border-[var(--ivory)]/15 pb-4 pt-8">
              <h2 className="text-6xl capitalize italic [font-family:var(--font-instrument)]">{panel}</h2>
              <button onClick={() => setPanel(null)} className="vb-link text-[11px] font-semibold tracking-[0.3em] uppercase text-[var(--muted)]">Close</button>
            </div>

            {panel === 'alarms' && (
              <ol className="divide-y divide-[var(--ivory)]/10">
                {alarms.map((a) => (
                  <li key={a.id} className="flex items-end justify-between gap-4 py-5">
                    <div className={a.enabled ? '' : 'opacity-40'}>
                      <div className="text-6xl leading-none [font-family:var(--font-bodoni)] tabular-nums">{a.time}</div>
                      <div className="mt-2 text-lg italic [font-family:var(--font-instrument)]">{a.label} <span className="text-sm not-italic tracking-[0.2em] uppercase text-[var(--muted)] [font-family:var(--font-manrope)]">— {daysLabel(a.days)}</span></div>
                    </div>
                    <button role="switch" aria-checked={a.enabled} aria-label={`${a.label} enabled`} onClick={() => setAlarms((xs) => xs.map((x) => (x.id === a.id ? { ...x, enabled: !x.enabled } : x)))}
                      className={`vb-link pb-1 text-[11px] font-semibold tracking-[0.3em] uppercase ${a.enabled ? 'text-[var(--sodium)]' : 'text-[var(--muted)]'}`}>
                      {a.enabled ? 'On' : 'Off'}
                    </button>
                  </li>
                ))}
                <li className="py-6"><button className="vb-link text-xl italic [font-family:var(--font-instrument)] text-[var(--sodium)]">Add an alarm</button></li>
              </ol>
            )}
            {panel === 'scene' && (
              <ul className="mt-4">
                {SCENES.map((s) => (
                  <li key={s}>
                    <button onClick={() => setScene(s)} className={`block py-2 text-left text-4xl italic [font-family:var(--font-instrument)] transition-colors ${scene === s ? 'text-[var(--sodium)]' : 'text-[var(--ivory)]/55 hover:text-[var(--ivory)]'}`}>{s}</button>
                  </li>
                ))}
              </ul>
            )}
            {panel === 'sound' && (
              <ul className="mt-4">
                {TRACKS.map((t) => (
                  <li key={t}>
                    <button onClick={() => setTrack((c) => (c === t ? null : t))} className={`flex w-full items-baseline justify-between py-2 text-left text-3xl italic [font-family:var(--font-instrument)] ${track === t ? 'text-[var(--sodium)]' : 'text-[var(--ivory)]/55 hover:text-[var(--ivory)]'}`}>
                      {t}
                      {track === t && <span className="text-[11px] not-italic font-semibold tracking-[0.3em] uppercase [font-family:var(--font-manrope)]">Playing</span>}
                    </button>
                  </li>
                ))}
                <li className="mt-6 text-[11px] font-semibold tracking-[0.3em] uppercase text-[var(--muted)]">Sleep timer — 15 · 30 · 60</li>
              </ul>
            )}
            {panel === 'style' && (
              <ul className="mt-4">
                {['Midnight', 'Paper', 'Neon', 'Ember', 'Mono'].map((t) => (
                  <li key={t} className={`py-2 text-4xl italic [font-family:var(--font-instrument)] ${t === 'Midnight' ? 'text-[var(--sodium)]' : 'text-[var(--ivory)]/55'}`}>{t}</li>
                ))}
              </ul>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Ringing: the frame cuts to black, the label becomes the title */}
      <AnimatePresence>
        {ringing && (
          <motion.div
            role="alertdialog"
            aria-label={`Alarm: ${STUB_ALARMS[0].label}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-30 flex flex-col justify-center bg-[oklch(0.06_0.008_250/.95)] px-[clamp(16px,7vw,120px)]"
          >
            <motion.p initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(64px,12vw,180px)] leading-[0.9] italic [font-family:var(--font-instrument)]">
              {STUB_ALARMS[0].label}.
            </motion.p>
            <p className="mt-4 text-[11px] font-semibold tracking-[0.32em] uppercase text-[var(--muted)]">{STUB_ALARMS[0].time} · Weekdays · 1 more waiting</p>
            <div className="mt-12 flex flex-wrap items-center gap-8">
              <button autoFocus onClick={onRingEnd} className="rounded-full bg-[var(--sodium)] px-10 py-5 text-sm font-semibold tracking-[0.25em] uppercase text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ivory)]">
                Snooze nine minutes
              </button>
              <button onClick={onRingEnd} className="vb-link text-sm font-semibold tracking-[0.25em] uppercase">Stop</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
