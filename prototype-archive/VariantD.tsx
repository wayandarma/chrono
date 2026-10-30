// PROTOTYPE — Variant D "Cinema+" (chosen direction).
// B's film-frame layout + A's solid mechanical cards and condensed Archivo
// digits + A's panel designs, re-skinned for the frame. Everything here is
// interactive but in-memory: working scenes, synthesized sound, alarm editor,
// themes, real ringing when an alarm time arrives.
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from "react"
import type { VariantProps } from './PrototypeApp'
import { FlipChar, SrTime, clockParts, daysLabel, nextAlarm, pad, uses12h, useNow, type StubAlarm } from './shared'
import { Scene, SCENE_LIST, sceneCss, type SceneId } from './scenes'
import {
  TONES, TRACKS, onAudioState, playTrack, playingTrack, setVolume, startTone, stopTrack, unlockAudio, audioRunning,
  type ToneId, type TrackId,
} from './ambient'

export const name = 'Cinema+'
export const switcherBottom = 'calc(clamp(56px, 8vh, 84px) + 10px)'

type Alarm = StubAlarm & { tone: ToneId }
type Panel = 'alarms' | 'scene' | 'sound' | 'style'
type ThemeId = keyof typeof THEMES

const THEMES = {
  midnight: { name: 'Midnight', card: 'oklch(0.2 0.012 250)', cardB: 'oklch(0.17 0.012 250)', digit: 'oklch(0.95 0.015 85)', bar: 'oklch(0.08 0.008 250)', fg: 'oklch(0.94 0.015 85)', muted: 'oklch(0.76 0.015 80)', panel: 'oklch(0.11 0.01 250 / .95)', line: 'oklch(1 0 0 / .1)', light: false, glow: false },
  paper: { name: 'Paper', card: 'oklch(0.94 0.018 82)', cardB: 'oklch(0.9 0.02 80)', digit: 'oklch(0.24 0.02 50)', bar: 'oklch(0.95 0.016 82)', fg: 'oklch(0.24 0.02 50)', muted: 'oklch(0.44 0.025 55)', panel: 'oklch(0.95 0.016 82 / .97)', line: 'oklch(0.3 0.03 50 / .14)', light: true, glow: false },
  ember: { name: 'Ember', card: 'oklch(0.24 0.045 38)', cardB: 'oklch(0.2 0.04 38)', digit: 'oklch(0.92 0.07 75)', bar: 'oklch(0.1 0.02 40)', fg: 'oklch(0.93 0.04 75)', muted: 'oklch(0.76 0.05 60)', panel: 'oklch(0.13 0.025 40 / .95)', line: 'oklch(1 0 0 / .1)', light: false, glow: false },
  mono: { name: 'Mono', card: 'oklch(0.18 0 0)', cardB: 'oklch(0.15 0 0)', digit: 'oklch(0.97 0 0)', bar: 'oklch(0.07 0 0)', fg: 'oklch(0.96 0 0)', muted: 'oklch(0.74 0 0)', panel: 'oklch(0.1 0 0 / .95)', line: 'oklch(1 0 0 / .1)', light: false, glow: false },
  neon: { name: 'Neon', card: 'oklch(0.14 0.02 160)', cardB: 'oklch(0.12 0.02 160)', digit: 'oklch(0.9 0.16 150)', bar: 'oklch(0.07 0.01 160)', fg: 'oklch(0.93 0.05 150)', muted: 'oklch(0.74 0.06 150)', panel: 'oklch(0.09 0.015 160 / .95)', line: 'oklch(1 0 0 / .1)', light: false, glow: true },
}

const ACCENTS = [
  { id: 'scene', name: 'Match scene', value: '' },
  { id: 'sodium', name: 'Sodium', value: 'oklch(0.8 0.14 68)' },
  { id: 'coral', name: 'Coral', value: 'oklch(0.75 0.14 30)' },
  { id: 'mint', name: 'Mint', value: 'oklch(0.84 0.1 165)' },
  { id: 'sky', name: 'Sky', value: 'oklch(0.8 0.1 235)' },
  { id: 'ivory', name: 'Ivory', value: 'oklch(0.94 0.03 90)' },
]

const INITIAL_ALARMS: Alarm[] = [
  { id: 'a1', label: 'Wake up', time: '07:00', days: [1, 2, 3, 4, 5], enabled: true, tone: 'chime' },
  { id: 'a2', label: 'Long run', time: '06:15', days: [6], enabled: true, tone: 'pulse' },
  { id: 'a3', label: 'Call mum', time: '19:30', days: [0], enabled: false, tone: 'chime' },
]

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const PRESETS: [string, number[]][] = [['Once', []], ['Weekdays', [1, 2, 3, 4, 5]], ['Weekends', [0, 6]], ['Every day', [0, 1, 2, 3, 4, 5, 6]]]

const css = `
.vd { --bar-h: clamp(56px, 8vh, 84px); --on-accent: oklch(0.16 0.02 60); }
.vd-flip { --flip-w: .72em; --flip-h: 1.08em; --flip-radius: .06em; --flip-bg: var(--card); --flip-bg-bottom: var(--card-b);
  --flip-fg: var(--digit); --flip-gap: .016em; --flip-gap-color: oklch(0 0 0 / .55); --flip-dur: 640ms;
  font-family: var(--font-archivo); font-weight: 700; font-variation-settings: 'wdth' 72;
  border-radius: var(--flip-radius);
  box-shadow: inset 0 .012em 0 oklch(1 0 0 / .08), 0 .035em .09em oklch(0 0 0 / .5), 0 .008em 0 oklch(0 0 0 / .45); }
.vd[data-face=wide] .vd-flip { --flip-w: .8em; font-variation-settings: 'wdth' 100; font-weight: 600; }
.vd[data-glow=true] .vd-flip .flip__glyph { text-shadow: 0 0 .1em color-mix(in oklch, var(--digit), transparent 50%); }
.vd-btn { min-height: 44px; display: inline-flex; align-items: center; }
.vd-under { position: relative; }
.vd-under::after { content:''; position:absolute; left:0; right:0; bottom:8px; height:2px; background: var(--accent);
  transform: scaleX(0); transform-origin: left; transition: transform 400ms var(--ease-out-expo); }
.vd-under:hover::after, .vd-under[aria-pressed=true]::after, .vd-under:focus-visible::after { transform: scaleX(1); }
.vd-eq { display:inline-flex; align-items:flex-end; gap:2px; height:12px; }
.vd-eq i { width:3px; height:100%; background: var(--accent); transform-origin: bottom; animation: vd-eq .9s ease-in-out infinite alternate; }
.vd-eq i:nth-child(2) { animation-delay: -.3s; animation-duration: .7s; } .vd-eq i:nth-child(3) { animation-delay: -.6s; animation-duration: 1.1s; }
@keyframes vd-eq { from { transform: scaleY(.25) } to { transform: scaleY(1) } }
.vd-pulse { animation: vd-pulse 2.4s ease-in-out infinite; }
@keyframes vd-pulse { 0%,100% { opacity: .35 } 50% { opacity: .8 } }
.vd input[type=range] { accent-color: var(--accent); }
.vd input[type=time]::-webkit-calendar-picker-indicator { filter: var(--picker-filter); opacity: .7; }
@media (prefers-reduced-motion: reduce) { .vd-eq i, .vd-pulse { animation: none } }
`

function useMedia(q: string) {
  const [m, setM] = useState(() => matchMedia(q).matches)
  useEffect(() => {
    const mq = matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [q])
  return m
}

export function VariantD({ ringing, onRingEnd }: VariantProps) {
  const now = useNow()
  const wide = useMedia('(min-width: 1024px)')

  // settings
  const [themeId, setThemeId] = useState<ThemeId>('midnight')
  const [accentId, setAccentId] = useState('scene')
  const [face, setFace] = useState<'condensed' | 'wide'>('condensed')
  const [twelve, setTwelve] = useState(uses12h)
  const [showSeconds, setShowSeconds] = useState(true)
  const [dim, setDim] = useState(0.35)
  const [alwaysShow, setAlwaysShow] = useState(false)
  const [sceneId, setSceneId] = useState<SceneId>('midnight')

  // app state
  const [alarms, setAlarms] = useState<Alarm[]>(INITIAL_ALARMS)
  const [panel, setPanel] = useState<Panel | null>(null)
  const [immersive, setImmersive] = useState(false)
  const [track, setTrack] = useState<TrackId | null>(null)
  const [volume, setVol] = useState(0.6)
  const [sleepAt, setSleepAt] = useState<number | null>(null)
  const [soundReady, setSoundReady] = useState(audioRunning())
  const [hint, setHint] = useState(true)
  const [ringAlarm, setRingAlarm] = useState<Alarm | null>(null)
  const [queueLen, setQueueLen] = useState(0)
  const [resumeTrack, setResumeTrack] = useState<TrackId | null>(null)
  const [active, setActive] = useState(true)

  const theme = THEMES[themeId]
  const scene = SCENE_LIST.find((s) => s.id === sceneId)!
  const rawAccent = ACCENTS.find((a) => a.id === accentId)!.value || scene.accent
  const accent = theme.light ? `color-mix(in oklch, ${rawAccent} 62%, black)` : rawAccent
  const { hh, mm, ss, meridiem } = clockParts(now, twelve)
  const next = nextAlarm(alarms, now)

  /* ---------- audio unlock (inside real gestures) ---------- */
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    const off = onAudioState(setSoundReady)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      off()
      stopTrack(0.3)
    }
  }, [])
  useEffect(() => setVolume(volume), [volume])

  /* ---------- controls visibility ---------- */
  useEffect(() => {
    let t = 0
    const poke = () => {
      setActive(true)
      clearTimeout(t)
      t = window.setTimeout(() => setActive(false), immersive ? 3000 : 5000)
    }
    poke()
    const evs = ['pointermove', 'pointerdown', 'keydown'] as const
    evs.forEach((e) => window.addEventListener(e, poke))
    return () => {
      clearTimeout(t)
      evs.forEach((e) => window.removeEventListener(e, poke))
    }
  }, [immersive])
  const chrome: 'full' | 'dim' | 'hidden' =
    alwaysShow || panel || ringAlarm ? 'full' : immersive ? (active ? 'full' : 'hidden') : active ? 'full' : 'dim'

  /* ---------- music ---------- */
  const play = useCallback((id: TrackId | null) => {
    setResumeTrack(null)
    if (id) playTrack(id)
    else stopTrack()
    setTrack(id)
  }, [])

  useEffect(() => {
    if (sleepAt && now.getTime() >= sleepAt) {
      stopTrack(30)
      setTrack(null)
      setSleepAt(null)
    }
  }, [now, sleepAt])

  /* ---------- ringing ---------- */
  const ringRef = useRef<Alarm | null>(null)
  const queue = useRef<Alarm[]>([])
  const stopTone = useRef<(() => void) | null>(null)
  const musicWas = useRef<TrackId | null>(null)
  const handled = useRef(new Set<string>())
  const snoozes = useRef<{ alarm: Alarm; at: number }[]>([])

  const startRing = useCallback((a: Alarm) => {
    const t = playingTrack()
    if (t) {
      musicWas.current = t
      stopTrack(2)
      setTrack(null)
    }
    stopTone.current?.()
    stopTone.current = startTone(a.tone)
    ringRef.current = a
    setRingAlarm(a)
    setPanel(null)
  }, [])

  const fire = useCallback((a: Alarm) => {
    if (ringRef.current) {
      queue.current.push(a)
      setQueueLen(queue.current.length)
    } else startRing(a)
  }, [startRing])

  const endRing = useCallback((snooze: boolean) => {
    const cur = ringRef.current
    stopTone.current?.()
    stopTone.current = null
    if (snooze && cur) snoozes.current.push({ alarm: cur, at: Date.now() + 9 * 60_000 })
    const nxt = queue.current.shift()
    setQueueLen(queue.current.length)
    if (nxt) return startRing(nxt)
    ringRef.current = null
    setRingAlarm(null)
    if (musicWas.current) setResumeTrack(musicWas.current)
    musicWas.current = null
    onRingEnd()
  }, [onRingEnd, startRing])

  // Due check each tick (prototype: exact minute match; real app uses the 2-min grace model).
  useEffect(() => {
    const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`
    const day = now.toDateString()
    for (const a of alarms) {
      if (!a.enabled || a.time !== hm) continue
      if (a.days.length && !a.days.includes(now.getDay())) continue
      const key = `${a.id}@${day}`
      if (handled.current.has(key)) continue
      handled.current.add(key)
      fire(a)
      if (!a.days.length) setAlarms((xs) => xs.map((x) => (x.id === a.id ? { ...x, enabled: false } : x)))
    }
    const due = snoozes.current.filter((s) => now.getTime() >= s.at)
    snoozes.current = snoozes.current.filter((s) => now.getTime() < s.at)
    due.forEach((s) => fire(s.alarm))
  }, [now, alarms, fire])

  // Switcher "preview ring"
  useEffect(() => {
    if (ringing && !ringRef.current) startRing(alarms.find((a) => a.enabled) ?? alarms[0] ?? INITIAL_ALARMS[0])
    if (!ringing && ringRef.current) endRing(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringing])

  useEffect(() => () => stopTone.current?.(), [])

  /* ---------- fullscreen ---------- */
  const canFullscreen = typeof document !== 'undefined' && !!document.fullscreenEnabled
  const toggleFullscreen = () => {
    if (!canFullscreen) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen().catch(() => {})
  }

  /* ---------- keys ---------- */
  const toggle = (p: Panel) => setPanel((c) => (c === p ? null : p))
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (ringRef.current) {
        if (k === ' ') { e.preventDefault(); endRing(true) }
        return
      }
      const map: Record<string, () => void> = {
        i: () => { setImmersive((v) => !v); setPanel(null) },
        f: toggleFullscreen,
        m: () => play(track ? null : resumeTrack ?? 'rain'),
        a: () => toggle('alarms'),
        s: () => toggle('scene'),
        t: () => toggle('style'),
        escape: () => setPanel(null),
      }
      if (map[k]) { e.preventDefault(); map[k]() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ---------- layout ---------- */
  const compact = !!panel && !wide
  const vars = {
    '--card': theme.card, '--card-b': theme.cardB, '--digit': theme.digit, '--bar': theme.bar, '--fg': theme.fg,
    '--muted': theme.muted, '--panel': theme.panel, '--line': theme.line, '--accent': accent,
    '--picker-filter': theme.light ? 'none' : 'invert(1)', colorScheme: theme.light ? 'light' : 'dark',
  } as CSSProperties

  const date = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  const trackName = TRACKS.find((t) => t.id === track)?.name

  return (
    <div className="vd relative h-dvh overflow-hidden text-[var(--fg)] [font-family:var(--font-manrope)]" style={vars} data-face={face} data-glow={theme.glow}>
      <style>{sceneCss + css}</style>
      <SrTime now={now} />

      {/* Scene, cross-faded */}
      <AnimatePresence initial={false}>
        <motion.div key={sceneId} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.4, ease: 'easeInOut' }}>
          <Scene id={sceneId} />
        </motion.div>
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(20deg, oklch(0.05 0.01 250 / ${dim + 0.25}) 0%, oklch(0.05 0.01 250 / ${dim * 0.5}) 50%, transparent 85%)` }} />

      {/* Clock */}
      <motion.div
        layout
        animate={{ opacity: ringAlarm ? 0 : 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className={`absolute left-[clamp(16px,7vw,120px)] right-4 ${compact ? 'top-[calc(var(--bar-h)+16px)]' : immersive ? 'bottom-[12vh]' : 'bottom-[calc(var(--bar-h)+6vh)]'}`}
      >
        {!compact && <motion.p layout="position" className="mb-3 text-[clamp(20px,2.2vw,28px)] italic [font-family:var(--font-instrument)] text-[var(--fg)] opacity-85">{date}</motion.p>}
        <div
          className={`flex leading-none ${compact ? 'flex-row items-end gap-[0.1em] text-[clamp(52px,15vw,92px)]' : 'flex-col items-start gap-[0.06em] text-[clamp(110px,36vw,230px)] landscape:flex-row landscape:items-end landscape:gap-[0.1em] landscape:text-[clamp(84px,15vw,240px)] lg:flex-row lg:items-end lg:gap-[0.1em] lg:text-[clamp(96px,15vw,240px)]'}`}
          aria-hidden
        >
          <div className="flex gap-[0.04em]">
            <FlipChar value={hh[0]} className="vd-flip" />
            <FlipChar value={hh[1]} className="vd-flip" />
          </div>
          <div className="flex gap-[0.04em]">
            <FlipChar value={mm[0]} className="vd-flip" />
            <FlipChar value={mm[1]} className="vd-flip" />
          </div>
          {(showSeconds || twelve) && (
            <div className="flex items-end gap-[0.3em] pb-[0.04em] text-[0.24em]">
              {showSeconds && (
                <span className="flex gap-[0.04em]">
                  <FlipChar value={ss[0]} className="vd-flip" />
                  <FlipChar value={ss[1]} className="vd-flip" />
                </span>
              )}
              {twelve && <span className="pb-[0.1em] text-[0.42em] font-semibold tracking-[0.14em] [font-family:var(--font-manrope)]">{meridiem}</span>}
            </div>
          )}
        </div>
      </motion.div>

      {/* Top letterbox */}
      <motion.header
        inert={chrome === 'hidden'}
        animate={{ y: chrome === 'hidden' ? '-100%' : 0, opacity: chrome === 'dim' ? 0.45 : 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-x-0 top-0 z-10 grid h-[var(--bar-h)] grid-cols-[auto_1fr_auto] items-center gap-4 bg-[var(--bar)] px-[clamp(16px,4vw,48px)] pt-[env(safe-area-inset-top)] focus-within:opacity-100"
      >
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-bold tracking-[0.28em]">CHRONO</span>
          <span className="flex items-center gap-1.5 text-[13px] text-[var(--muted)]" title={soundReady ? 'Alarm sound is ready' : 'Tap anywhere to enable alarm sound'}>
            <span className={`h-2 w-2 rounded-full ${soundReady ? 'bg-[var(--accent)]' : 'vd-pulse bg-[var(--muted)]'}`} />
            <span className="max-sm:hidden">{soundReady ? 'Sound ready' : 'Tap to enable sound'}</span>
          </span>
        </div>
        <span className="justify-self-center text-[19px] italic [font-family:var(--font-instrument)] text-[var(--muted)] max-md:hidden">{scene.name}</span>
        <button onClick={() => setPanel('alarms')} className="vd-btn justify-self-end text-right text-[14px] font-medium text-[var(--muted)] hover:text-[var(--fg)] max-md:col-start-3">
          {next ? (
            <span>
              <span className="max-sm:hidden">{next.alarm.label} · </span>
              <span className="font-semibold text-[var(--fg)] tabular-nums">{next.alarm.time}</span>
              <span className="text-[var(--accent)]"> in {next.inLabel}</span>
            </span>
          ) : alarms.length ? 'Alarms paused' : 'No alarms'}
        </button>
      </motion.header>

      {/* Bottom letterbox */}
      <motion.nav
        inert={chrome === 'hidden'}
        aria-label="Controls"
        animate={{ y: chrome === 'hidden' ? '100%' : 0, opacity: chrome === 'dim' ? 0.45 : 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-x-0 bottom-0 z-10 flex h-[var(--bar-h)] items-center gap-[clamp(14px,2.6vw,36px)] bg-[var(--bar)] px-[clamp(16px,4vw,48px)] pb-[env(safe-area-inset-bottom)] text-[14px] font-semibold focus-within:opacity-100"
      >
        {(['alarms', 'scene', 'sound', 'style'] as const).map((p) => (
          <button key={p} onClick={() => toggle(p)} aria-pressed={panel === p} aria-keyshortcuts={p === 'sound' ? undefined : p[0].toUpperCase()}
            className={`vd-btn vd-under capitalize ${panel === p ? 'text-[var(--fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}>
            {p}
          </button>
        ))}
        <span className="flex-1" />
        {(track || resumeTrack) && (
          <button onClick={() => play(track ? null : resumeTrack)} className="vd-btn gap-2 font-medium text-[var(--muted)] hover:text-[var(--fg)] max-md:hidden">
            {track ? <span className="vd-eq" aria-hidden><i /><i /><i /></span> : <span aria-hidden>▶</span>}
            {track ? trackName : `Resume ${TRACKS.find((t) => t.id === resumeTrack)?.name}`}
          </button>
        )}
        {canFullscreen && wide && (
          <button onClick={toggleFullscreen} aria-keyshortcuts="F" className="vd-btn vd-under text-[var(--muted)] hover:text-[var(--fg)]">Fullscreen</button>
        )}
        <button onClick={() => { setImmersive((v) => !v); setPanel(null) }} aria-pressed={immersive} aria-keyshortcuts="I" className="vd-btn vd-under text-[var(--muted)] hover:text-[var(--fg)]">
          {immersive ? 'Exit' : 'Immerse'}
        </button>
      </motion.nav>

      {/* First-run hint */}
      <AnimatePresence>
        {hint && !soundReady && !ringAlarm && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute right-[clamp(16px,4vw,48px)] top-[calc(var(--bar-h)+16px)] z-10 flex items-center gap-3 rounded-full bg-[var(--bar)]/90 py-2 pl-4 pr-2 text-[13px] text-[var(--muted)]">
            Tap anywhere to enable sound · Press I for immersive
            <button onClick={() => setHint(false)} aria-label="Dismiss hint" className="grid h-7 w-7 place-items-center rounded-full hover:bg-[var(--line)]">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resume chip after an alarm paused the music */}
      <AnimatePresence>
        {resumeTrack && !ringAlarm && (
          <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={() => play(resumeTrack)}
            className="absolute right-[clamp(16px,4vw,48px)] top-[calc(var(--bar-h)+16px)] z-10 rounded-full bg-[var(--accent)] px-5 py-2.5 text-[14px] font-semibold text-[var(--on-accent)]">
            ▶ Resume {TRACKS.find((t) => t.id === resumeTrack)?.name}
          </motion.button>
        )}
      </AnimatePresence>

      <Sheet open={!!panel && !ringAlarm} wide={wide} title={panel ?? ''} onClose={() => setPanel(null)}>
        {panel === 'alarms' && <AlarmsPanel alarms={alarms} setAlarms={setAlarms} />}
        {panel === 'scene' && <ScenePanel sceneId={sceneId} setSceneId={setSceneId} />}
        {panel === 'sound' && (
          <SoundPanel track={track} play={play} volume={volume} setVolume={setVol} sleepAt={sleepAt} setSleepAt={setSleepAt} now={now} />
        )}
        {panel === 'style' && (
          <StylePanel {...{ themeId, setThemeId, accentId, setAccentId, face, setFace, twelve, setTwelve, showSeconds, setShowSeconds, dim, setDim, alwaysShow, setAlwaysShow }} sceneAccent={scene.accent} />
        )}
      </Sheet>

      {/* Ringing */}
      <AnimatePresence>
        {ringAlarm && (
          <motion.div role="alertdialog" aria-modal="true" aria-labelledby="vd-ring-title"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
            className="absolute inset-0 z-30 flex flex-col justify-center bg-[oklch(0.06_0.008_250/.93)] px-[clamp(20px,7vw,120px)] text-[oklch(0.95_0.015_85)]">
            <motion.div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(60% 60% at 30% 50%, color-mix(in oklch, ${rawAccent}, transparent 80%), transparent)` }}
              animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
            <p className="relative text-[15px] font-semibold tracking-[0.12em] uppercase" style={{ color: rawAccent }}>Alarm</p>
            <motion.h2 id="vd-ring-title" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="relative mt-2 text-[clamp(64px,11vw,168px)] leading-[0.95] italic [font-family:var(--font-instrument)]">
              {ringAlarm.label || 'Alarm'}
            </motion.h2>
            <p className="relative mt-4 text-[clamp(28px,4vw,48px)] font-bold tabular-nums [font-family:var(--font-archivo)] [font-variation-settings:'wdth'_72]">
              {ringAlarm.time} <span className="text-[0.45em] font-medium text-[oklch(0.76_0.015_80)] [font-family:var(--font-manrope)]">· {daysLabel(ringAlarm.days)}{queueLen ? ` · ${queueLen} more waiting` : ''}</span>
            </p>
            <div className="relative mt-12 flex flex-wrap items-center gap-4">
              <button autoFocus onClick={() => endRing(true)} className="min-h-14 rounded-full px-10 text-[17px] font-semibold text-[var(--on-accent)] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white" style={{ background: rawAccent }}>
                Snooze 9 min
              </button>
              <button onClick={() => endRing(false)} className="min-h-14 rounded-full border-2 border-[oklch(0.95_0.015_85/.6)] px-9 text-[17px] font-semibold hover:bg-white/10 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white">
                Stop
              </button>
            </div>
            <p className="relative mt-6 text-[13px] text-[oklch(0.76_0.015_80)]">Space to snooze · Tab to Stop</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ================= Sheet ================= */

function Sheet({ open, wide, title, onClose, children }: { open: boolean; wide: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const drag = useDragControls()
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (open) ref.current?.focus()
  }, [open, title])
  return (
    <AnimatePresence>
      {open && (
        <motion.section
          ref={ref}
          tabIndex={-1}
          key="sheet"
          role="dialog"
          aria-label={title}
          initial={wide ? { x: '100%' } : { y: '100%' }}
          animate={wide ? { x: 0 } : { y: 0 }}
          exit={wide ? { x: '100%' } : { y: '100%' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          drag={wide ? false : 'y'}
          dragControls={drag}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={(_, info) => info.offset.y > 120 && onClose()}
          className={`absolute z-20 flex flex-col bg-[var(--panel)] outline-none backdrop-blur-xl ${wide ? 'inset-y-0 right-0 w-[440px] border-l border-[var(--line)]' : 'inset-x-0 bottom-0 max-h-[66dvh] rounded-t-[28px]'}`}
        >
          {!wide && (
            <div onPointerDown={(e) => drag.start(e)} className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center">
              <span className="h-1 w-10 rounded-full bg-[var(--muted)] opacity-50" />
            </div>
          )}
          <div className={`flex shrink-0 items-baseline justify-between border-b border-[var(--line)] px-6 pb-3 ${wide ? 'pt-8' : 'pt-1'}`}>
            <h2 className="text-[40px] leading-none capitalize italic [font-family:var(--font-instrument)]">{title}</h2>
            <button onClick={onClose} className="vd-btn px-2 text-[14px] font-semibold text-[var(--muted)] hover:text-[var(--fg)]">Close</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-24 pt-2 [scrollbar-color:var(--line)_transparent]">{children}</div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}

/* ================= Alarms ================= */

function AlarmsPanel({ alarms, setAlarms }: { alarms: Alarm[]; setAlarms: Dispatch<SetStateAction<Alarm[]>> }) {
  const [editing, setEditing] = useState<Alarm | 'new' | null>(null)

  if (editing) {
    return (
      <AlarmEditor
        initial={editing === 'new' ? null : editing}
        onCancel={() => setEditing(null)}
        onSave={(a) => {
          setAlarms((xs) => (xs.some((x) => x.id === a.id) ? xs.map((x) => (x.id === a.id ? a : x)) : [...xs, a].sort((p, q) => p.time.localeCompare(q.time))))
          setEditing(null)
        }}
        onDelete={(id) => {
          setAlarms((xs) => xs.filter((x) => x.id !== id))
          setEditing(null)
        }}
      />
    )
  }

  return (
    <div>
      {alarms.length === 0 ? (
        <p className="py-10 text-[17px] text-[var(--muted)]">No alarms set.</p>
      ) : (
        <ul>
          {alarms.map((a) => (
            <li key={a.id} className="flex items-center gap-4 border-b border-[var(--line)] py-4">
              <button onClick={() => setEditing(a)} className={`flex flex-1 items-center gap-4 text-left ${a.enabled ? '' : 'opacity-45'}`} aria-label={`Edit ${a.label || 'alarm'} at ${a.time}`}>
                <span className="text-[44px] leading-none font-bold tabular-nums [font-family:var(--font-archivo)] [font-variation-settings:'wdth'_72]">{a.time}</span>
                <span className="leading-tight">
                  <span className="block text-[21px] italic [font-family:var(--font-instrument)]">{a.label || 'Alarm'}</span>
                  <span className="text-[12px] font-semibold tracking-[0.1em] text-[var(--muted)] uppercase">{daysLabel(a.days)}</span>
                </span>
              </button>
              <Switch on={a.enabled} label={`${a.label || 'Alarm'} at ${a.time}`} onChange={() => setAlarms((xs) => xs.map((x) => (x.id === a.id ? { ...x, enabled: !x.enabled } : x)))} />
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => setEditing('new')} className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full border-2 border-[var(--accent)] text-[15px] font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--on-accent)]">
        + New alarm
      </button>
      <p className="mt-6 text-[13px] leading-relaxed text-[var(--muted)]">Alarms ring only while CHRONO is open in this browser. Try one a minute from now to hear it.</p>
    </div>
  )
}

function AlarmEditor({ initial, onSave, onCancel, onDelete }: { initial: Alarm | null; onSave: (a: Alarm) => void; onCancel: () => void; onDelete: (id: string) => void }) {
  const soon = new Date(Date.now() + 60_000)
  const [time, setTime] = useState(initial?.time ?? `${pad(soon.getHours())}:${pad(soon.getMinutes())}`)
  const [label, setLabel] = useState(initial?.label ?? '')
  const [days, setDays] = useState<number[]>(initial?.days ?? [])
  const [tone, setTone] = useState<ToneId>(initial?.tone ?? 'chime')
  const preview = useRef<(() => void) | null>(null)

  useEffect(() => () => preview.current?.(), [])
  const playPreview = () => {
    preview.current?.()
    preview.current = startTone(tone, 0, 0.5)
    const stop = preview.current
    setTimeout(() => stop(), 2600)
  }
  const toggleDay = (d: number) => setDays((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d].sort()))
  const field = 'mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-4 text-[var(--fg)] outline-none focus:border-[var(--accent)]'
  const legend = 'text-[12px] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase'

  return (
    <motion.form initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}
      onSubmit={(e) => {
        e.preventDefault()
        if (!time) return
        onSave({ id: initial?.id ?? crypto.randomUUID(), label: label.trim(), time, days, tone, enabled: true })
      }}
      className="flex flex-col gap-6 pt-4">
      <p className="text-[15px] font-semibold">{initial ? 'Edit alarm' : 'New alarm'}</p>
      <label className="block">
        <span className={legend}>Time</span>
        <input type="time" required value={time} onChange={(e) => setTime(e.target.value)}
          className={`${field} h-20 text-[48px] font-bold tabular-nums [font-family:var(--font-archivo)] [font-variation-settings:'wdth'_72]`} />
      </label>
      <label className="block">
        <span className={legend}>Label</span>
        <input type="text" value={label} maxLength={40} placeholder="Wake up" onChange={(e) => setLabel(e.target.value)} className={`${field} h-12 text-[16px]`} />
      </label>
      <fieldset>
        <legend className={legend}>Repeat</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map(([n, ds]) => {
            const on = ds.join() === days.join()
            return (
              <button type="button" key={n} aria-pressed={on} onClick={() => setDays(ds)}
                className={`min-h-10 rounded-full border px-4 text-[14px] font-medium ${on ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]' : 'border-[var(--line)] hover:border-[var(--muted)]'}`}>
                {n}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex justify-between gap-1">
          {DAY_ORDER.map((d) => (
            <button type="button" key={d} aria-pressed={days.includes(d)} aria-label={DAY_FULL[d]} onClick={() => toggleDay(d)}
              className={`grid h-11 w-11 place-items-center rounded-full text-[14px] font-semibold ${days.includes(d) ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'border border-[var(--line)] text-[var(--muted)] hover:text-[var(--fg)]'}`}>
              {DAY_SHORT[d]}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <span className={legend}>Sound</span>
        <div className="mt-2 flex gap-2">
          <select value={tone} onChange={(e) => setTone(e.target.value as ToneId)} aria-label="Alarm sound" className={`${field} mt-0 h-12 flex-1 text-[16px] [&>option]:bg-[var(--bar)]`}>
            {TONES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button type="button" onClick={playPreview} className="min-h-12 rounded-xl border border-[var(--line)] px-4 text-[14px] font-semibold hover:border-[var(--muted)]">▶ Preview</button>
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="min-h-12 rounded-full bg-[var(--accent)] px-8 text-[15px] font-semibold text-[var(--on-accent)]">Save</button>
        <button type="button" onClick={onCancel} className="min-h-12 px-4 text-[15px] font-semibold text-[var(--muted)] hover:text-[var(--fg)]">Cancel</button>
        <span className="flex-1" />
        {initial && <button type="button" onClick={() => onDelete(initial.id)} className="min-h-12 px-2 text-[15px] font-semibold text-[oklch(0.7_0.16_25)]">Delete</button>}
      </div>
    </motion.form>
  )
}

/* ================= Scene ================= */

function ScenePanel({ sceneId, setSceneId }: { sceneId: SceneId; setSceneId: (s: SceneId) => void }) {
  return (
    <div className="pt-4">
      <div className="grid grid-cols-2 gap-3">
        {SCENE_LIST.map((s) => (
          <button key={s.id} onClick={() => setSceneId(s.id)} aria-pressed={sceneId === s.id}
            className={`relative aspect-[16/11] overflow-hidden rounded-2xl text-left outline-offset-2 transition-transform duration-300 hover:scale-[1.02] ${sceneId === s.id ? 'outline-3 outline-[var(--accent)]' : ''}`}>
            <Scene id={s.id} />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-[14px] font-semibold text-white">
              {s.name}
              {sceneId === s.id && <span className="ml-2 text-[11px] tracking-[0.12em] uppercase opacity-80">Showing</span>}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-6 text-[13px] leading-relaxed text-[var(--muted)]">Scenes are animated placeholders. Licensed photos and video loops will replace them.</p>
    </div>
  )
}

/* ================= Sound ================= */

function SoundPanel({ track, play, volume, setVolume, sleepAt, setSleepAt, now }: {
  track: TrackId | null; play: (t: TrackId | null) => void; volume: number; setVolume: (v: number) => void
  sleepAt: number | null; setSleepAt: (t: number | null) => void; now: Date
}) {
  const left = sleepAt ? Math.max(0, Math.ceil((sleepAt - now.getTime()) / 60000)) : 0
  return (
    <div className="pt-2">
      <ul>
        {TRACKS.map((t) => {
          const on = track === t.id
          return (
            <li key={t.id} className="border-b border-[var(--line)]">
              <button onClick={() => play(on ? null : t.id)} aria-pressed={on} className="flex min-h-14 w-full items-center gap-4 text-left">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] ${on ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'border border-[var(--line)]'}`} aria-hidden>
                  {on ? '❚❚' : '▶'}
                </span>
                <span className={`flex-1 text-[17px] ${on ? 'font-semibold' : ''}`}>{t.name}</span>
                {on && <span className="vd-eq" aria-hidden><i /><i /><i /></span>}
              </button>
            </li>
          )
        })}
      </ul>
      <label className="mt-6 block">
        <span className="text-[12px] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">Volume</span>
        <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="mt-2 w-full" />
      </label>
      <div className="mt-6">
        <span className="text-[12px] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">Sleep timer {sleepAt ? `· ${left} min left` : ''}</span>
        <div className="mt-2 flex gap-2">
          {[0, 15, 30, 60].map((m) => {
            const on = m === 0 ? !sleepAt : false
            return (
              <button key={m} onClick={() => setSleepAt(m ? Date.now() + m * 60_000 : null)} aria-pressed={on}
                className={`min-h-10 rounded-full border px-4 text-[14px] font-medium ${on ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]' : 'border-[var(--line)] hover:border-[var(--muted)]'}`}>
                {m ? `${m} min` : 'Off'}
              </button>
            )
          })}
        </div>
      </div>
      <p className="mt-6 text-[13px] leading-relaxed text-[var(--muted)]">These are synthesized placeholders. Licensed recordings with credits will replace them.</p>
    </div>
  )
}

/* ================= Style ================= */

function StylePanel(p: {
  themeId: ThemeId; setThemeId: (t: ThemeId) => void; accentId: string; setAccentId: (a: string) => void
  face: 'condensed' | 'wide'; setFace: (f: 'condensed' | 'wide') => void; twelve: boolean; setTwelve: (v: boolean) => void
  showSeconds: boolean; setShowSeconds: (v: boolean) => void; dim: number; setDim: (v: number) => void
  alwaysShow: boolean; setAlwaysShow: (v: boolean) => void; sceneAccent: string
}) {
  const legend = 'text-[12px] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase'
  return (
    <div className="flex flex-col gap-7 pt-4">
      <div>
        <span className={legend}>Theme</span>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => {
            const t = THEMES[id]
            return (
              <button key={id} onClick={() => p.setThemeId(id)} aria-pressed={p.themeId === id} className="flex flex-col items-center gap-2">
                <span className={`grid h-14 w-full place-items-center rounded-xl text-[22px] font-bold [font-family:var(--font-archivo)] [font-variation-settings:'wdth'_72] ${p.themeId === id ? 'outline-3 outline-offset-2 outline-[var(--accent)]' : ''}`}
                  style={{ background: t.card, color: t.digit, boxShadow: `inset 0 0 0 1px ${t.line}` }}>
                  08
                </span>
                <span className="text-[13px] font-medium">{t.name}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <span className={legend}>Accent</span>
        <div className="mt-3 flex flex-wrap gap-3">
          {ACCENTS.map((a) => (
            <button key={a.id} onClick={() => p.setAccentId(a.id)} aria-pressed={p.accentId === a.id} aria-label={a.name} title={a.name}
              className={`h-10 w-10 rounded-full ${p.accentId === a.id ? 'outline-3 outline-offset-2 outline-[var(--fg)]' : ''}`}
              style={{ background: a.value || `conic-gradient(${p.sceneAccent} 0 50%, transparent 50%)`, boxShadow: 'inset 0 0 0 1px var(--line)' }} />
          ))}
        </div>
      </div>
      <div>
        <span className={legend}>Clock typeface</span>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(['condensed', 'wide'] as const).map((f) => (
            <button key={f} onClick={() => p.setFace(f)} aria-pressed={p.face === f}
              className={`min-h-14 rounded-xl border text-[26px] font-bold [font-family:var(--font-archivo)] ${p.face === f ? 'border-[var(--accent)]' : 'border-[var(--line)]'}`}
              style={{ fontVariationSettings: f === 'wide' ? "'wdth' 100" : "'wdth' 72", fontWeight: f === 'wide' ? 600 : 700 }}>
              12:45 <span className="ml-1 text-[12px] font-semibold capitalize [font-family:var(--font-manrope)] text-[var(--muted)]">{f}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col">
        <Row label="24-hour clock"><Switch on={!p.twelve} label="24-hour clock" onChange={() => p.setTwelve(!p.twelve)} /></Row>
        <Row label="Show seconds"><Switch on={p.showSeconds} label="Show seconds" onChange={() => p.setShowSeconds(!p.showSeconds)} /></Row>
        <Row label="Always show controls"><Switch on={p.alwaysShow} label="Always show controls" onChange={() => p.setAlwaysShow(!p.alwaysShow)} /></Row>
      </div>
      <label className="block">
        <span className={legend}>Background dim</span>
        <input type="range" min={0} max={0.7} step={0.01} value={p.dim} onChange={(e) => p.setDim(Number(e.target.value))} className="mt-2 w-full" />
      </label>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between border-b border-[var(--line)]">
      <span className="text-[16px]">{label}</span>
      {children}
    </div>
  )
}

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: () => void }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onChange}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-300 ${on ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'}`}>
      <span className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-[oklch(0.98_0.01_80)] shadow transition-transform duration-300 ease-[var(--ease-out-quart)] ${on ? 'translate-x-6' : ''}`} />
    </button>
  )
}
