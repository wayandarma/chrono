// Synthesized ambient tracks and alarm tones (Web Audio). No files, no
// licenses, no network. The AudioContext is created/resumed only inside a
// user gesture; `audioRunning()` is the single source for "Sound ready".

import type { ToneId } from './schedule'

export type TrackId = 'rain' | 'ocean' | 'forest' | 'piano' | 'drone' | 'cafe'

export const TRACKS: { id: TrackId; name: string }[] = [
  { id: 'rain', name: 'Rain' },
  { id: 'ocean', name: 'Ocean' },
  { id: 'forest', name: 'Forest at Dawn' },
  { id: 'piano', name: 'Soft Piano' },
  { id: 'drone', name: 'Deep Space Drone' },
  { id: 'cafe', name: 'Café Murmur' },
]

export const TONES: { id: ToneId; name: string }[] = [
  { id: 'chime', name: 'Soft chime' },
  { id: 'pulse', name: 'Rising pulse' },
  { id: 'beep', name: 'Classic beep' },
]

let ctx: AudioContext | null = null
let music: GainNode | null = null
let current: { id: TrackId; gain: GainNode; stop: () => void } | null = null
const listeners = new Set<(running: boolean) => void>()
const trackListeners = new Set<() => void>()
const notifyTrack = () => trackListeners.forEach((l) => l())

export function subscribeTrack(fn: () => void) {
  trackListeners.add(fn)
  return () => {
    trackListeners.delete(fn)
  }
}

/** Call from inside a click/tap/keydown handler. */
export function unlockAudio() {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
    music = ctx.createGain()
    music.gain.value = 0.6
    music.connect(ctx.destination)
    ctx.onstatechange = () => listeners.forEach((l) => l(ctx!.state === 'running'))
  }
  if (ctx.state !== 'running') void ctx.resume()
  return ctx
}

export const audioRunning = () => ctx?.state === 'running'
export function onAudioState(fn: (running: boolean) => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function setVolume(v: number) {
  if (ctx && music) music.gain.setTargetAtTime(v, ctx.currentTime, 0.05)
}

export const playingTrack = () => current?.id ?? null

export function playTrack(id: TrackId) {
  const c = unlockAudio()
  stopTrack(1.2)
  const gain = c.createGain()
  gain.gain.setValueAtTime(0, c.currentTime)
  gain.gain.linearRampToValueAtTime(1, c.currentTime + 1.5)
  gain.connect(music!)
  current = { id, gain, stop: BUILDERS[id](c, gain) }
  notifyTrack()
}

/** Fade out and stop the current track. */
export function stopTrack(fadeSec = 0.8) {
  if (!ctx || !current) return
  const { gain, stop } = current
  const t = ctx.currentTime
  gain.gain.cancelScheduledValues(t)
  gain.gain.setValueAtTime(gain.gain.value, t)
  gain.gain.linearRampToValueAtTime(0, t + fadeSec)
  setTimeout(() => {
    stop()
    gain.disconnect()
  }, fadeSec * 1000 + 50)
  current = null
  notifyTrack()
}

/* ---------------- building blocks ---------------- */

function noise(c: AudioContext, kind: 'white' | 'pink' | 'brown', seconds = 6) {
  const len = c.sampleRate * seconds
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, last = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    if (kind === 'white') d[i] = w * 0.5
    else if (kind === 'pink') {
      b0 = 0.99765 * b0 + w * 0.099046
      b1 = 0.963 * b1 + w * 0.2965164
      b2 = 0.57 * b2 + w * 1.0526913
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11
    } else {
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 3.5
    }
  }
  const src = c.createBufferSource()
  src.buffer = buf
  src.loop = true
  src.start()
  return src
}

function filter(c: AudioContext, type: BiquadFilterType, freq: number, q = 0.7) {
  const f = c.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  return f
}

function lfo(c: AudioContext, rate: number, depth: number, target: AudioParam) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.frequency.value = rate
  g.gain.value = depth
  o.connect(g).connect(target)
  o.start()
  return o
}

function gainOf(c: AudioContext, v: number) {
  const g = c.createGain()
  g.gain.value = v
  return g
}

/** Repeats `fn` at random intervals until stopped. */
function every(min: number, max: number, fn: () => void) {
  let id = 0
  const loop = () => {
    fn()
    id = window.setTimeout(loop, (min + Math.random() * (max - min)) * 1000)
  }
  id = window.setTimeout(loop, min * 1000)
  return () => clearTimeout(id)
}

function pluck(c: AudioContext, out: AudioNode, freq: number, t: number, dur: number, level: number, partials: [number, number][] = [[1, 1]], type: OscillatorType = 'sine') {
  const env = c.createGain()
  env.gain.setValueAtTime(0, t)
  env.gain.linearRampToValueAtTime(level, t + 0.012)
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  env.connect(out)
  for (const [mult, amp] of partials) {
    const o = c.createOscillator()
    o.type = type
    o.frequency.value = freq * mult
    const g = gainOf(c, amp)
    o.connect(g).connect(env)
    o.start(t)
    o.stop(t + dur + 0.05)
  }
}

/* ---------------- tracks ---------------- */

type Builder = (c: AudioContext, out: GainNode) => () => void

const BUILDERS: Record<TrackId, Builder> = {
  rain(c, out) {
    const hiss = noise(c, 'pink')
    const body = noise(c, 'brown')
    hiss.connect(filter(c, 'highpass', 500)).connect(filter(c, 'lowpass', 7000)).connect(gainOf(c, 0.55)).connect(out)
    body.connect(filter(c, 'lowpass', 400)).connect(gainOf(c, 0.35)).connect(out)
    const drops = every(0.04, 0.18, () => {
      pluck(c, out, 1800 + Math.random() * 3000, c.currentTime, 0.04, 0.03 * Math.random())
    })
    return () => { hiss.stop(); body.stop(); drops() }
  },
  ocean(c, out) {
    const n = noise(c, 'brown')
    const lp = filter(c, 'lowpass', 700)
    const swell = gainOf(c, 0.45)
    n.connect(lp).connect(swell).connect(out)
    const a = lfo(c, 0.075, 0.32, swell.gain)
    const b = lfo(c, 0.05, 380, lp.frequency)
    const foam = noise(c, 'pink')
    const foamG = gainOf(c, 0.05)
    foam.connect(filter(c, 'highpass', 2500)).connect(foamG).connect(out)
    const d = lfo(c, 0.075, 0.05, foamG.gain)
    return () => { n.stop(); foam.stop(); a.stop(); b.stop(); d.stop() }
  },
  forest(c, out) {
    const wind = noise(c, 'pink')
    const wg = gainOf(c, 0.1)
    wind.connect(filter(c, 'bandpass', 1200, 0.4)).connect(wg).connect(out)
    const w = lfo(c, 0.06, 0.06, wg.gain)
    const birds = every(0.8, 3.5, () => {
      const base = 2300 + Math.random() * 1800
      const notes = 2 + Math.floor(Math.random() * 4)
      for (let i = 0; i < notes; i++) {
        const t = c.currentTime + i * 0.13
        const o = c.createOscillator()
        const env = c.createGain()
        o.frequency.setValueAtTime(base, t)
        o.frequency.exponentialRampToValueAtTime(base * 1.5, t + 0.07)
        env.gain.setValueAtTime(0, t)
        env.gain.linearRampToValueAtTime(0.05, t + 0.01)
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
        o.connect(env).connect(out)
        o.start(t)
        o.stop(t + 0.12)
      }
    })
    return () => { wind.stop(); w.stop(); birds() }
  },
  piano(c, out) {
    const delay = c.createDelay()
    delay.delayTime.value = 0.38
    const fb = gainOf(c, 0.38)
    const wet = filter(c, 'lowpass', 2200)
    delay.connect(fb).connect(delay)
    delay.connect(wet).connect(gainOf(c, 0.5)).connect(out)
    const bus = gainOf(c, 1)
    bus.connect(out)
    bus.connect(delay)
    const scale = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99]
    const notes = every(0.9, 2.4, () => {
      const f = scale[Math.floor(Math.random() * scale.length)]
      pluck(c, bus, f, c.currentTime, 3.2, 0.12, [[1, 1], [2, 0.28], [3, 0.08]])
      if (Math.random() < 0.3) pluck(c, bus, f / 2, c.currentTime, 4, 0.08, [[1, 1], [2, 0.2]])
    })
    return () => { notes(); setTimeout(() => delay.disconnect(), 4000) }
  },
  drone(c, out) {
    const lp = filter(c, 'lowpass', 380, 2)
    const g = gainOf(c, 0.12)
    lp.connect(g).connect(out)
    const oscs = [55, 55.35, 82.4, 110.2].map((f, i) => {
      const o = c.createOscillator()
      o.type = i < 3 ? 'sawtooth' : 'sine'
      o.frequency.value = f
      o.connect(lp)
      o.start()
      return o
    })
    const l = lfo(c, 0.03, 220, lp.frequency)
    return () => { oscs.forEach((o) => o.stop()); l.stop() }
  },
  cafe(c, out) {
    const n = noise(c, 'pink')
    const bp = filter(c, 'bandpass', 650, 0.8)
    const g = gainOf(c, 0.32)
    n.connect(bp).connect(g).connect(out)
    const a = lfo(c, 0.4, 0.08, g.gain)
    const b = lfo(c, 0.23, 180, bp.frequency)
    const clinks = every(1.5, 6, () => {
      pluck(c, out, 2600 + Math.random() * 1400, c.currentTime, 0.35, 0.025, [[1, 1], [2.76, 0.4]])
    })
    return () => { n.stop(); a.stop(); b.stop(); clinks() }
  },
}

/* ---------------- alarm tones ---------------- */

/** Starts a looping alarm tone with a fade-in; returns stop(). */
export function startTone(id: ToneId, fadeInSec = 30, startLevel = 0.15) {
  const c = unlockAudio()
  const g = c.createGain()
  g.gain.setValueAtTime(startLevel, c.currentTime)
  g.gain.linearRampToValueAtTime(0.7, c.currentTime + fadeInSec)
  g.connect(c.destination)
  const ring = () => {
    const t = c.currentTime + 0.02
    if (id === 'chime') {
      pluck(c, g, 1318.5, t, 1.4, 0.5, [[1, 1], [2.01, 0.25]])
      pluck(c, g, 1046.5, t + 0.35, 1.6, 0.5, [[1, 1], [2.01, 0.25]])
    } else if (id === 'pulse') {
      for (let i = 0; i < 4; i++) pluck(c, g, 660 * Math.pow(1.122, i), t + i * 0.16, 0.14, 0.35, [[1, 1]], 'triangle')
    } else {
      for (let i = 0; i < 4; i++) pluck(c, g, 1000, t + i * 0.18, 0.1, 0.25, [[1, 1]], 'square')
    }
  }
  ring()
  const id2 = window.setInterval(ring, id === 'chime' ? 2000 : 1300)
  return () => {
    clearInterval(id2)
    g.gain.cancelScheduledValues(c.currentTime)
    g.gain.setTargetAtTime(0, c.currentTime, 0.05)
    setTimeout(() => g.disconnect(), 400)
  }
}

/** Soft mechanical tick for the optional flip sound. Silent if audio is locked. */
export function tick() {
  if (!ctx || ctx.state !== 'running') return
  const t = ctx.currentTime
  const src = ctx.createBufferSource()
  const len = Math.floor(ctx.sampleRate * 0.03)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6)
  src.buffer = buf
  const bp = filter(ctx, 'bandpass', 2400, 1.2)
  const g = gainOf(ctx, 0.25)
  src.connect(bp).connect(g).connect(ctx.destination)
  src.start(t)
}
