// PROTOTYPE — floating variant switcher. Deliberately off-brand so it reads as tooling.
import { useEffect } from 'react'

type Props = {
  variants: { key: string; name: string }[]
  current: string
  onChange: (key: string) => void
  ringing: boolean
  onRing: () => void
  /** Lift the bar above a variant's own bottom chrome. */
  bottom?: string
}

export function PrototypeSwitcher({ variants, current, onChange, ringing, onRing, bottom }: Props) {
  const i = variants.findIndex((v) => v.key === current)
  const prev = () => onChange(variants[(i - 1 + variants.length) % variants.length].key)
  const next = () => onChange(variants[(i + 1) % variants.length].key)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const btn = 'grid h-7 min-w-7 place-items-center rounded-full px-2 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-yellow-300'
  return (
    <div
      className="fixed bottom-2 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-1 rounded-full border border-yellow-300/60 bg-neutral-950/90 px-1.5 py-1 font-mono text-[11px] text-yellow-100 shadow-lg backdrop-blur"
      style={bottom ? { bottom } : undefined}
      role="toolbar"
      aria-label="Prototype variant switcher"
    >
      <button className={btn} onClick={prev} aria-label="Previous variant">←</button>
      <span className="px-1 whitespace-nowrap">
        {current} <span className="opacity-60">({variants[i].name})</span>
      </span>
      <button className={btn} onClick={next} aria-label="Next variant">→</button>
      <span className="mx-1 h-4 w-px bg-white/20" />
      <button className={`${btn} whitespace-nowrap`} onClick={onRing} aria-pressed={ringing}>
        {ringing ? '■ end ring' : '◉ preview ring'}
      </button>
    </div>
  )
}
