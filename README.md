# CHRONO

An immersive flip clock for the browser: alarms, procedural scenes, synthesized
ambient sound, themes, and an installable offline app shell. No backend.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # alarm scheduling unit tests (Vitest, pinned time zones)
npm run build    # type-check + production build + service worker
```

Requirements: [`docs/requirements.md`](docs/requirements.md).

## Layout

| Path | What it is |
|---|---|
| `src/lib/schedule.ts` | Pure alarm logic: occurrences as UTC instants, DST gap/overlap rules, upcoming/due/missed with a 2-minute grace. Fully unit-tested. |
| `src/lib/store.ts` | LocalStorage stores (`{version, data}`), migrations, corrupt-data backup, in-memory fallback, cross-tab reloads. |
| `src/state.ts` | The three keys: `chrono:v1:settings`, `chrono:v1:alarms`, `chrono:v1:runtime`. |
| `src/lib/leader.ts` | Web Locks leader election with visible-tab takeover; claim-based fallback. |
| `src/useAlarmEngine.ts` | Scheduler + persisted queue + ringing, run in the leader tab only. |
| `src/lib/audio.ts` | Web Audio: ambient tracks, alarm tones, flip tick. Unlocked only by a user gesture. |
| `src/data/scenes.tsx` | Six procedural scenes (placeholders for licensed media). |
| `src/assets/manifest.json` | Credits & licenses manifest; the in-app credits list is generated from it. |
| branch `prototype/visual-directions` | Throwaway design prototypes A–D and the verdict (not in main). |

## Browser limitations (by design)

- Alarms ring **only while CHRONO is open**. Background tabs are throttled and
  mobile browsers suspend them; there is no push without a backend.
- Sound needs one tap/click per session (autoplay policy).
- iPhone Safari has no element fullscreen: immersive mode works everywhere,
  native fullscreen is offered only where supported. Add to Home Screen for a
  chrome-free standalone app.
- Without Web Locks, double-ring protection across tabs is best-effort.

## Manual QA checklist

- [ ] Fullscreen toggles on desktop Chrome/Firefox/Safari; hidden on iPhone.
- [ ] Immersive mode holds a wake lock ("Screen stays on"); re-acquired after switching tabs.
- [ ] First tap unlocks audio ("Alarm sound ready"); after an interruption (e.g. iOS call) the banner returns.
- [ ] Alarm set 1 minute ahead rings in a foreground tab within ~1 s; Snooze / Stop work by tap, Enter, and Space.
- [ ] Reopen hours after an alarm time: no sound, Missed card shown.
- [ ] Two tabs open: only one rings; hiding the ringing tab and focusing the other hands over without a double ring.
- [ ] iOS standalone (Add to Home Screen): launches without browser chrome, safe areas respected.
- [ ] Offline: reload with network off — app shell loads.
