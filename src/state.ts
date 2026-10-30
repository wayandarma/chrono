// The three persisted keys: settings, alarms, runtime.
import { createStore, withDefaults } from './lib/store'
import type { Alarm, Occurrence, Snooze, ToneId } from './lib/schedule'
import type { SceneId } from './data/scenes'
import type { AccentId, ThemeId } from './data/themes'
import type { TrackId } from './lib/audio'

export type Settings = {
  hourFormat: 'auto' | '12' | '24'
  showSeconds: boolean
  typeface: 'condensed' | 'wide'
  theme: ThemeId
  accent: AccentId
  dim: number
  blur: number
  sceneId: SceneId
  trackId: TrackId | null
  volume: number
  snoozeMinutes: number
  defaultTone: ToneId
  tickSound: boolean
  wakeLockOutsideImmersive: boolean
  alwaysShowControls: boolean
  dismissedHints: string[]
}

export const DEFAULT_SETTINGS: Settings = {
  hourFormat: 'auto',
  showSeconds: false,
  typeface: 'condensed',
  theme: 'midnight',
  accent: 'scene',
  dim: 0.35,
  blur: 0,
  sceneId: 'midnight',
  trackId: null,
  volume: 0.6,
  snoozeMinutes: 9,
  defaultTone: 'chime',
  tickSound: false,
  wakeLockOutsideImmersive: false,
  alwaysShowControls: false,
  dismissedHints: [],
}

export const settingsStore = createStore<Settings>({
  key: 'chrono:v1:settings',
  version: 1,
  defaults: DEFAULT_SETTINGS,
  migrate: (data) => withDefaults(data, DEFAULT_SETTINGS),
})

export const alarmsStore = createStore<Alarm[]>({
  key: 'chrono:v1:alarms',
  version: 1,
  defaults: [],
  migrate: (data) => {
    if (!Array.isArray(data)) throw new Error('alarms must be an array')
    return data.filter((a): a is Alarm => typeof a?.id === 'string' && /^\d\d:\d\d$/.test(a?.time) && Array.isArray(a?.days))
  },
})

export type Runtime = {
  /** occurrenceId → handledAt (ms). Pruned after 7 days. */
  handled: Record<string, number>
  missed: Occurrence[]
  queue: Occurrence[]
  snoozes: Snooze[]
  claim: { occurrenceId: string; tabId: string; claimedAt: number } | null
  lastCheckedAt: number
}

export const runtimeStore = createStore<Runtime>({
  key: 'chrono:v1:runtime',
  version: 1,
  defaults: { handled: {}, missed: [], queue: [], snoozes: [], claim: null, lastCheckedAt: Date.now() },
  migrate: (data) => withDefaults(data, { handled: {}, missed: [], queue: [], snoozes: [], claim: null, lastCheckedAt: Date.now() }),
})
