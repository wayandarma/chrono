import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { tick } from '../lib/audio'

/** One mechanical flip card. Mechanics in index.css; only changed digits animate. */
export function FlipDigit({ value }: { value: string }) {
  const [s, setS] = useState({ cur: value, prev: value, n: 0 })
  if (s.cur !== value) setS({ cur: value, prev: s.cur, n: s.n + 1 })
  const flipping = s.n > 0
  return (
    <span className="flip chrono-flip" aria-hidden="true">
      <span className="flip__half flip__half--top flip__static-top">
        <span className="flip__glyph" key={`t${s.n}`}>{s.cur}</span>
      </span>
      <span className={`flip__half flip__half--bottom flip__static-bottom ${flipping ? 'is-flipping' : ''}`} key={`b${s.n}`}>
        <span className="flip__glyph">{s.prev}</span>
      </span>
      {flipping && (
        <span key={s.n}>
          <span className="flip__half flip__half--top flip__leaf-top">
            <span className="flip__glyph">{s.prev}</span>
          </span>
          <span className="flip__half flip__half--bottom flip__leaf-bottom">
            <span className="flip__glyph">{s.cur}</span>
          </span>
        </span>
      )}
    </span>
  )
}

export function use12h(format: 'auto' | '12' | '24') {
  if (format !== 'auto') return format === '12'
  const hc = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle
  return hc === 'h12' || hc === 'h11'
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')

/** Slow few-pixel drift against OLED burn-in. Transform-only, so no layout shift. */
function usePixelShift(active: boolean) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  useEffect(() => {
    if (!active || reducedMotion.matches) return setOffset({ x: 0, y: 0 })
    const id = window.setInterval(() => setOffset({ x: Math.round(Math.random() * 8 - 4), y: Math.round(Math.random() * 8 - 4) }), 120_000)
    return () => clearInterval(id)
  }, [active])
  return offset
}

type Props = {
  now: Date
  twelve: boolean
  showSeconds: boolean
  compact: boolean
  immersive: boolean
  hidden: boolean
  tickSound: boolean
}

export function Clock({ now, twelve, showSeconds, compact, immersive, hidden, tickSound }: Props) {
  let h = now.getHours()
  const meridiem = h < 12 ? 'AM' : 'PM'
  if (twelve) h = h % 12 || 12
  const hh = String(h).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const shift = usePixelShift(immersive)

  useEffect(() => {
    if (tickSound) tick()
  }, [mm, tickSound])

  const date = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  const spoken = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  return (
    <motion.div
      layout
      animate={{ opacity: hidden ? 0 : 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`absolute left-[clamp(16px,7vw,120px)] right-4 ${
        compact ? 'top-[calc(var(--bar-h)+16px)]' : immersive ? 'bottom-[12vh]' : 'bottom-[calc(var(--bar-h)+6vh)]'
      }`}
    >
      {/* Announced at most once a minute: the text only changes per minute. */}
      <span className="sr-only" aria-live="polite">{spoken}</span>
      <div style={{ transform: `translate3d(${shift.x}px, ${shift.y}px, 0)`, transition: 'transform 60s linear' }}>
        {!compact && (
          <motion.p layout="position" className="mb-3 text-[clamp(20px,2.2vw,28px)] italic opacity-90 [font-family:var(--font-instrument)]">
            {date}
          </motion.p>
        )}
        <div
          aria-hidden
          className={`flex leading-none ${
            compact
              ? 'flex-row items-end gap-[0.1em] text-[clamp(52px,15vw,92px)]'
              : 'flex-col items-start gap-[0.06em] text-[clamp(110px,36vw,230px)] landscape:flex-row landscape:items-end landscape:gap-[0.1em] landscape:text-[clamp(84px,15vw,240px)] lg:flex-row lg:items-end lg:gap-[0.1em] lg:text-[clamp(96px,15vw,240px)]'
          }`}
        >
          <div className="flex gap-[0.04em]">
            <FlipDigit value={hh[0]} />
            <FlipDigit value={hh[1]} />
          </div>
          <div className="flex gap-[0.04em]">
            <FlipDigit value={mm[0]} />
            <FlipDigit value={mm[1]} />
          </div>
          {(showSeconds || twelve) && (
            <div className="flex items-end gap-[0.3em] pb-[0.04em] text-[0.24em]">
              {showSeconds && (
                <span className="flex gap-[0.04em]">
                  <FlipDigit value={ss[0]} />
                  <FlipDigit value={ss[1]} />
                </span>
              )}
              {twelve && <span className="pb-[0.1em] text-[0.42em] font-semibold tracking-[0.14em] [font-family:var(--font-manrope)]">{meridiem}</span>}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
