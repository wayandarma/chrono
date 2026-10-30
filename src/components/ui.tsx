import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'

export function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-300 ${on ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'}`}
    >
      <span className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-[oklch(0.98_0.01_80)] shadow transition-transform duration-300 ease-[var(--ease-out-quart)] ${on ? 'translate-x-6' : ''}`} />
    </button>
  )
}

export function Chip({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={`min-h-10 rounded-full border px-4 text-[14px] font-medium transition-colors ${
        on ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]' : 'border-[var(--line)] hover:border-[var(--muted)]'
      }`}
    >
      {children}
    </button>
  )
}

export function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 border-b border-[var(--line)] py-2">
      <span>
        <span className="block text-[16px]">{label}</span>
        {hint && <span className="block text-[13px] text-[var(--muted)]">{hint}</span>}
      </span>
      {children}
    </div>
  )
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="mt-6 text-[13px] leading-relaxed text-[var(--muted)]">{children}</p>
}

/** Right side sheet on wide screens, draggable bottom sheet on narrow ones. */
export function Sheet({ open, wide, title, onClose, children }: { open: boolean; wide: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const drag = useDragControls()
  const ref = useRef<HTMLElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      returnTo.current ??= document.activeElement as HTMLElement | null
      ref.current?.focus()
    } else if (returnTo.current) {
      returnTo.current.focus?.()
      returnTo.current = null
    }
  }, [open, title])

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          ref={ref}
          tabIndex={-1}
          key="sheet"
          role="dialog"
          aria-label={title}
          initial={wide ? { x: '100%' } : { y: '100%' }}
          animate={wide ? { x: 0 } : { y: 0 }}
          exit={wide ? { x: '100%' } : { y: '100%' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          drag={wide ? false : 'y'}
          dragControls={drag}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={(_, info) => info.offset.y > 120 && onClose()}
          className={`absolute z-20 flex flex-col bg-[var(--panel)] outline-none backdrop-blur-xl ${
            wide ? 'inset-y-0 right-0 w-[440px] border-l border-[var(--line)]' : 'inset-x-0 bottom-0 max-h-[66dvh] rounded-t-[28px] pb-[env(safe-area-inset-bottom)]'
          }`}
        >
          {!wide && (
            <div onPointerDown={(e) => drag.start(e)} className="flex h-7 shrink-0 cursor-grab touch-none items-center justify-center" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-[var(--muted)] opacity-50" />
            </div>
          )}
          <div className={`flex shrink-0 items-baseline justify-between border-b border-[var(--line)] px-6 pb-3 ${wide ? 'pt-8' : 'pt-1'}`}>
            <h2 className="text-[40px] leading-none capitalize italic [font-family:var(--font-instrument)]">{title}</h2>
            <button onClick={onClose} className="tap px-2 text-[14px] font-semibold text-[var(--muted)] hover:text-[var(--fg)]">
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-10 pt-2 [scrollbar-color:var(--line)_transparent]">{children}</div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
