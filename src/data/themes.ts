export type Theme = {
  name: string
  card: string
  cardB: string
  digit: string
  bar: string
  fg: string
  muted: string
  panel: string
  line: string
  light: boolean
  glow: boolean
}

export const THEMES = {
  midnight: { name: 'Midnight', card: 'oklch(0.2 0.012 250)', cardB: 'oklch(0.17 0.012 250)', digit: 'oklch(0.95 0.015 85)', bar: 'oklch(0.08 0.008 250)', fg: 'oklch(0.94 0.015 85)', muted: 'oklch(0.76 0.015 80)', panel: 'oklch(0.11 0.01 250 / .95)', line: 'oklch(1 0 0 / .12)', light: false, glow: false },
  paper: { name: 'Paper', card: 'oklch(0.94 0.018 82)', cardB: 'oklch(0.9 0.02 80)', digit: 'oklch(0.24 0.02 50)', bar: 'oklch(0.95 0.016 82)', fg: 'oklch(0.24 0.02 50)', muted: 'oklch(0.44 0.025 55)', panel: 'oklch(0.95 0.016 82 / .97)', line: 'oklch(0.3 0.03 50 / .16)', light: true, glow: false },
  ember: { name: 'Ember', card: 'oklch(0.24 0.045 38)', cardB: 'oklch(0.2 0.04 38)', digit: 'oklch(0.92 0.07 75)', bar: 'oklch(0.1 0.02 40)', fg: 'oklch(0.93 0.04 75)', muted: 'oklch(0.76 0.05 60)', panel: 'oklch(0.13 0.025 40 / .95)', line: 'oklch(1 0 0 / .12)', light: false, glow: false },
  mono: { name: 'Mono', card: 'oklch(0.18 0 0)', cardB: 'oklch(0.15 0 0)', digit: 'oklch(0.97 0 0)', bar: 'oklch(0.07 0 0)', fg: 'oklch(0.96 0 0)', muted: 'oklch(0.74 0 0)', panel: 'oklch(0.1 0 0 / .95)', line: 'oklch(1 0 0 / .12)', light: false, glow: false },
  neon: { name: 'Neon', card: 'oklch(0.14 0.02 160)', cardB: 'oklch(0.12 0.02 160)', digit: 'oklch(0.9 0.16 150)', bar: 'oklch(0.07 0.01 160)', fg: 'oklch(0.93 0.05 150)', muted: 'oklch(0.76 0.06 150)', panel: 'oklch(0.09 0.015 160 / .95)', line: 'oklch(1 0 0 / .12)', light: false, glow: true },
} satisfies Record<string, Theme>

export type ThemeId = keyof typeof THEMES

export const ACCENTS = [
  { id: 'scene', name: 'Match scene', value: '' },
  { id: 'sodium', name: 'Sodium', value: 'oklch(0.8 0.14 68)' },
  { id: 'coral', name: 'Coral', value: 'oklch(0.75 0.14 30)' },
  { id: 'mint', name: 'Mint', value: 'oklch(0.84 0.1 165)' },
  { id: 'sky', name: 'Sky', value: 'oklch(0.8 0.1 235)' },
  { id: 'ivory', name: 'Ivory', value: 'oklch(0.94 0.03 90)' },
] as const

export type AccentId = (typeof ACCENTS)[number]['id']
