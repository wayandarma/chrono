# CHRONO — Requirements (v1)

Status: **Approved** after three grilling rounds (2026-10-30). No production code yet.
Next step: `prototype` skill → three distinct visual directions → choose one.

---

## 1. Product & scope

A premium, immersive clock for the browser. It should feel like a crafted digital object, not a dashboard.

**In v1**
- Real-time 3D mechanical flip clock
- Alarms (one-time + weekday recurrence), snooze, missed-alarm handling
- Immersive mode (independent of native fullscreen)
- Cinematic image/video scenes
- Licensed ambient music + sleep timer (15/30/60 min, 30 s fade-out)
- Themes, accent color, typefaces, background dim/blur
- Responsive desktop + mobile, installable PWA with offline app shell

**Out of v1:** timer, stopwatch, world clocks, Pomodoro, user-uploaded media, streaming media APIs, settings export/import, hold-to-stop, backend/DB/auth.

## 2. Architecture

- **Stack:** Vite + React + TypeScript (static SPA), Tailwind CSS v4, Motion for React, `vite-plugin-pwa`.
- **No** Next.js, no state-management framework, no date library, no unnecessary abstractions. Plain React state/context plus a few focused modules (scheduler, storage, audio, media).
- **Animation split:** CSS transforms for continuous/frequent animation (flip digits, pulses, pixel shift). Motion for React only where it adds value: panels, dock, ringing screen, layout transitions.
- **Testing:** Vitest unit tests for alarm logic (fake timers, pinned time zones), plus a manual QA checklist for browser-only behavior.

## 3. Clock

- 12h/24h follows locale by default; user toggle.
- HH:MM as large flip cards; seconds **off** by default, optional smaller flip pair; small date beneath.
- **Flip mechanics:** each card split into top/bottom halves; top rotates 0→−90°, bottom +90→0° on X axis, with perspective, moving shadow gradient, mechanical easing and slight overshoot settle. Only changed digits animate.
- Reduced motion: digits crossfade instead of flipping.
- Optional mechanical tick sound, **off** by default.
- Each tick is scheduled to the next second boundary; the display always derives from `Date.now()`, never from a tick counter. Device clock is the source of truth (no NTP).
- Screen-reader time announcements are throttled to at most once per minute.

## 4. Alarms

### 4.1 Model & recurrence
- Fields: label, local wall-clock time `HH:MM`, weekdays (empty = once), tone, enabled toggle.
- Recurrence: once, or any weekday set; presets Weekdays / Weekends / Every day. Local time only, no time-zone selection.
- **Editor:** native `<input type="time">` (restyled), label, weekday chips + presets, tone picker with preview, enable toggle. The premium feel comes from the sheet and micro-interactions.
- **Defaults:** snooze 9 min (global setting); 30 s volume fade-in; auto-stop after 10 min, which records the occurrence as missed.

### 4.2 Occurrences & states
- Each occurrence resolves to a UTC instant. **Occurrence ID = `alarmId` + ISO 8601 UTC timestamp (`Z`).**
- Scheduling compares real wall-clock timestamps; timers are only wake-ups and never trusted for precision.
- On every check (tick, focus, visibility change, resume), each occurrence is in exactly one state:
  - **Upcoming:** in the future.
  - **Due:** 0–2 min past scheduled time, so it rings.
  - **Missed:** more than 2 min past, so it is **never** audible and shows a quiet "Missed" card.
- Each occurrence is handled once: handled IDs are persisted and pruned after 7 days.
- A missed recurring alarm moves on to its next occurrence.
- Snooze creates a new occurrence with its own ID.

### 4.3 Daylight-saving
- **Nonexistent time** (spring-forward gap, e.g. 02:30): ring at the first valid instant after it (03:00).
- **Repeated time** (fall-back overlap, e.g. 01:30): ring the **first** instance only.
- Implemented with native `Date` local arithmetic. Unit tests are pinned to America/New_York, Europe/London and Australia/Lord_Howe.

### 4.4 Overlapping alarms (queue)
- Grace is evaluated when an occurrence **becomes due**; once queued it stays Due until it is stopped or snoozed, or until auto-stop advances the queue. Every queued alarm gets its own full ringing turn.
- Earliest rings first; the ringing screen shows "+N more". All alarms share one audio channel and are never layered.
- A snoozed occurrence joins the **back** of the queue when it comes due.
- The queue is persisted; a reload mid-ring restores it.

### 4.5 Ringing screen
- Full-viewport takeover: current time, label, slow accent-color pulse (static glow under reduced motion).
- **Snooze:** large primary button.
- **Stop:** clearly labeled button with single tap/click or standard keyboard activation (Enter/Space on focus).
- Focus moves into the ringing screen and returns to its prior position afterward. Proper dialog semantics and live-region announcement.
- While ringing, alarm controls take priority over global shortcuts.

### 4.6 Browser-limitation stance
- Alarms ring **only while CHRONO is open in a tab**. The UI says so honestly: "Alarms active — keep CHRONO open". No phone-alarm reliability is promised.
- Notifications are a desktop extra only and never treated as a reliability guarantee.

## 5. Audio

- **Activation:** the `AudioContext` is created or resumed **directly inside a user gesture** (any tap/click; saving an alarm counts).
- **"Alarm Sound Ready" indicator** shows only when the context is actually `running`. The app listens for state changes; if the context is suspended again, the indicator turns off and the "Tap to enable alarm sound" banner returns. If an alarm is due while audio is locked, that banner pulses.
- **Alarm tones:** 3 synthesized via Web Audio (soft chime, rising pulse, classic beep) plus 1–2 licensed recorded chimes, preloaded only if an alarm uses them. A recorded tone that fails falls back silently to a synthesized one.
- **Music during an alarm:** music fades out over ~2 s and pauses. After the alarm, a "Resume music" chip appears. Music does not resume automatically.
- Music never autoplays; the selected track is remembered, but it plays only after a tap.

## 6. Multi-tab coordination

- **Persistence & change notification:** LocalStorage plus `storage` events. LocalStorage is **not** treated as a lock.
- **Leader election (Web Locks):** one tab holds `chrono-alarm-leader` and is the only tab that schedules and plays sound. Other tabs show "Alarms handled in another tab".
- **Heartbeat:** the leader broadcasts on BroadcastChannel every 5 s, including its `visibilityState`.
- **Handoff:** a visible tab that sees a hidden leader, or no heartbeat for 15 s, requests the lock with `steal: true`. When a tab loses the lock its request rejects, and it immediately stops its scheduler and audio. A takeover mid-ring keeps the persisted queue and continues ringing in the new tab.
- **Lone hidden tab:** stays leader and still attempts to ring.
- **Duplicate-ring guard:** before ringing, a tab writes a claim `{occurrenceId, tabId, claimedAt}` to LocalStorage and broadcasts it. Any tab seeing a claim under 30 s old for the same occurrence stays silent.
- **Fallback (no Web Locks):** all tabs schedule and only the claim/broadcast guards against duplicates. Documented as best-effort: exclusive execution is not guaranteed.
- **Edits:** per-alarm `updatedAt`, last write wins, and other tabs reload on `storage` events. No merge UI.

## 7. Immersive mode, fullscreen, wake lock

- **Immersive mode** is CHRONO's own UI state, independent of native fullscreen. Controls hide and reveal on pointer move, tap or key press for 3 s.
- **Native fullscreen** is an enhancement, enabled only after **feature detection** rather than device sniffing. Where it's unavailable (e.g. iPhone Safari), show a hint to Add to Home Screen for standalone mode.
- **Wake lock:** requested on entering immersive mode, released on exit, re-acquired on visibility return. Optional toggle outside immersive mode. Failures are handled gracefully.
- **Battery messaging:** a brief "Screen stays on" indicator with the tooltip "Keeps your display awake; plug in for overnight use." If the lock fails or is unsupported, it reads "Screen may sleep" with the reason. No battery-level display.
- **OLED pixel shift:** a slow, few-pixel transform of the clock layer only in immersive mode. Transform-based, so no layout shift, no effect on focus, hit targets or reading order. Disabled under reduced motion.

## 8. Layout & controls

- **Hero clock**, centered. Beneath it: date and a "Next alarm in 6h 12m" chip that opens Alarms.
- **Floating bottom dock** with 5 buttons: Alarms, Scene, Sound, Style, Immersive. No top nav, no grid.
- **Panels:** glass side sheet on the right (desktop); draggable bottom sheet (mobile).
- **Control visibility:**
  - Normal mode: the dock dims to ~40% after 5 s idle.
  - Immersive mode: controls fully hidden.
  - Never hidden while a panel is open or focus is inside controls.
  - Keyboard focus reveals controls.
  - Hidden controls are `inert`.
- **Accessibility setting "Always Show Controls"** disables all auto-hiding. No screen-reader detection.
- **Mobile:** portrait stacks hours above minutes; landscape is side by side. Respects safe-area insets and uses `dvh` units.
- **Keyboard shortcuts** (listed in a `?` overlay; context-aware; disabled in text inputs; ringing controls take precedence):
  - I: immersive
  - F: native fullscreen (if supported)
  - M: music
  - A: Alarms
  - S: Scene
  - T: Style
  - Esc: close panel
- **First run:** no tour. Default theme, Midnight City image, music off, one dismissible hint: "Tap anywhere to enable sound · Press I for immersive."
- **Notifications:** an optional **Enable Notifications** action appears after the first alarm is created. Permission is requested only from that explicit gesture and never on load. If denied, show a small note and never ask again.

## 9. Visual design priority

- Realistic mechanical flip, sophisticated typography, cinematic backgrounds, elegant transitions, crafted micro-interactions.
- **Themes:** Midnight, Paper, Neon, Ember, Mono, plus accent picker, 2–3 clock typefaces, background dim/blur. Scene dominant color subtly tints the theme.
- Must keep WCAG 2.2 AA contrast and full reduced-motion support.

## 10. Media

### 10.1 Scenes (independent from music; each has poster + dominant color + suggested track)

| Scene | Image | Video |
|---|---|---|
| Midnight City (default) | ✔ | rain on window |
| Blue Hour Ocean | ✔ | slow waves |
| Misty Pines | ✔ | drifting fog |
| Desert Dusk | ✔ | — |
| Alpine Snow | ✔ | — |
| Ink & Smoke | ✔ | slow ink plume |

### 10.2 Music
Rain, Ocean, Forest at Dawn, Soft Piano, Deep Space Drone, Café Murmur. Seamless 2–5 min loops, AAC/M4A at ~128 kbps.

### 10.3 Performance
- Images are the default everywhere; video is opt-in, muted, inline, lazy-loaded, ≤720p and ~6 MB.
- Only the **currently selected** video or audio is ever loaded. Posters are always shown first.
- Under `prefers-reduced-motion` or Save-Data, video is replaced by its poster.

### 10.4 Licensing
- **Accepted:** CC0 or public domain preferred; CC BY with attribution.
- **Rejected:** personal-use-only or no-redistribution terms, since bundled files are downloadable. Pexels and Pixabay are **not** assumed to be CC0, and each asset's license is verified individually.
- **`assets/manifest.json`** records for each asset: source URL, author, license name, license URL, date verified and notes. The Credits & Licenses panel is generated from it.
- Until assets are verified, prototypes and dev builds use gradient or procedural placeholders.

## 11. Persistence

Each LocalStorage key holds `{ version, data }`, with a migration function per key.

- **`chrono:v1:settings`**:
  - Clock: hour format, seconds, typeface
  - Style: theme, accent, dim/blur
  - Scene: scene ID + video/image preference
  - Sound: track ID, volume, sleep-timer default
  - Alarm defaults: snooze minutes, default tone
  - Toggles: tick sound, wake lock outside immersive, Always Show Controls
  - Dismissed hints
- **`chrono:v1:alarms`**: `{ id, label, time, days[], toneId, enabled, createdAt, updatedAt, onceDate? }[]`
- **`chrono:v1:runtime`**:
  - `handled` occurrence IDs (7-day prune)
  - `missed[]`
  - `queue[]`
  - `snoozes[]`
  - Current ringing claim
- No media is stored. No playback state is auto-restored.

## 12. Empty states & errors

**Empty states** (minimal, typographic):
- No alarms: "No alarms set." + **New alarm**; next-alarm chip hidden.
- All alarms disabled: chip reads "Alarms paused".
- Missed alarms: a quiet card with Dismiss / Dismiss all.
- Music off: track list with play affordances.
- Another tab is leader: status line in the Alarms panel.

**Errors** (never crash):

| Failure | Behavior |
|---|---|
| Storage blocked or full | In-memory session + banner "Changes won't be saved on this device." |
| Corrupt JSON | Back up raw value to `chrono:corrupt:<ts>`, reset that key, show a notice |
| Video fails | Poster, then gradient |
| Track fails | "Couldn't load track", no auto-retry |
| Recorded tone fails | Silent fallback to synthesized tone |
| Audio suspended | Banner returns, Sound Ready indicator off |
| Wake lock or fullscreen refused | Immersive mode continues, indicator explains |
| Notifications denied | Note shown, never re-asked |

## 13. PWA

- Web app manifest + icons, so CHRONO can be installed and run in standalone mode.
- Service worker via `vite-plugin-pwa` precaches the app shell. Media is runtime-cached only once selected.

## 14. Acceptance criteria

1. **Browsers:** latest 2 versions of Chrome, Edge, Firefox, Safari (macOS); Safari iOS/iPadOS 16.4+; Chrome Android.
2. **Alarm logic unit-tested** (Vitest, fake timers, pinned time zones): next-occurrence calculation, the three states, the 2-minute grace, once-only handling, DST gap and overlap, queue and snooze ordering, pruning.
3. **Ringing:**
   - A due alarm in a foreground tab rings within ~1 s of its time.
   - Returning hours late never plays sound and shows only Missed cards.
   - No double ring across two tabs where Web Locks is supported.
   - A queued alarm is never silently missed because another was ringing.
4. **Performance:**
   - Initial JS ≤150 KB gzipped; LCP <2 s on a mid-range phone over 4G.
   - Flip animation at 60 fps on a mid-range Android phone; CLS ≈ 0 during flips and pixel shift.
   - Only the selected media is downloaded.
5. **Accessibility:**
   - WCAG 2.2 AA contrast over every scene at the default dim.
   - Full keyboard operation; correct focus management for panels and the ringing screen.
   - Throttled time announcements.
   - Complete reduced-motion support.
   - "Always Show Controls" setting.
6. **Manual QA checklist** covers fullscreen, wake lock, audio unlock and re-suspension, iOS standalone mode, Web Locks handoff and the no-Web-Locks fallback.
