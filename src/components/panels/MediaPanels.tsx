import { useSyncExternalStore } from 'react'
import { SCENE_LIST, Scene, type SceneId } from '../../data/scenes'
import { TRACKS, playTrack, playingTrack, stopTrack, subscribeTrack, type TrackId } from '../../lib/audio'
import { settingsStore, type Settings } from '../../state'
import { Chip, Note } from '../ui'

export function usePlayingTrack() {
  return useSyncExternalStore(subscribeTrack, playingTrack)
}

export function ScenePanel({ settings }: { settings: Settings }) {
  const pick = (sceneId: SceneId) => settingsStore.set((s) => ({ ...s, sceneId }))
  return (
    <div className="pt-4">
      <div className="grid grid-cols-2 gap-3">
        {SCENE_LIST.map((s) => {
          const on = settings.sceneId === s.id
          return (
            <button
              key={s.id}
              onClick={() => pick(s.id)}
              aria-pressed={on}
              className={`relative aspect-[16/11] overflow-hidden rounded-2xl text-left outline-offset-2 transition-transform duration-300 hover:scale-[1.02] ${on ? 'outline-3 outline-[var(--accent)]' : ''}`}
            >
              <Scene id={s.id} />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-[14px] font-semibold text-white">
                {s.name}
                {on && <span className="ml-2 text-[11px] tracking-[0.12em] uppercase opacity-80">Showing</span>}
              </span>
            </button>
          )
        })}
      </div>
      <label className="mt-6 block">
        <span className="legend">Background blur</span>
        <input type="range" min={0} max={16} step={1} value={settings.blur} onChange={(e) => settingsStore.set((s) => ({ ...s, blur: Number(e.target.value) }))} className="mt-2 w-full" />
      </label>
      <Note>Scenes are original animated placeholders. Licensed photos and video loops will replace them once each license is verified.</Note>
    </div>
  )
}

type SleepProps = { sleepAt: number | null; setSleepAt: (t: number | null) => void; now: Date }

export function SoundPanel({ settings, sleepAt, setSleepAt, now }: { settings: Settings } & SleepProps) {
  const playing = usePlayingTrack()
  const toggle = (id: TrackId) => {
    if (playing === id) stopTrack()
    else playTrack(id)
    settingsStore.set((s) => ({ ...s, trackId: id }))
  }
  const left = sleepAt ? Math.max(0, Math.ceil((sleepAt - now.getTime()) / 60_000)) : 0

  return (
    <div className="pt-2">
      <ul>
        {TRACKS.map((t) => {
          const on = playing === t.id
          return (
            <li key={t.id} className="border-b border-[var(--line)]">
              <button onClick={() => toggle(t.id)} aria-pressed={on} className="flex min-h-14 w-full items-center gap-4 text-left">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] ${on ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'border border-[var(--line)]'}`} aria-hidden>
                  {on ? '❚❚' : '▶'}
                </span>
                <span className={`flex-1 text-[17px] ${on ? 'font-semibold' : ''}`}>{t.name}</span>
                {on && (
                  <span className="eq" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <label className="mt-6 block">
        <span className="legend">Volume</span>
        <input type="range" min={0} max={1} step={0.01} value={settings.volume} onChange={(e) => settingsStore.set((s) => ({ ...s, volume: Number(e.target.value) }))} className="mt-2 w-full" />
      </label>
      <div className="mt-6">
        <span className="legend">Sleep timer{sleepAt ? ` · ${left} min left` : ''}</span>
        <div className="mt-2 flex gap-2">
          {[0, 15, 30, 60].map((m) => (
            <Chip key={m} on={m === 0 && !sleepAt} onClick={() => setSleepAt(m ? Date.now() + m * 60_000 : null)}>
              {m ? `${m} min` : 'Off'}
            </Chip>
          ))}
        </div>
      </div>
      <Note>These ambient tracks are synthesized live in your browser — no recordings yet. Licensed recordings with credits will replace them.</Note>
    </div>
  )
}
