// PROTOTYPE — six procedural scenes (CSS + inline SVG). Placeholders until
// licensed images/videos are verified; each carries its dominant accent color.
import { memo } from 'react'

export type SceneId = 'midnight' | 'ocean' | 'pines' | 'desert' | 'snow' | 'ink'

export const SCENE_LIST: { id: SceneId; name: string; accent: string }[] = [
  { id: 'midnight', name: 'Midnight City', accent: 'oklch(0.8 0.14 68)' },
  { id: 'ocean', name: 'Blue Hour Ocean', accent: 'oklch(0.82 0.09 215)' },
  { id: 'pines', name: 'Misty Pines', accent: 'oklch(0.84 0.08 150)' },
  { id: 'desert', name: 'Desert Dusk', accent: 'oklch(0.8 0.14 55)' },
  { id: 'snow', name: 'Alpine Snow', accent: 'oklch(0.86 0.05 235)' },
  { id: 'ink', name: 'Ink & Smoke', accent: 'oklch(0.8 0.11 25)' },
]

export const sceneCss = `
.sc { position:absolute; inset:0; overflow:hidden; }
.sc > * { position:absolute; pointer-events:none; }
.sc-anim { animation-play-state: running; }
@media (prefers-reduced-motion: reduce) { .sc * { animation: none !important; } }

/* Midnight City */
.sc-midnight { background: linear-gradient(180deg, oklch(0.2 0.03 235), oklch(0.13 0.02 245) 60%, oklch(0.1 0.015 250)); }
.sc-midnight .bokeh { inset:-10%; filter: blur(22px); animation: sc-drift 60s ease-in-out infinite alternate;
  background:
    radial-gradient(circle at 12% 62%, oklch(0.8 0.14 68 / .55) 0 2.2%, transparent 2.6%),
    radial-gradient(circle at 22% 70%, oklch(0.75 0.12 60 / .4) 0 3%, transparent 3.5%),
    radial-gradient(circle at 38% 58%, oklch(0.9 0.05 85 / .35) 0 1.6%, transparent 2%),
    radial-gradient(circle at 55% 66%, oklch(0.78 0.14 68 / .5) 0 2.6%, transparent 3%),
    radial-gradient(circle at 63% 52%, oklch(0.7 0.13 25 / .45) 0 1.8%, transparent 2.2%),
    radial-gradient(circle at 74% 72%, oklch(0.8 0.14 68 / .4) 0 3.4%, transparent 3.9%),
    radial-gradient(circle at 86% 60%, oklch(0.9 0.04 200 / .3) 0 2%, transparent 2.4%),
    radial-gradient(circle at 93% 75%, oklch(0.78 0.14 68 / .5) 0 2.4%, transparent 2.8%),
    radial-gradient(60% 30% at 50% 80%, oklch(0.5 0.1 60 / .25), transparent); }
.sc-midnight .rain { inset:-50% 0 0 0; opacity:.2;
  background: repeating-linear-gradient(100deg, transparent 0 46px, oklch(0.9 0.02 230 / .5) 46px 47px, transparent 47px 91px);
  animation: sc-rain .9s linear infinite; }
@keyframes sc-rain { to { transform: translate3d(-24px, 50%, 0); } }

/* Blue Hour Ocean */
.sc-ocean { background: linear-gradient(180deg, oklch(0.3 0.06 260) 0%, oklch(0.48 0.07 235) 50%, oklch(0.62 0.06 220) 56%, oklch(0.3 0.06 238) 57%, oklch(0.16 0.04 245) 100%); }
.sc-ocean .glow { left:0; right:0; top:35%; height:40%; background: radial-gradient(50% 50% at 62% 55%, oklch(0.85 0.06 80 / .45), transparent 70%); }
.sc-ocean .moon { left:62%; top:24%; width:3.2vmin; height:3.2vmin; border-radius:50%; background: oklch(0.96 0.03 90); box-shadow: 0 0 40px 10px oklch(0.9 0.05 90 / .35); }
.sc-ocean .path { left:58%; width:9%; top:57%; bottom:0; filter: blur(3px);
  background: repeating-linear-gradient(180deg, oklch(0.92 0.05 85 / .5) 0 2px, transparent 2px 9px);
  mask-image: linear-gradient(180deg, black, transparent 90%); animation: sc-shimmer 3s ease-in-out infinite alternate; }
.sc-ocean .waves { left:-10%; right:-10%; top:57%; bottom:0; opacity:.5;
  background: repeating-linear-gradient(180deg, transparent 0 14px, oklch(0.5 0.06 230 / .5) 14px 15px);
  animation: sc-waves 9s ease-in-out infinite alternate; }
@keyframes sc-shimmer { to { transform: scaleX(1.25); opacity:.7; } }
@keyframes sc-waves { to { transform: translate3d(4%, 6px, 0); } }

/* Misty Pines */
.sc-pines { background: linear-gradient(180deg, oklch(0.62 0.025 170), oklch(0.45 0.03 170) 55%, oklch(0.24 0.03 170)); }
.sc-pines svg { left:0; bottom:0; width:100%; height:70%; }
.sc-pines .fog { left:-30%; right:-30%; height:30%; filter: blur(30px);
  background: radial-gradient(40% 50% at 30% 50%, oklch(0.9 0.01 170 / .45), transparent), radial-gradient(35% 50% at 75% 50%, oklch(0.9 0.01 170 / .35), transparent);
  animation: sc-fog 40s ease-in-out infinite alternate; }
.sc-pines .fog.f1 { top:40%; } .sc-pines .fog.f2 { top:62%; animation-duration: 55s; animation-direction: alternate-reverse; }
@keyframes sc-fog { to { transform: translate3d(14%, 0, 0); } }

/* Desert Dusk */
.sc-desert { background: linear-gradient(180deg, oklch(0.3 0.06 10) 0%, oklch(0.52 0.12 35) 45%, oklch(0.78 0.13 65) 62%, oklch(0.4 0.08 40) 63%); }
.sc-desert .sun { left:58%; top:46%; width:12vmin; height:12vmin; border-radius:50%;
  background: radial-gradient(circle, oklch(0.95 0.08 85), oklch(0.85 0.14 65) 60%, transparent 70%); filter: blur(1px);
  animation: sc-sink 120s ease-in-out infinite alternate; }
.sc-desert svg { left:0; bottom:0; width:100%; height:45%; }
@keyframes sc-sink { to { transform: translate3d(0, 4vmin, 0); } }

/* Alpine Snow */
.sc-snow { background: linear-gradient(180deg, oklch(0.4 0.04 250), oklch(0.62 0.03 240) 55%, oklch(0.82 0.015 230)); }
.sc-snow svg { left:0; bottom:0; width:100%; height:65%; }
.sc-snow .flakes { left:0; right:0; top:-480px; height:calc(100% + 480px);
  background-image: radial-gradient(circle, oklch(0.98 0.005 230 / .9) 1.2px, transparent 1.8px), radial-gradient(circle, oklch(0.98 0.005 230 / .6) 1px, transparent 1.5px);
  background-size: 120px 120px, 80px 80px; background-position: 0 0, 40px 30px;
  animation: sc-snowfall 14s linear infinite; }
.sc-snow .flakes.f2 { background-size: 200px 160px, 150px 120px; filter: blur(1px); animation-duration: 9s; opacity:.8; }
@keyframes sc-snowfall { to { transform: translate3d(30px, 480px, 0); } }

/* Ink & Smoke */
.sc-ink { background: oklch(0.13 0.01 260); }
.sc-ink .blob { width:70vmax; height:70vmax; border-radius:50%; filter: blur(60px); mix-blend-mode: screen; opacity:.55; }
.sc-ink .b1 { left:-15%; top:-20%; background: radial-gradient(circle, oklch(0.55 0.12 25), transparent 60%); animation: sc-b1 50s ease-in-out infinite alternate; }
.sc-ink .b2 { right:-20%; top:10%; background: radial-gradient(circle, oklch(0.5 0.08 200), transparent 60%); animation: sc-b2 65s ease-in-out infinite alternate; }
.sc-ink .b3 { left:20%; bottom:-40%; background: radial-gradient(circle, oklch(0.6 0.1 80), transparent 60%); animation: sc-b1 80s ease-in-out infinite alternate-reverse; }
@keyframes sc-b1 { to { transform: translate3d(15%, 10%, 0) scale(1.15); } }
@keyframes sc-b2 { to { transform: translate3d(-12%, 15%, 0) scale(.9); } }

@keyframes sc-drift { to { transform: translate3d(-4%, -2%, 0) scale(1.05); } }
.sc-vignette { inset:0; background: radial-gradient(120% 90% at 40% 50%, transparent 45%, oklch(0.05 0.01 250 / .7)); }
`

/** Deterministic pseudo-random for stable silhouettes. */
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

function pines(seed: number, n: number, base: number, h: number) {
  const r = rng(seed)
  let d = ''
  for (let i = 0; i < n; i++) {
    const x = (i / n) * 1000 + r() * 30
    const th = h * (0.6 + r() * 0.6)
    const w = th * 0.32
    d += `M${x - w},${base} L${x},${base - th} L${x + w},${base} Z `
  }
  return d + `M0,${base} L1000,${base} L1000,400 L0,400 Z`
}

const PINES = [pines(7, 26, 260, 150), pines(13, 34, 320, 170), pines(29, 40, 400, 210)]

export const Scene = memo(function Scene({ id }: { id: SceneId }) {
  return (
    <div className={`sc sc-${id}`} aria-hidden>
      {id === 'midnight' && (<><div className="bokeh" /><div className="rain" /></>)}
      {id === 'ocean' && (<><div className="glow" /><div className="moon" /><div className="waves" /><div className="path" /></>)}
      {id === 'pines' && (
        <>
          <svg viewBox="0 0 1000 400" preserveAspectRatio="none">
            <path d={PINES[0]} fill="oklch(0.42 0.03 170 / .7)" />
            <path d={PINES[1]} fill="oklch(0.32 0.03 170 / .85)" />
            <path d={PINES[2]} fill="oklch(0.2 0.025 170)" />
          </svg>
          <div className="fog f1" />
          <div className="fog f2" />
        </>
      )}
      {id === 'desert' && (
        <>
          <div className="sun" />
          <svg viewBox="0 0 1000 300" preserveAspectRatio="none">
            <path d="M0,90 C180,40 320,120 520,70 C700,25 860,95 1000,60 L1000,300 L0,300 Z" fill="oklch(0.45 0.09 40)" />
            <path d="M0,170 C220,110 380,200 600,140 C780,95 900,160 1000,130 L1000,300 L0,300 Z" fill="oklch(0.33 0.07 35)" />
            <path d="M0,240 C260,200 520,270 760,215 C880,190 950,220 1000,210 L1000,300 L0,300 Z" fill="oklch(0.22 0.05 30)" />
          </svg>
        </>
      )}
      {id === 'snow' && (
        <>
          <svg viewBox="0 0 1000 400" preserveAspectRatio="none">
            <path d="M0,260 L140,120 L220,190 L360,40 L470,170 L560,110 L700,230 L820,90 L1000,240 L1000,400 L0,400 Z" fill="oklch(0.9 0.012 235)" />
            <path d="M360,40 L400,110 L380,100 L350,130 L330,70 Z M820,90 L860,150 L835,140 L805,170 L790,120 Z" fill="oklch(0.98 0.005 235)" />
            <path d="M0,330 L180,250 L330,310 L520,230 L700,300 L880,250 L1000,290 L1000,400 L0,400 Z" fill="oklch(0.55 0.03 245)" />
          </svg>
          <div className="flakes" />
          <div className="flakes f2" />
        </>
      )}
      {id === 'ink' && (<><div className="blob b1" /><div className="blob b2" /><div className="blob b3" /></>)}
      <div className="sc-vignette" />
    </div>
  )
})
