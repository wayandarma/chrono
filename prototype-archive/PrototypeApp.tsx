// PROTOTYPE — visual directions for CHRONO, switchable via `?variant=A|B|C|D`
// on the root route. D is the chosen direction (B's frame + A's cards/panels).
// Throwaway: fold the winner into real code, then drop this folder.
import { useCallback, useEffect, useState } from 'react'
import { PrototypeSwitcher } from './PrototypeSwitcher'
import { VariantA, name as nameA } from './VariantA'
import { VariantB, name as nameB, switcherBottom as bottomB } from './VariantB'
import { VariantC, name as nameC } from './VariantC'
import { VariantD, name as nameD, switcherBottom as bottomD } from './VariantD'

const VARIANTS = [
  { key: 'A', name: nameA, C: VariantA, bottom: undefined },
  { key: 'B', name: nameB, C: VariantB, bottom: bottomB },
  { key: 'C', name: nameC, C: VariantC, bottom: undefined },
  { key: 'D', name: nameD, C: VariantD, bottom: bottomD },
]
const DEFAULT = 'D'

export type VariantProps = { ringing: boolean; onRingEnd: () => void }

function readVariant() {
  const v = new URLSearchParams(location.search).get('variant')?.toUpperCase()
  return VARIANTS.some((x) => x.key === v) ? v! : DEFAULT
}

export default function PrototypeApp() {
  const [variant, setVariant] = useState(readVariant)
  const [ringing, setRinging] = useState(false)

  useEffect(() => {
    const onPop = () => setVariant(readVariant())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = useCallback((key: string) => {
    const url = new URL(location.href)
    url.searchParams.set('variant', key)
    history.replaceState(null, '', url)
    setVariant(key)
    setRinging(false)
  }, [])

  const current = VARIANTS.find((v) => v.key === variant)!
  const Variant = current.C
  const endRing = useCallback(() => setRinging(false), [])

  return (
    <>
      <Variant key={variant} ringing={ringing} onRingEnd={endRing} />
      {import.meta.env.DEV && (
        <PrototypeSwitcher
          variants={VARIANTS.map(({ key, name }) => ({ key, name }))}
          current={variant}
          onChange={go}
          ringing={ringing}
          onRing={() => setRinging((r) => !r)}
          bottom={current.bottom}
        />
      )}
    </>
  )
}
