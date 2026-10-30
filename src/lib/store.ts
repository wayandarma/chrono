// Tiny persisted stores over LocalStorage: `{ version, data }` per key, a
// migration hook, corrupt-data backup, an in-memory fallback when storage is
// blocked or full, and cross-tab reloads via the `storage` event.
// LocalStorage is persistence + change notification only — never a lock.
import { useSyncExternalStore } from 'react'

export type StorageIssue = { kind: 'unavailable' } | { kind: 'corrupt'; key: string; backupKey: string }

type Envelope = { version: number; data: unknown }

const issueListeners = new Set<() => void>()
let issues: StorageIssue[] = []
function report(issue: StorageIssue) {
  if (issue.kind === 'unavailable' && issues.some((i) => i.kind === 'unavailable')) return
  issues = [...issues, issue]
  issueListeners.forEach((l) => l())
}
export function dismissIssue(issue: StorageIssue) {
  issues = issues.filter((i) => i !== issue)
  issueListeners.forEach((l) => l())
}
export function useStorageIssues() {
  return useSyncExternalStore(
    (l) => (issueListeners.add(l), () => issueListeners.delete(l)),
    () => issues,
  )
}

const available = (() => {
  try {
    const k = 'chrono:probe'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
})()
if (!available) report({ kind: 'unavailable' })

export type Store<T> = {
  get: () => T
  set: (next: T | ((prev: T) => T)) => void
  subscribe: (l: () => void) => () => void
  /** Re-read from storage (fresh view of another tab's writes). */
  reload: () => T
}

export function createStore<T>(opts: {
  key: string
  version: number
  defaults: T
  /** Turn stored data (possibly an older version) into T. Throw if unusable. */
  migrate: (data: unknown, version: number) => T
}): Store<T> {
  const { key, version, defaults, migrate } = opts
  const listeners = new Set<() => void>()

  const read = (): T => {
    if (!available) return defaults
    let raw: string | null = null
    try {
      raw = localStorage.getItem(key)
      if (raw == null) return defaults
      const env = JSON.parse(raw) as Envelope
      if (typeof env !== 'object' || env == null || typeof env.version !== 'number') throw new Error('bad envelope')
      return migrate(env.data, env.version)
    } catch {
      const backupKey = `chrono:corrupt:${Date.now()}`
      try {
        if (raw != null) localStorage.setItem(backupKey, raw)
        localStorage.removeItem(key)
      } catch {
        /* storage gone mid-flight; defaults still apply */
      }
      report({ kind: 'corrupt', key, backupKey })
      return defaults
    }
  }

  let state = read()
  const emit = () => listeners.forEach((l) => l())

  const write = () => {
    if (!available) return
    try {
      localStorage.setItem(key, JSON.stringify({ version, data: state } satisfies Envelope))
    } catch {
      report({ kind: 'unavailable' })
    }
  }

  window.addEventListener('storage', (e) => {
    if (e.key !== key) return
    state = read()
    emit()
  })

  return {
    get: () => state,
    set(next) {
      state = typeof next === 'function' ? (next as (p: T) => T)(state) : next
      write()
      emit()
    },
    subscribe(l) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    reload() {
      state = read()
      emit()
      return state
    },
  }
}

export function useStore<T>(store: Store<T>) {
  return useSyncExternalStore(store.subscribe, store.get)
}

/** Shallow-merge stored objects over defaults so new fields get defaults. */
export function withDefaults<T extends object>(data: unknown, defaults: T): T {
  if (typeof data !== 'object' || data == null || Array.isArray(data)) throw new Error('not an object')
  return { ...defaults, ...(data as Partial<T>) }
}
