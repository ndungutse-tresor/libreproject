'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { books as sampleBooks } from '../libra-data'

type PublishedBook = {
  id: string
  title: string
  author: string
  description: string
  mime_type: string
  file_name: string
}

type PublishedPost = {
  id: string
  kind: 'meme' | 'quote'
  title: string
  body: string
  attribution: string | null
  imageUrl: string | null
}

type LibraryResult = {
  books: PublishedBook[]
  posts: PublishedPost[]
}

export default function LibraryCatalog() {
  const [published, setPublished] = useState<LibraryResult>({ books: [], posts: [] })
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/library')
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Unable to load new library content.')
        setPublished(data)
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load new library content.'))
  }, [])

  const memes = published.posts.filter((post) => post.kind === 'meme')
  const quotes = published.posts.filter((post) => post.kind === 'quote')

  return (
    <main className="library-page">
      <header className="library-header">
        <div><p className="landing-eyebrow">A GROWING COLLECTION</p><h1>Find your next good read.</h1><p>Browse reader favorites and new work shared by Libra writers.</p></div>
        <Link href="/pricing" className="library-upgrade-link">Explore reading plans <span aria-hidden="true">→</span></Link>
      </header>

      <section className="library-section">
        <div className="library-section-heading"><div><p className="admin-eyebrow">THE LIBRARY</p><h2>Books to spend time with</h2></div><span>{sampleBooks.length + published.books.length} titles</span></div>
        <div className="library-book-grid">
          {sampleBooks.map((book) => (
            <article key={`sample-${book.id}`} className="library-book-card">
              <img src={book.cover} alt="" className="library-sample-cover" />
              <div className="library-book-copy"><span className="library-content-label">LIBRA SELECTION</span><h3>{book.title}</h3><p className="library-book-author">{book.author}</p><p className="library-book-description">{book.description}</p><Link href={`/reader/${book.id}`} className="library-read-link">Read this book <span aria-hidden="true">→</span></Link></div>
            </article>
          ))}
          {published.books.map((book) => (
            <article key={book.id} className="library-book-card library-published-card">
              <div className="library-published-cover"><span aria-hidden="true">L</span><small>{book.mime_type === 'application/pdf' ? 'PDF' : book.mime_type === 'application/epub+zip' ? 'EPUB' : 'TEXT'}</small></div>
              <div className="library-book-copy"><span className="library-content-label">COMMUNITY WRITER</span><h3>{book.title}</h3><p className="library-book-author">{book.author}</p><p className="library-book-description">{book.description || 'A new book shared by the Libra writing community.'}</p><Link href={`/reader/${book.id}`} className="library-read-link">Open book <span aria-hidden="true">→</span></Link></div>
            </article>
          ))}
        </div>
        {error && <p className="library-content-notice" role="status">Reader favorites are available. {error}</p>}
      </section>

      {(memes.length > 0 || quotes.length > 0) && <section className="library-community">
        <div className="library-section-heading"><div><p className="admin-eyebrow">FROM OUR WRITERS</p><h2>Small things worth sharing</h2></div></div>
        <div className="library-post-grid">
          {memes.map((post) => <article key={post.id} className="library-post-card">
            {post.imageUrl && <img src={post.imageUrl} alt={post.title} />}
            <div><span className="library-content-label">MEME</span><h3>{post.title}</h3>{post.body && <p>{post.body}</p>}</div>
          </article>)}
          {quotes.map((post) => <article key={post.id} className="library-quote-card">
            <span className="library-quote-mark" aria-hidden="true">“</span>
            <blockquote>{post.body}</blockquote>
            {post.attribution && <cite>— {post.attribution}</cite>}
            <span className="library-content-label">SHARED BY LIBRA WRITERS</span>
          </article>)}
        </div>
      </section>}
    </main>
  )
}
