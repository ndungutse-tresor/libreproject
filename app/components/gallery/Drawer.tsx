'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

type Props = {
  title: string
  /** Called once the closing slide has finished. */
  onClose: () => void
  children: ReactNode
  /** Footer content; pass a function to get a `close` that plays the slide-out. */
  footer?: ReactNode | ((close: () => void) => ReactNode)
}

/** A panel that slides in from the right over a dimmed page, like a shop's bag. */
export function Drawer({ title, onClose, children, footer }: Props) {
  const [closing, setClosing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const returnTo = useRef<Element | null>(null)

  const close = useCallback(() => setClosing(true), [])

  useEffect(() => {
    returnTo.current = document.activeElement
    panelRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      if (returnTo.current instanceof HTMLElement) returnTo.current.focus()
    }
  }, [close])

  useEffect(() => {
    if (!closing) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(onClose, reduced ? 0 : 280)
    return () => window.clearTimeout(timer)
  }, [closing, onClose])

  return (
    <>
      <div className={`gs-backdrop${closing ? ' is-closing' : ''}`} onClick={close} aria-hidden="true" />
      <div ref={panelRef} className={`gs-drawer${closing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="gs-drawer-head">
          <span>{title}</span>
          <button type="button" className="gs-drawer-close" onClick={close} aria-label="Close">×</button>
        </div>
        <div className="gs-drawer-body">{children}</div>
        {footer && <div className="gs-drawer-foot">{typeof footer === 'function' ? footer(close) : footer}</div>}
      </div>
    </>
  )
}
