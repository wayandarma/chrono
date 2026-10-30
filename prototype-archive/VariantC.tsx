// PROTOTYPE — Variant C "Departures": CHRONO as a split-flap station board.
// Everything is the board: alarms are always visible as departure rows, and
// opening Scene/Sound/Style re-flaps the same board instead of sliding a panel.
// Controls are a hardware key strip. Asymmetric, information-forward.
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { VariantProps } from './PrototypeApp'
import {
  FlipChar, SCENES, STUB_ALARMS, SrTime, TRACKS, clockParts, daysLabel, nextAlarm, useKeys, useNow,
} from './shared'

export const name = 'Departures'

type Mode = 'alarms' | 'scene' | 'sound' | 'style'

const css = `
.vc { --hall: oklch(0.16 0.008 60); --board: oklch(0.12 0.006 60); --flap: oklch(0.22 0.008 60);
  --chalk: oklch(0.93 0.012 85); --dim: oklch(0.62 0.012 75); --amber: oklch(0.84 0.16 82); }
.vc-hall { background:
  radial-gradient(90% 60% at 80% 0%, oklch(0.32 0.05 230 / .55), transparent 70%),
  radial-gradient(70% 50% at 0% 100%, oklch(0.3 0.04 60 / .35), transparent 70%), var(--hall); }
.vc-board { background: var(--board); box-shadow: 0 0 0 1px oklch(0.3 0.008 60), 0 30px 60px -30px oklch(0 0 0 / .8),
  inset 0 1px 0 oklch(1 0 0 / .04); }
.vc-flip-big { --flip-w: .7em; --flip-h: 1.06em; --flip-radius: .03em; --flip-bg: var(--flap);
  --flip-bg-bottom: oklch(0.2 0.008 60); --flip-fg: var(--chalk); --flip-gap: .02em; --flip-gap-color: var(--board);
  --flip-dur: 420ms; font-family: var(--font-barlow); font-weight: 600; }
.vc-flip-sm { --flip-w: .74em; --flip-h: 1.34em; --flip-radius: .08em; --flip-bg: var(--flap);
  --flip-bg-bottom: oklch(0.2 0.008 60); --flip-fg: var(--chalk); --flip-gap: .07em; --flip-gap-color: var(--board);
  --flip-dur: 160ms; font-family: var(--font-barlow); font-weight: 600; text-transform: uppercase; }
.vc-flip-sm.is-amber { --flip-fg: var(--amber); }
.vc-flip-sm.is-dim { --flip-fg: var(--dim); }
.vc-key { background: linear-gradient(180deg, oklch(0.27 0.008 60), oklch(0.21 0.008 60));
  box-shadow: inset 0 1px 0 oklch(1 0 0 / .08), 0 2px 0 oklch(0.08 0 0), 0 6px 14px -6px oklch(0 0 0 / .8);
  transition: transform 100ms var(--ease-out-quart), box-shadow 100ms; }
.vc-key:active, .vc-key[aria-pressed=true] { transform: translateY(2px); box-shadow: inset 0 1px 0 oklch(1 0 0 / .05), 0 0 0 oklch(0 0 0); }
.vc-blink { animation: vc-blink 1s steps(2, jump-none) infinite; }
@keyframes vc-blink { 50% { opacity: .25 } }
@media (prefers-reduced-motion: reduce) { .vc-blink { animation: none } }
`

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Split-flap char: settles after a stagger delay, passing through a couple of intermediate glyphs. */
function BoardChar({ ch, delay, tone }: { ch: string; delay: number; tone?: 'amber' | 'dim' }) {
  const [shown, setShown] = useState(ch)
  useEffect(() => {
    if (reducedMotion) return setShown(ch)
    const timers: number[] = []
    const hops = ch === ' ' ? 1 : 2 + Math.floor(Math.random() * 2)
    for (let i = 0; i < hops; i++) {
      timers.push(window.setTimeout(() => setShown(GLYPHS[Math.floor(Math.random() * GLYPHS.length)]), delay + i * 90))
    }
    timers.push(window.setTimeout(() => setShown(ch), delay + hops * 90))
    return () => timers.forEach(clearTimeout)
  }, [ch, delay])
  return <FlipChar value={shown === ' ' ? ' ' : shown} className={`vc-flip-sm ${tone === 'amber' ? 'is-amber' : tone === 'dim' ? 'is-dim' : ''}`} />
}

function BoardText({ text, width, row, col, tone }: { text: string; width: number; row: number; col: number; tone?: 'amber' | 'dim' }) {
  const s = text.toUpperCase().slice(0, width).padEnd(width, ' ')
  return (
    <span className="inline-flex gap-[0.08em]">
      {[...s].map((c, i) => (
        <BoardChar key={i} ch={c} delay={row * 60 + (col + i) * 22} tone={tone} />
      ))}
    </span>
  )
}

const COLS = { a: 5, b: 11, c: 9, d: 4 }
const ROWS = 7

export function VariantC({ ringing, onRingEnd }: VariantProps) {
  const now = useNow()
  const { hh, mm, ss, meridiem, twelve } = clockParts(now)
  const [alarms, setAlarms] = useState(STUB_ALARMS)
  const [mode, setMode] = useState<Mode>('alarms')
  const [immersive, setImmersive] = useState(false)
  const [reveal, setReveal] = useState(true)
  const [scene, setScene] = useState(SCENES[1])
  const [track, setTrack] = useState<string | null>(null)
  const [theme, setTheme] = useState('Mono')
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

  useKeys(
    ringing
      ? { ' ': onRingEnd }
      : { i: () => setImmersive((v) => !v), a: () => setMode('alarms'), s: () => setMode('scene'), t: () => setMode('style'), m: () => setMode('sound'), escape: () => setMode('alarms') },
    [ringing],
  )

  // Board rows for the current mode: [colA, colB, colC, colD, tone, onClick]
  type Row = { a: string; b: string; c: string; d: string; tone?: 'amber' | 'dim'; label: string; onClick?: () => void }
  let header: Row
  let rows: Row[]
  if (mode === 'alarms') {
    header = { a: 'TIME', b: 'ALARM', c: 'DAYS', d: '', label: '' }
    rows = alarms.map((al) => {
      const isNext = next?.alarm.id === al.id
      const isRinging = ringing && al.id === STUB_ALARMS[0].id
      return {
        a: al.time, b: al.label, c: daysLabel(al.days).replace('Every day', 'DAILY'),
        d: isRinging ? 'NOW' : !al.enabled ? 'OFF' : isNext ? 'NEXT' : 'ON',
        tone: isRinging || isNext ? 'amber' : !al.enabled ? 'dim' : undefined,
        label: `${al.label} at ${al.time}, ${daysLabel(al.days)}, ${al.enabled ? 'on' : 'off'}. Toggle.`,
        onClick: () => setAlarms((xs) => xs.map((x) => (x.id === al.id ? { ...x, enabled: !x.enabled } : x))),
      }
    })
    rows.push({ a: '+', b: 'NEW ALARM', c: '', d: '', tone: 'dim', label: 'New alarm', onClick: () => {} })
  } else if (mode === 'scene') {
    header = { a: 'NO', b: 'SCENE', c: 'TYPE', d: '', label: '' }
    rows = SCENES.map((s, i) => ({ a: `0${i + 1}`, b: s.replace('&', 'AND'), c: i < 3 || i === 5 ? 'VIDEO' : 'STILL', d: s === scene ? 'SHOW' : '', tone: s === scene ? 'amber' : undefined, label: `Scene ${s}`, onClick: () => setScene(s) }))
  } else if (mode === 'sound') {
    header = { a: 'NO', b: 'SOUND', c: 'LOOP', d: '', label: '' }
    rows = TRACKS.map((t, i) => ({ a: `0${i + 1}`, b: t, c: `${2 + (i % 4)} MIN`, d: t === track ? 'PLAY' : '', tone: t === track ? 'amber' : undefined, label: `Track ${t}`, onClick: () => setTrack((c) => (c === t ? null : t)) }))
  } else {
    header = { a: 'NO', b: 'THEME', c: '', d: '', label: '' }
    rows = ['Mono', 'Midnight', 'Paper', 'Ember', 'Neon'].map((t, i) => ({ a: `0${i + 1}`, b: t, c: '', d: t === theme ? 'SET' : '', tone: t === theme ? 'amber' : undefined, label: `Theme ${t}`, onClick: () => setTheme(t) }))
  }
  while (rows.length < ROWS) rows.push({ a: '', b: '', c: '', d: '', label: '' })
  rows = rows.slice(0, ROWS)

  const controlsShown = !immersive || reveal
  const date = now.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()

  return (
    <div className="vc vc-hall min-h-dvh overflow-x-hidden px-[clamp(16px,4vw,56px)] pb-28 pt-[clamp(16px,4vh,48px)] text-[var(--chalk)] [font-family:var(--font-barlow)]">
      <style>{css}</style>
      <SrTime now={now} />

      <header className="mb-[clamp(16px,4vh,40px)] flex items-baseline justify-between text-sm font-semibold tracking-[0.3em] text-[var(--dim)] uppercase">
        <span><span className="text-[var(--chalk)]">Chrono</span> — Platform {scene.split(' ')[0]}</span>
        <span className="tabular-nums">{date}</span>
      </header>

      <div className={`grid items-start gap-[clamp(20px,4vw,56px)] ${immersive ? 'xl:grid-cols-1' : 'xl:grid-cols-[auto_1fr]'}`}>
        {/* Clock board */}
        <motion.section layout transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} aria-label="Clock" className={`vc-board rounded-md p-[clamp(12px,1.6vw,20px)] ${immersive ? 'justify-self-center' : ''}`}>
          <div className={`flex items-center justify-between pb-3 text-xs font-semibold tracking-[0.3em] uppercase ${ringing ? 'text-[var(--amber)]' : 'text-[var(--dim)]'}`}>
            <span className={ringing ? 'vc-blink' : ''}>{ringing ? `Now — ${STUB_ALARMS[0].label}` : 'Local time'}</span>
            <span>{twelve ? meridiem : '24H'}</span>
          </div>
          <div className={`flex flex-col gap-[0.06em] leading-none sm:flex-row sm:items-end sm:gap-[0.14em] ${immersive ? 'text-[clamp(110px,22vw,300px)]' : 'text-[clamp(96px,14vw,210px)]'} portrait:max-sm:text-[clamp(120px,40vw,220px)]`}>
            <div className="flex gap-[0.04em]">
              <FlipChar value={hh[0]} className="vc-flip-big" />
              <FlipChar value={hh[1]} className="vc-flip-big" />
            </div>
            <div className="flex gap-[0.04em]">
              <FlipChar value={mm[0]} className="vc-flip-big" />
              <FlipChar value={mm[1]} className="vc-flip-big" />
            </div>
            <div className="flex gap-[0.04em] self-start text-[0.26em] sm:self-end">
              <FlipChar value={ss[0]} className="vc-flip-big" />
              <FlipChar value={ss[1]} className="vc-flip-big" />
            </div>
          </div>
          {next && (
            <p className="mt-3 text-sm font-semibold tracking-[0.2em] text-[var(--dim)] uppercase">
              Next <span className="text-[var(--amber)]">{next.alarm.time}</span> {next.alarm.label} · in {next.inLabel}
            </p>
          )}
        </motion.section>

        {/* Departures board — alarms, or whatever the keys select */}
        {!immersive && (
          <motion.section layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} aria-label={`${mode} board`} className="vc-board min-w-0 overflow-x-auto rounded-md p-[clamp(10px,1.4vw,18px)] text-[clamp(14px,1.45vw,22px)] [scrollbar-color:oklch(0.35_0.008_60)_transparent]">
            <div className="mb-2 flex items-center gap-[0.9em] text-[0.62em] font-semibold tracking-[0.3em] text-[var(--dim)]">
              <span style={{ width: `${COLS.a * 0.82}em` }}>{header.a}</span>
              <span style={{ width: `${COLS.b * 0.82}em` }}>{header.b}</span>
              <span style={{ width: `${COLS.c * 0.82}em` }} className="max-md:hidden">{header.c}</span>
            </div>
            <ul className="flex flex-col gap-[0.32em]">
              {rows.map((r, i) => (
                <li key={i}>
                  <button
                    disabled={!r.onClick}
                    aria-label={r.label || undefined}
                    onClick={r.onClick}
                    className="flex w-max items-center gap-[0.9em] rounded-sm py-[0.1em] text-left transition-colors hover:bg-[oklch(1_0_0/.04)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--amber)] disabled:hover:bg-transparent"
                  >
                    <BoardText text={r.a} width={COLS.a} row={i} col={0} tone={r.tone === 'dim' ? 'dim' : undefined} />
                    <BoardText text={r.b} width={COLS.b} row={i} col={COLS.a} tone={r.tone === 'dim' ? 'dim' : undefined} />
                    <span className="max-md:hidden"><BoardText text={r.c} width={COLS.c} row={i} col={COLS.a + COLS.b} tone="dim" /></span>
                    <span className={r.d === 'NOW' ? 'vc-blink' : ''}><BoardText text={r.d} width={COLS.d} row={i} col={20} tone={r.tone} /></span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.section>
        )}
      </div>

      {/* Hardware key strip */}
      <motion.nav
        inert={!controlsShown}
        aria-label="Controls"
        animate={{ opacity: controlsShown ? 1 : 0, y: controlsShown ? 0 : 16 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-x-0 bottom-12 z-10 flex justify-center gap-2 px-4"
      >
        {ringing ? (
          <>
            <button autoFocus onClick={onRingEnd} style={{ background: "var(--amber)" }} className="vc-key rounded-md px-10 py-4 text-lg font-bold tracking-[0.25em] text-[var(--board)] uppercase focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--chalk)]">Snooze 9</button>
            <button onClick={onRingEnd} className="vc-key rounded-md px-8 py-4 text-lg font-bold tracking-[0.25em] uppercase focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--amber)]">Stop</button>
          </>
        ) : (
          <>
            {(
              [
                ['alarms', 'ALM', 'Alarms'],
                ['scene', 'SCN', 'Scene'],
                ['sound', 'SND', 'Sound'],
                ['style', 'STY', 'Style'],
              ] as const
            ).map(([m, code, label]) => (
              <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m && !immersive} aria-label={label}
                className="vc-key flex flex-col items-start rounded-md px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--amber)]">
                <span className={`mb-1 h-1 w-4 rounded-full ${mode === m && !immersive ? 'bg-[var(--amber)]' : 'bg-[oklch(0.35_0.008_60)]'}`} />
                <span className="text-base font-bold tracking-[0.2em]">{code}</span>
              </button>
            ))}
            <button onClick={() => setImmersive((v) => !v)} aria-pressed={immersive} aria-label="Immersive"
              className="vc-key ml-3 flex flex-col items-start rounded-md px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--amber)]">
              <span className={`mb-1 h-1 w-4 rounded-full ${immersive ? 'bg-[var(--amber)]' : 'bg-[oklch(0.35_0.008_60)]'}`} />
              <span className="text-base font-bold tracking-[0.2em]">IMM</span>
            </button>
          </>
        )}
      </motion.nav>
    </div>
  )
}
