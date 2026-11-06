'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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
    <main className="published-reader">
      <Link href="/library" className="published-reader-back"><span aria-hidden="true">←</span> Back to library</Link>
      <header className="published-reader-heading">
        <p className="admin-eyebrow">FROM THE LIBRA COMMUNITY</p>
        <h1>{title}</h1>
        <p>By {author}</p>
        {description && <span>{description}</span>}
      </header>
      {mimeType === 'application/pdf'
        ? <iframe className="published-reader-frame" src={fileUrl} title={`Read ${title}`} />
        : mimeType === 'text/plain'
          ? <article className="published-reader-text">
            {error ? <p role="alert">{error}</p> : <pre>{text || 'Loading book…'}</pre>}
            <a href={fileUrl} download>Download {title}</a>
          </article>
          : <article className="published-reader-text">
            <p>EPUB books can be opened in an EPUB reader app.</p>
            <a href={fileUrl}>Download {title}</a>
          </article>}
    </main>
  )
}
