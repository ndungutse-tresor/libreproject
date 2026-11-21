'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import LibraHeader from './gallery/LibraHeader'
import './gallery/gallery.css'
import './gallery/libra.css'

type ReaderData = {
  page: { number: number; content: string }
  access: { freePages: number; readingSeconds: number | null; premium: boolean }
}

type Lock = { kind: 'signin' | 'time' | 'other'; message: string }

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const rest = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${rest}` : `${m}:${rest}`
}

export default function BookReader({ bookId, title, pageCount }: { bookId: number; title: string; pageCount: number }) {
  const [pageNumber, setPageNumber] = useState(1)
  const [reading, setReading] = useState<ReaderData | null>(null)
  const [lock, setLock] = useState<Lock | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const freePages = reading?.access.freePages ?? Math.ceil(pageCount / 2)
  const swipe = useRef<{ x: number; y: number } | null>(null)

  const loadPage = useCallback(async (number: number, consume = false) => {
    const params = new URLSearchParams({ bookId: String(bookId), page: String(number) })
    if (consume) params.set('consume', 'true')
    try {
      const response = await fetch(`/api/pages?${params}`)
      const data = await response.json()
      if (!response.ok) {
        const message: string = data.error ?? 'Unable to load this page.'
        setLock({ kind: response.status === 401 ? 'signin' : response.status === 403 ? 'time' : 'other', message })
        if (response.status === 403) setSecondsLeft(0)
        return
      }
      setLock(null)
      setReading(data)
      setSecondsLeft(data.access.readingSeconds)
    } catch {
      setLock({ kind: 'other', message: 'Unable to reach the library. Check your connection and try again.' })
    }
  }, [bookId])

  useEffect(() => {
    void loadPage(pageNumber)
  }, [loadPage, pageNumber])

  const onLockedPage = Boolean(reading && reading.page.number === pageNumber && !reading.access.premium && pageNumber > reading.access.freePages)

  // Reading time is spent in 15-second steps while a locked page is open.
  useEffect(() => {
    if (!onLockedPage || lock) return
    const timer = window.setInterval(() => void loadPage(pageNumber, true), 15_000)
    return () => window.clearInterval(timer)
  }, [loadPage, pageNumber, onLockedPage, lock])

  // Between those steps, count down on screen so the clock feels live.
  useEffect(() => {
    if (!onLockedPage || lock) return
    const tick = window.setInterval(() => setSecondsLeft((value) => (value === null ? value : Math.max(0, value - 1))), 1000)
    return () => window.clearInterval(tick)
  }, [onLockedPage, lock])

  const go = useCallback((next: number) => {
    setPageNumber(Math.min(pageCount, Math.max(1, next)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pageCount])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && /input|textarea|select/i.test(target.tagName)) return
      if (event.key === 'ArrowRight') go(pageNumber + 1)
      if (event.key === 'ArrowLeft') go(pageNumber - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, pageNumber])

  const shown = reading && reading.page.number === pageNumber ? reading : null
  const status = lock
    ? lock.kind === 'signin' ? 'Locked page' : lock.kind === 'time' ? 'Out of reading time' : 'Unavailable'
    : !shown ? 'Loading…'
      : shown.access.premium ? 'Premium · no limits'
        : pageNumber <= freePages ? 'Free page'
          : `${clock(secondsLeft ?? shown.access.readingSeconds ?? 0)} of reading time left`

  return (
    <main className="gs-root">
      <LibraHeader />
      <article className="lr-reader">
        <p className="gs-crumb"><Link href="/library">Library</Link> / <Link href={`/book/${bookId}`}>{title}</Link></p>
        <header className="lr-head">
          <h1 className="lr-title">{title}</h1>
          <span className="lr-count">Page {pageNumber} of {pageCount}</span>
        </header>

        <div className="lr-progress" aria-hidden="true">
          <span className="lr-progress-free" style={{ width: `${(freePages / pageCount) * 100}%` }} />
          <span className="lr-progress-read" style={{ width: `${(pageNumber / pageCount) * 100}%` }} />
        </div>
        <p className={`lr-status${onLockedPage && !lock ? ' is-timed' : ''}`} role="status">{status}</p>

        <section
          key={`${pageNumber}-${lock?.kind ?? 'page'}`}
          className="lr-page"
          aria-live="polite"
          onTouchStart={(event) => { swipe.current = { x: event.touches[0].clientX, y: event.touches[0].clientY } }}
          onTouchEnd={(event) => {
            const start = swipe.current
            swipe.current = null
            if (!start) return
            const dx = event.changedTouches[0].clientX - start.x
            const dy = event.changedTouches[0].clientY - start.y
            // A clear sideways swipe turns the page; vertical scrolling is left alone.
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(pageNumber + (dx < 0 ? 1 : -1))
          }}
        >
          {lock
            ? <div className="lr-lock">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
              {lock.kind === 'signin' && <>
                <h2>The free half ends here</h2>
                <p>Pages 1 to {freePages} are free for everyone. Log in or create a free account, then add reading time or go Premium to keep reading.</p>
                <div className="lr-lock-actions">
                  <Link className="gs-cta" href="/login">Log in</Link>
                  <Link className="gs-cta is-light" href="/signup">Create a free account</Link>
                </div>
              </>}
              {lock.kind === 'time' && <>
                <h2>You’re out of reading time</h2>
                <p>Add reading time to carry on from this page, or go Premium to read every book without limits.</p>
                <div className="lr-lock-actions">
                  <Link className="gs-cta" href={`/book/${bookId}`}>Add reading time</Link>
                  <Link className="gs-cta is-light" href="/pricing">See all plans</Link>
                </div>
              </>}
              {lock.kind === 'other' && <>
                <h2>This page didn’t load</h2>
                <p>{lock.message}</p>
                <div className="lr-lock-actions"><button type="button" className="gs-cta" onClick={() => void loadPage(pageNumber)}>Try again</button></div>
              </>}
            </div>
            : <p className="lr-text">{shown?.page.content ?? ' '}</p>}
          <span className="lr-folio">{pageNumber}</span>
        </section>

        <nav className="lr-nav" aria-label="Pages">
          <button type="button" className="gs-cta is-light" disabled={pageNumber <= 1} onClick={() => go(pageNumber - 1)}>← Previous</button>
          {pageNumber < pageCount
            ? <button type="button" className="gs-cta" onClick={() => go(pageNumber + 1)}>Next page →</button>
            : <Link className="gs-cta" href="/library">Finished · back to the library</Link>}
        </nav>
        <p className="lr-hint">
          <span className="lr-hint-keys">Tip: use the ← and → keys to turn pages.</span>
          <span className="lr-hint-touch">Tip: swipe the page left or right to turn it.</span>
          {' '}The sun and moon button switches day and night reading.
        </p>
      </article>
    </main>
  )
}
