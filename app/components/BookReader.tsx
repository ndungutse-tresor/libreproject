'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type ReaderData = {
  page: { number: number; content: string }
  access: { freePages: number; readingSeconds: number | null; premium: boolean }
}

export default function BookReader({ bookId, title, pageCount }: { bookId: number; title: string; pageCount: number }) {
  const [pageNumber, setPageNumber] = useState(1)
  const [reading, setReading] = useState<ReaderData | null>(null)
  const [error, setError] = useState('')

  const loadPage = useCallback(async (number: number, consume = false) => {
    const params = new URLSearchParams({ bookId: String(bookId), page: String(number) })
    if (consume) params.set('consume', 'true')
    const response = await fetch(`/api/pages?${params}`)
    const data = await response.json()
    if (!response.ok) {
      setError(data.error ?? 'Unable to load this page.')
      return
    }
    setError('')
    setReading(data)
  }, [bookId])

  useEffect(() => {
    void loadPage(pageNumber)
  }, [loadPage, pageNumber])

  useEffect(() => {
    if (!reading || reading.page.number !== pageNumber || reading.access.premium || pageNumber <= reading.access.freePages) return
    const timer = window.setInterval(() => void loadPage(pageNumber, true), 15_000)
    return () => window.clearInterval(timer)
  }, [loadPage, pageNumber, reading])

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: 32 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: '8px 0 0' }}>{title}</h1>
        </div>
        <span style={{ background: '#e2e8f0', borderRadius: 999, padding: '8px 12px' }}>Page {pageNumber} of {pageCount}</span>
      </header>

      <article style={{ minHeight: 220, background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
        {error
          ? <div role="alert"><p style={{ color: '#b91c1c' }}>{error}</p>{error.includes('Sign in') && <Link href="/login">Log in</Link>}</div>
          : <p style={{ fontSize: 18, lineHeight: 1.8, color: '#1e293b' }}>{reading?.page.content ?? 'Loading…'}</p>}
        {reading?.access.readingSeconds !== null && reading?.access.readingSeconds !== undefined && pageNumber > reading.access.freePages && !reading.access.premium &&
          <p style={{ color: '#475569' }}>Reading time remaining: {reading.access.readingSeconds} seconds</p>}
      </article>

      <nav style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button disabled={pageNumber <= 1} onClick={() => setPageNumber((page) => Math.max(1, page - 1))}>Previous page</button>
        <button disabled={pageNumber >= pageCount} onClick={() => setPageNumber((page) => Math.min(pageCount, page + 1))}>Next page</button>
      </nav>
    </main>
  )
}
