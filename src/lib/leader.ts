// Which tab runs the alarm scheduler and plays sound.
//
// With Web Locks: one tab holds `chrono-alarm-leader`. The leader broadcasts a
// heartbeat (with its visibility) every 5 s. A visible tab that sees a hidden
// leader, or no heartbeat for 15 s, steals the lock; the old leader's request
// rejects and it stops at once, then queues up again behind the new leader.
//
// Without Web Locks every tab schedules; the ringing claim in runtime storage
// is the only duplicate guard, so exclusive execution is best-effort.

export const TAB_ID = crypto.randomUUID()
const LOCK = 'chrono-alarm-leader'
const HEARTBEAT_MS = 5_000
const STALE_MS = 15_000

type Msg =
  | { type: 'heartbeat'; tabId: string; visible: boolean }
  | { type: 'ringing'; tabId: string; occurrenceId: string }
  | { type: 'ring-ended'; tabId: string; occurrenceId: string }

export const channel: BroadcastChannel | null = 'BroadcastChannel' in window ? new BroadcastChannel('chrono') : null

export const hasWebLocks = !!navigator.locks?.request

export function broadcast(msg: Msg) {
  channel?.postMessage(msg)
}

export function onMessage(fn: (msg: Msg) => void) {
  if (!channel) return () => {}
  const h = (e: MessageEvent<Msg>) => fn(e.data)
  channel.addEventListener('message', h)
  return () => channel.removeEventListener('message', h)
}

/** Starts leader election; calls `onChange` whenever this tab gains or loses leadership. */
export function startLeadership(onChange: (leader: boolean) => void) {
  if (!hasWebLocks) {
    onChange(true)
    return () => {}
  }

  let leader = false
  let release: (() => void) | null = null
  let stopped = false
  let lastHeartbeat = { at: 0, visible: true }

  const setLeader = (v: boolean) => {
    if (leader === v) return
    leader = v
    onChange(v)
    if (v) beat()
  }

  let waiting: AbortController | null = null

  const request = (steal: boolean) => {
    if (stopped) return
    // Only ever one request in flight: a steal replaces our place in line.
    waiting?.abort()
    const ctl = new AbortController()
    waiting = steal ? null : ctl
    navigator.locks
      .request(LOCK, steal ? { steal: true } : { signal: ctl.signal }, () => {
        if (waiting === ctl) waiting = null
        setLeader(true)
        return new Promise<void>((r) => (release = r))
      })
      .catch(() => {
        if (ctl.signal.aborted || stopped) return // we cancelled it ourselves
        // Lock stolen by a visible tab: stop and wait in line again.
        release = null
        setLeader(false)
        request(false)
      })
  }

  const beat = () => {
    if (leader) broadcast({ type: 'heartbeat', tabId: TAB_ID, visible: document.visibilityState === 'visible' })
  }

  const maybeSteal = () => {
    if (leader || document.visibilityState !== 'visible') return
    const stale = Date.now() - lastHeartbeat.at > STALE_MS
    if (!lastHeartbeat.visible || stale) request(true)
  }

  const offMsg = onMessage((m) => {
    if (m.type !== 'heartbeat' || m.tabId === TAB_ID) return
    lastHeartbeat = { at: Date.now(), visible: m.visible }
    maybeSteal()
  })

  const onVisibility = () => {
    beat()
    maybeSteal()
  }
  document.addEventListener('visibilitychange', onVisibility)
  const interval = window.setInterval(() => {
    beat()
    maybeSteal()
  }, HEARTBEAT_MS)

  lastHeartbeat.at = Date.now() // give an existing leader one interval to speak up
  request(false)

  return () => {
    stopped = true
    clearInterval(interval)
    document.removeEventListener('visibilitychange', onVisibility)
    offMsg()
    waiting?.abort()
    release?.()
  }
}
