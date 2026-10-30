import manifest from '../../assets/manifest.json'
import { ACCENTS, THEMES, type ThemeId } from '../../data/themes'
import { TONES } from '../../lib/audio'
import type { ToneId } from '../../lib/schedule'
import { settingsStore, type Settings } from '../../state'
import { Chip, Row, Switch } from '../ui'

export function StylePanel({ settings: s, sceneAccent }: { settings: Settings; sceneAccent: string }) {
  const set = (patch: Partial<Settings>) => settingsStore.set((prev) => ({ ...prev, ...patch }))

  return (
    <div className="flex flex-col gap-8 pt-4">
      <section>
        <h3 className="legend">Theme</h3>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => {
            const t = THEMES[id]
            const on = s.theme === id
            return (
              <button key={id} onClick={() => set({ theme: id })} aria-pressed={on} className="flex flex-col items-center gap-2">
                <span
                  className={`digits-condensed grid h-14 w-full place-items-center rounded-xl text-[22px] ${on ? 'outline-3 outline-offset-2 outline-[var(--accent)]' : ''}`}
                  style={{ background: t.card, color: t.digit, boxShadow: `inset 0 0 0 1px ${t.line}` }}
                >
                  08
                </span>
                <span className="text-[13px] font-medium">{t.name}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h3 className="legend">Accent</h3>
        <div className="mt-3 flex flex-wrap gap-3">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => set({ accent: a.id })}
              aria-pressed={s.accent === a.id}
              aria-label={a.name}
              title={a.name}
              className={`h-10 w-10 rounded-full ${s.accent === a.id ? 'outline-3 outline-offset-2 outline-[var(--fg)]' : ''}`}
              style={{ background: a.value || `conic-gradient(${sceneAccent} 0 50%, transparent 50%)`, boxShadow: 'inset 0 0 0 1px var(--line)' }}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="legend">Clock typeface</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(['condensed', 'wide'] as const).map((f) => (
            <button
              key={f}
              onClick={() => set({ typeface: f })}
              aria-pressed={s.typeface === f}
              className={`min-h-14 rounded-xl border text-[26px] [font-family:var(--font-archivo)] ${s.typeface === f ? 'border-[var(--accent)]' : 'border-[var(--line)]'}`}
              style={{ fontVariationSettings: f === 'wide' ? "'wdth' 100" : "'wdth' 72", fontWeight: f === 'wide' ? 600 : 700 }}
            >
              12:45 <span className="ml-1 text-[12px] font-semibold capitalize text-[var(--muted)] [font-family:var(--font-manrope)]">{f}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="legend">Clock</h3>
        <div className="mt-3 flex gap-2">
          {(['auto', '12', '24'] as const).map((f) => (
            <Chip key={f} on={s.hourFormat === f} onClick={() => set({ hourFormat: f })}>
              {f === 'auto' ? 'Auto' : `${f}-hour`}
            </Chip>
          ))}
        </div>
        <div className="mt-2">
          <Row label="Show seconds">
            <Switch on={s.showSeconds} label="Show seconds" onChange={() => set({ showSeconds: !s.showSeconds })} />
          </Row>
          <Row label="Flip tick sound" hint="A soft click each minute">
            <Switch on={s.tickSound} label="Flip tick sound" onChange={() => set({ tickSound: !s.tickSound })} />
          </Row>
        </div>
        <label className="mt-5 block">
          <span className="legend">Background dim</span>
          <input type="range" min={0} max={0.7} step={0.01} value={s.dim} onChange={(e) => set({ dim: Number(e.target.value) })} className="mt-2 w-full" />
        </label>
      </section>

      <section>
        <h3 className="legend">Alarms</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[5, 9, 10, 15].map((m) => (
            <Chip key={m} on={s.snoozeMinutes === m} onClick={() => set({ snoozeMinutes: m })} label={`Snooze ${m} minutes`}>
              Snooze {m} min
            </Chip>
          ))}
        </div>
        <label className="mt-4 block">
          <span className="legend">Default sound for new alarms</span>
          <select
            value={s.defaultTone}
            onChange={(e) => set({ defaultTone: e.target.value as ToneId })}
            className="mt-2 h-12 w-full rounded-xl border border-[var(--line)] bg-transparent px-4 text-[16px] [&>option]:bg-[var(--bar)]"
          >
            {TONES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section>
        <h3 className="legend">Accessibility & power</h3>
        <div className="mt-2">
          <Row label="Always show controls" hint="Never dim or hide the bars">
            <Switch on={s.alwaysShowControls} label="Always show controls" onChange={() => set({ alwaysShowControls: !s.alwaysShowControls })} />
          </Row>
          <Row label="Keep screen awake" hint="Immersive mode always does; this applies everywhere. Uses more battery.">
            <Switch on={s.wakeLockOutsideImmersive} label="Keep screen awake" onChange={() => set({ wakeLockOutsideImmersive: !s.wakeLockOutsideImmersive })} />
          </Row>
        </div>
      </section>

      <section>
        <h3 className="legend">Credits & licenses</h3>
        <ul className="mt-3 flex flex-col gap-4">
          {manifest.assets.map((a) => (
            <li key={a.id} className="text-[13px] leading-relaxed">
              <span className="block text-[14px] font-semibold">{a.title}</span>
              <span className="block text-[var(--muted)]">
                {a.author} · {a.licenseUrl ? <a className="underline underline-offset-2" href={a.licenseUrl} target="_blank" rel="noreferrer">{a.license}</a> : a.license}
              </span>
              <span className="block text-[var(--muted)]">{a.source}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
