'use client'

import { useEffect, useState } from 'react'

export type GalleryTheme = 'day' | 'night'

const EVENT = 'gs:theme'

/**
 * Day or night view for the gallery pages. The choice is kept on <html> as
 * data-gs-theme (set before first paint by a small script in the page head)
 * and remembered on this device.
 */
export function useGalleryTheme(storageKey: string): [GalleryTheme, () => void] {
  const [theme, setTheme] = useState<GalleryTheme>('day')

  useEffect(() => {
    setTheme(document.documentElement.dataset.gsTheme === 'night' ? 'night' : 'day')
    const onChange = (event: Event) => setTheme((event as CustomEvent<GalleryTheme>).detail)
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [])

  const toggle = () => {
    const next: GalleryTheme = document.documentElement.dataset.gsTheme === 'night' ? 'day' : 'night'
    if (next === 'night') document.documentElement.dataset.gsTheme = 'night'
    else delete document.documentElement.dataset.gsTheme
    try { window.localStorage.setItem(storageKey, next) } catch { /* storage unavailable */ }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }))
  }

  return [theme, toggle]
}

/** The sun / moon button in the header. */
export function ThemeToggle({ storageKey }: { storageKey: string }) {
  const [theme, toggle] = useGalleryTheme(storageKey)
  const night = theme === 'night'
  return (
    <button
      type="button"
      className="gs-theme"
      onClick={toggle}
      aria-label={night ? 'Switch to day view' : 'Switch to night view'}
      title={night ? 'Day view' : 'Night view'}
    >
      {night
        ? <svg key="sun" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
        </svg>
        : <svg key="moon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z" fill="currentColor" />
        </svg>}
    </button>
  )
}
