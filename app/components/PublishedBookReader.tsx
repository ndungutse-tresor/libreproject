'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import LibraHeader from './gallery/LibraHeader'
import { communityRouteId } from '../book-routes'
import './gallery/gallery.css'
import './gallery/libra.css'

export default function PublishedBookReader({
  bookId,
  title,
  author,
  description,
  mimeType
}: {
  bookId: string
  title: string
  author: string
  description: string
  mimeType: string
}) {
  const fileUrl = `/api/content/files?id=${encodeURIComponent(bookId)}&kind=book`
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const format = mimeType === 'application/pdf' ? 'PDF' : mimeType === 'application/epub+zip' ? 'EPUB' : 'Text'

  useEffect(() => {
    if (mimeType !== 'text/plain') return
    fetch(fileUrl)
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load this book. Try again later.')
        setText(await response.text())
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load this book.'))
  }, [fileUrl, mimeType])

  return (
    <main className="gs-root">
      <LibraHeader />
      <article className={`lr-reader${mimeType === 'application/pdf' ? ' is-wide' : ''}`}>
        <p className="gs-crumb"><Link href="/library">Library</Link> / <Link href={`/book/${communityRouteId(bookId)}`}>{title}</Link></p>
        <header className="lr-head">
          <div>
            <h1 className="lr-title">{title}</h1>
            <p className="gs-byline">{author ? `By ${author}` : 'From a Libra writer'}</p>
          </div>
          <a className="gs-chip" href={fileUrl} download>Download {format}</a>
        </header>
        {description && <p className="gs-desc">{description}</p>}

        {mimeType === 'application/pdf'
          ? <iframe className="lr-frame" src={fileUrl} title={`Read ${title}`} />
          : mimeType === 'text/plain'
            ? <section className="lr-page is-long">
              {error
                ? <div className="lr-lock"><h2>This book didn’t load</h2><p>{error}</p></div>
                : <div className="lr-text is-file">{text || 'Loading the book…'}</div>}
            </section>
            : <section className="lr-page">
              <div className="lr-lock">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 5c3-1.5 5.5-1.5 8 0v14c-2.5-1.5-5-1.5-8 0Z" /><path d="M20 5c-3-1.5-5.5-1.5-8 0v14c2.5-1.5 5-1.5 8 0Z" /></svg>
                <h2>Read it in your e-book app</h2>
                <p>EPUB books open best in an e-reader such as Apple Books, Google Play Books or Calibre.</p>
                <div className="lr-lock-actions"><a className="gs-cta" href={fileUrl} download>Download the EPUB</a></div>
              </div>
            </section>}

        <nav className="lr-nav" aria-label="Book">
          <Link className="gs-cta is-light" href={`/book/${communityRouteId(bookId)}`}>← About this book</Link>
          <Link className="gs-cta" href="/library">Back to the library</Link>
        </nav>
      </article>
    </main>
  )
}
