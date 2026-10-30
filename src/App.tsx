import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Clock, use12h } from './components/Clock'
import { RingingScreen } from './components/RingingScreen'
import { Sheet } from './components/ui'
import { AlarmsPanel } from './components/panels/AlarmsPanel'
import { ScenePanel, SoundPanel, usePlayingTrack } from './components/panels/MediaPanels'
import { StylePanel } from './components/panels/StylePanel'
import { SCENE_LIST, Scene, sceneCss } from './data/scenes'
import { ACCENTS, THEMES } from './data/themes'
import { useMedia, useNow, useSoundReady, useWakeLock } from './hooks'
import { TRACKS, playTrack, setVolume, stopTrack } from './lib/audio'
import { nextAcross, untilLabel } from './lib/schedule'
import { dismissIssue, useStorageIssues, useStore } from './lib/store'
import { alarmsStore, settingsStore } from './state'
import { useAlarmEngine } from './useAlarmEngine'

type Panel = 'alarms' | 'scene' | 'sound' | 'style'
const HINT_ID = 'first-run'

export default function App() {
  const now = useNow()
  const wide = useMedia('(min-width: 1024px)')
  const settings = useStore(settingsStore)
  const alarms = useStore(alarmsStore)
  const soundReady = useSoundReady()
  const engine = useAlarmEngine(now, soundReady)
  const playing = usePlayingTrack()
  const issues = useStorageIssues()

  const [panel, setPanel] = useState<Panel | null>(null)
  const [immersive, setImmersive] = useState(false)
  const [active, setActive] = useState(true)
  const [shortcuts, setShortcuts] = useState(false)
  const [sleepAt, setSleepAt] = useState<number | null>(null)
  const [wakeNotice, setWakeNotice] = useState(false)

  const theme = THEMES[settings.theme] ?? THEMES.midnight
  const scene = SCENE_LIST.find((s) => s.id === settings.sceneId) ?? SCENE_LIST[0]
  const rawAccent = ACCENTS.find((a) => a.id === settings.accent)?.value || scene.accent
  const accent = theme.light ? `color-mix(in oklch, ${rawAccent} 62%, black)` : rawAccent
  const twelve = use12h(settings.hourFormat)
  const ringing = engine.ringing

  /* ---------- sound ---------- */
  useEffect(() => setVolume(settings.volume), [settings.volume, soundReady])
  useEffect(() => {
    if (sleepAt && now.getTime() >= sleepAt) {
      stopTrack(30)
      setSleepAt(null)
    }
  }, [now, sleepAt])
  const toggleMusic = () => (playing ? stopTrack() : playTrack(engine.resumeTrack ?? settings.trackId ?? 'rain'))

  /* ---------- wake lock ---------- */
  const wake = useWakeLock(immersive || settings.wakeLockOutsideImmersive)
  useEffect(() => {
    if (!immersive) return setWakeNotice(false)
    setWakeNotice(true)
    const id = window.setTimeout(() => setWakeNotice(false), 4000)
    return () => clearTimeout(id)
  }, [immersive, wake.state])

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
    settings.alwaysShowControls || panel || ringing || shortcuts ? 'full' : immersive ? (active ? 'full' : 'hidden') : active ? 'full' : 'dim'

  /* ---------- fullscreen (feature-detected; immersive never depends on it) ---------- */
  const canFullscreen = !!document.fullscreenEnabled
  const toggleFullscreen = () => {
    if (!canFullscreen) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen().catch(() => {})
  }
  const toggleImmersive = () => {
    setImmersive((v) => !v)
    setPanel(null)
  }

  /* ---------- keyboard (context-aware: ringing wins) ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (ringing) {
        if (e.key === ' ' && !(e.target as HTMLElement).closest('button')) {
          e.preventDefault()
          engine.snooze()
        }
        return
      }
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return
      const toggle = (p: Panel) => setPanel((c) => (c === p ? null : p))
      const map: Record<string, () => void> = {
        i: toggleImmersive,
        f: toggleFullscreen,
        m: toggleMusic,
        a: () => toggle('alarms'),
        s: () => toggle('scene'),
        t: () => toggle('style'),
        '?': () => setShortcuts((v) => !v),
        escape: () => (shortcuts ? setShortcuts(false) : setPanel(null)),
      }
      const fn = map[e.key.toLowerCase()]
      if (fn) {
        e.preventDefault()
        fn()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ---------- derived ---------- */
  const next = nextAcross(alarms, engine.snoozes, now)
  const nextTime = next?.at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const showHint = !settings.dismissedHints.includes(HINT_ID) && !soundReady
  const alarmsArmed = alarms.some((a) => a.enabled)
  const resumeName = TRACKS.find((t) => t.id === engine.resumeTrack)?.name
  const playingName = TRACKS.find((t) => t.id === playing)?.name

  const vars = {
    '--card': theme.card,
    '--card-b': theme.cardB,
    '--digit': theme.digit,
    '--bar': theme.bar,
    '--fg': theme.fg,
    '--muted': theme.muted,
    '--panel': theme.panel,
    '--line': theme.line,
    '--accent': accent,
    '--picker-filter': theme.light ? 'none' : 'invert(1)',
    colorScheme: theme.light ? 'light' : 'dark',
  } as CSSProperties

  return (
    <div className="chrono relative h-dvh overflow-hidden text-[var(--fg)] [font-family:var(--font-manrope)]" style={vars} data-face={settings.typeface} data-glow={theme.glow}>
      <style>{sceneCss}</style>

      {/* Scene, cross-faded */}
      <div className="absolute inset-0" style={{ filter: settings.blur ? `blur(${settings.blur}px)` : undefined, transform: settings.blur ? 'scale(1.04)' : undefined }}>
        <AnimatePresence initial={false}>
          <motion.div key={scene.id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.4, ease: 'easeInOut' }}>
            <Scene id={scene.id} />
          </motion.div>
        </AnimatePresence>
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `linear-gradient(20deg, oklch(0.05 0.01 250 / ${settings.dim + 0.25}) 0%, oklch(0.05 0.01 250 / ${settings.dim * 0.5}) 50%, transparent 85%)` }}
      />

      <Clock
        now={now}
        twelve={twelve}
        showSeconds={settings.showSeconds}
        compact={!!panel && !wide}
        immersive={immersive}
        hidden={!!ringing}
        tickSound={settings.tickSound}
      />

      {/* Top letterbox */}
      <motion.header
        inert={chrome === 'hidden'}
        animate={{ y: chrome === 'hidden' ? '-100%' : 0, opacity: chrome === 'dim' ? 0.4 : 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-x-0 top-0 z-10 grid h-[calc(var(--bar-h)+env(safe-area-inset-top))] grid-cols-[auto_1fr_auto] items-center gap-4 bg-[var(--bar)] px-[clamp(16px,4vw,48px)] pt-[env(safe-area-inset-top)] focus-within:!opacity-100"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-[13px] font-bold tracking-[0.28em]">CHRONO</h1>
          <span className="flex items-center gap-1.5 text-[13px] text-[var(--muted)]" role="status">
            <span className={`h-2 w-2 rounded-full ${soundReady ? 'bg-[var(--accent)]' : 'soft-pulse bg-[var(--muted)]'}`} aria-hidden />
            <span className={soundReady ? 'max-sm:sr-only' : 'max-sm:sr-only'}>{soundReady ? 'Alarm sound ready' : 'Tap to enable sound'}</span>
          </span>
        </div>
        <span className="justify-self-center text-[19px] italic text-[var(--muted)] [font-family:var(--font-instrument)] max-md:hidden">{scene.name}</span>
        <button onClick={() => setPanel('alarms')} className="tap col-start-3 justify-self-end text-right text-[14px] font-medium text-[var(--muted)] hover:text-[var(--fg)]">
          {next ? (
            <span>
              <span className="max-sm:hidden">{next.label || 'Alarm'} · </span>
              <span className="font-semibold text-[var(--fg)] tabular-nums">{nextTime}</span>
              <span className="text-[var(--accent)]"> in {untilLabel(next.at.getTime() - now.getTime())}</span>
            </span>
          ) : alarms.length ? (
            'Alarms paused'
          ) : (
            <span className="sr-only">Alarms</span>
          )}
        </button>
      </motion.header>

      {/* Bottom letterbox */}
      <motion.nav
        inert={chrome === 'hidden'}
        aria-label="Controls"
        animate={{ y: chrome === 'hidden' ? '100%' : 0, opacity: chrome === 'dim' ? 0.4 : 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-x-0 bottom-0 z-10 flex h-[calc(var(--bar-h)+env(safe-area-inset-bottom))] items-center gap-[clamp(14px,2.6vw,36px)] bg-[var(--bar)] px-[clamp(16px,4vw,48px)] pb-[env(safe-area-inset-bottom)] text-[14px] font-semibold focus-within:!opacity-100"
      >
        {(
          [
            ['alarms', 'A'],
            ['scene', 'S'],
            ['sound', 'M'],
            ['style', 'T'],
          ] as const
        ).map(([p, key]) => (
          <button
            key={p}
            onClick={() => setPanel((c) => (c === p ? null : p))}
            aria-pressed={panel === p}
            aria-keyshortcuts={p === 'sound' ? undefined : key}
            className={`tap underline-accent capitalize ${panel === p ? 'text-[var(--fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}
          >
            {p}
          </button>
        ))}
        <span className="flex-1" />
        {(playing || engine.resumeTrack) && (
          <button onClick={toggleMusic} aria-keyshortcuts="M" className="tap gap-2 font-medium text-[var(--muted)] hover:text-[var(--fg)] max-md:hidden">
            {playing ? (
              <span className="eq" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            ) : (
              <span aria-hidden>▶</span>
            )}
            {playing ? `${playingName} — pause` : `Resume ${resumeName}`}
          </button>
        )}
        {canFullscreen && wide && (
          <button onClick={toggleFullscreen} aria-keyshortcuts="F" className="tap underline-accent text-[var(--muted)] hover:text-[var(--fg)]">
            Fullscreen
          </button>
        )}
        <button onClick={toggleImmersive} aria-pressed={immersive} aria-keyshortcuts="I" className="tap underline-accent text-[var(--muted)] hover:text-[var(--fg)]">
          {immersive ? 'Exit' : 'Immerse'}
        </button>
      </motion.nav>

      {/* Notices, stacked under the top bar */}
      <div className="pointer-events-none absolute right-[clamp(16px,4vw,48px)] top-[calc(var(--bar-h)+env(safe-area-inset-top)+16px)] z-10 flex w-[min(360px,calc(100vw-32px))] flex-col items-end gap-2">
        <AnimatePresence>
          {issues.map((issue) => (
            <Notice key={issue.kind === 'corrupt' ? issue.backupKey : 'unavailable'} onDismiss={() => dismissIssue(issue)}>
              {issue.kind === 'unavailable'
                ? "Changes won't be saved on this device — browser storage is blocked or full."
                : 'Some saved data was unreadable, so it was reset. A backup copy was kept in this browser.'}
            </Notice>
          ))}
          {engine.missed.length > 0 && !ringing && (
            <Notice key="missed" onDismiss={() => engine.dismissMissed()} dismissLabel="Dismiss all">
              <span className="block font-semibold text-[var(--fg)]">Missed {engine.missed.length === 1 ? 'alarm' : 'alarms'}</span>
              <ul className="mt-1">
                {engine.missed.slice(-4).map((m) => (
                  <li key={m.occurrenceId} className="flex items-center justify-between gap-3">
                    <span>
                      {new Date(m.scheduledAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })} · {m.label || 'Alarm'}
                    </span>
                    <button onClick={() => engine.dismissMissed(m.occurrenceId)} className="tap min-h-9 text-[12px] font-semibold underline underline-offset-2">
                      Dismiss
                    </button>
                  </li>
                ))}
              </ul>
            </Notice>
          )}
          {engine.resumeTrack && !playing && !ringing && (
            <motion.button
              key="resume"
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                playTrack(engine.resumeTrack!)
                engine.clearResume()
              }}
              className="pointer-events-auto min-h-11 rounded-full bg-[var(--accent)] px-5 text-[14px] font-semibold text-[var(--on-accent)]"
            >
              ▶ Resume {resumeName}
            </motion.button>
          )}
          {engine.remoteRinging && (
            <Notice key="remote">An alarm is ringing in another CHRONO tab.</Notice>
          )}
          {alarmsArmed && !soundReady && !showHint && !ringing && (
            <Notice key="locked">
              <span className="font-semibold text-[var(--fg)]">Tap anywhere to enable alarm sound.</span> Browsers block audio until you interact with the page.
            </Notice>
          )}
          {immersive && wakeNotice && (
            <Notice key="wake">
              {wake.state === 'on' ? (
                <span title="Keeps your display awake; plug in for overnight use.">
                  <span className="font-semibold text-[var(--fg)]">Screen stays on.</span> Keeps your display awake; plug in for overnight use.
                </span>
              ) : (
                <span>
                  <span className="font-semibold text-[var(--fg)]">Screen may sleep.</span>{' '}
                  {wake.state === 'unsupported' ? "This browser can't keep the screen awake." : (wake.reason ?? 'The browser refused the request.')}
                </span>
              )}
            </Notice>
          )}
          {showHint && !ringing && (
            <Notice key="hint" onDismiss={() => settingsStore.set((s) => ({ ...s, dismissedHints: [...s.dismissedHints, HINT_ID] }))}>
              Tap anywhere to enable sound · Press I for immersive · ? for shortcuts
            </Notice>
          )}
        </AnimatePresence>
      </div>

      <Sheet open={!!panel && !ringing} wide={wide} title={panel ?? ''} onClose={() => setPanel(null)}>
        {panel === 'alarms' && <AlarmsPanel leader={engine.leader} />}
        {panel === 'scene' && <ScenePanel settings={settings} />}
        {panel === 'sound' && <SoundPanel settings={settings} sleepAt={sleepAt} setSleepAt={setSleepAt} now={now} />}
        {panel === 'style' && <StylePanel settings={settings} sceneAccent={scene.accent} />}
      </Sheet>

      <AnimatePresence>
        {shortcuts && !ringing && (
          <motion.div
            role="dialog"
            aria-label="Keyboard shortcuts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShortcuts(false)}
            className="absolute inset-0 z-20 grid place-items-center bg-[oklch(0.05_0.01_250/.7)] p-4"
          >
            <div className="w-full max-w-sm rounded-3xl bg-[var(--panel)] p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-[32px] italic [font-family:var(--font-instrument)]">Shortcuts</h2>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px]">
                {[
                  ['I', 'Immersive mode'],
                  ['F', 'Fullscreen'],
                  ['M', 'Play / pause music'],
                  ['A', 'Alarms'],
                  ['S', 'Scene'],
                  ['T', 'Style'],
                  ['Esc', 'Close panel'],
                  ['Space', 'Snooze (while ringing)'],
                ].map(([k, d]) => (
                  <div key={k} className="contents">
                    <dt>
                      <kbd className="rounded-md border border-[var(--line)] px-2 py-0.5 font-semibold">{k}</kbd>
                    </dt>
                    <dd className="text-[var(--muted)]">{d}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ringing && (
          <RingingScreen
            key={ringing.occurrenceId}
            occurrence={ringing}
            queueAfter={engine.queueAfter}
            accent={rawAccent}
            soundReady={soundReady}
            onSnooze={engine.snooze}
            onStop={engine.stop}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Notice({ children, onDismiss, dismissLabel = 'Dismiss' }: { children: ReactNode; onDismiss?: () => void; dismissLabel?: string }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      role="status"
      className="pointer-events-auto w-full rounded-2xl bg-[var(--panel)] px-4 py-3 text-[13px] leading-relaxed text-[var(--muted)] backdrop-blur-xl"
    >
      {children}
      {onDismiss && (
        <button onClick={onDismiss} className="mt-1 block min-h-9 text-[12px] font-semibold text-[var(--fg)] underline underline-offset-2">
          {dismissLabel}
        </button>
      )}
    </motion.div>
  )
}
