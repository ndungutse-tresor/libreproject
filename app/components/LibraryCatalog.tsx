'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { collectionOrder, collections, type Collection } from '../libra-collections'
import GalleryWall, { type WallItem } from './gallery/GalleryWall'
import BookCover from './gallery/BookCover'
import LibraHeader from './gallery/LibraHeader'
import { communityRouteId } from '../book-routes'
import './gallery/gallery.css'

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

type View = 'gallery' | 'list'

/** What the library needs to know about a sample book; the page text stays on the server. */
export type SampleShelfBook = { id: number; title: string; author: string; collection: Collection; year: string | null; pageCount: number }

type Shelf = {
  key: string
  title: string
  blurb: string
  books: { id: string; title: string; author: string; detail: string; tag?: string }[]
}

const COVER_ASPECT = 2 / 3

function formatTag(mimeType: string) {
  return mimeType === 'application/pdf' ? 'PDF' : mimeType === 'application/epub+zip' ? 'EPUB' : 'TEXT'
}

export default function LibraryCatalog({ samples }: { samples: SampleShelfBook[] }) {
  const router = useRouter()
  const [published, setPublished] = useState<LibraryResult>({ books: [], posts: [] })
  const [error, setError] = useState('')
  const [view, setView] = useState<View>('gallery')
  const [search, setSearch] = useState('')
  const [paid, setPaid] = useState(false)

  useEffect(() => {
    fetch('/api/library')
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Unable to load new library content.')
        setPublished(data)
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load new library content.'))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requested = params.get('view')
    if (requested === 'list' || requested === 'gallery') setView(requested)
    else if (window.matchMedia('(max-width: 700px)').matches) setView('list')
    setPaid(params.get('paid') === '1')
  }, [])

  function changeView(next: View) {
    setView(next)
    const url = new URL(window.location.href)
    url.searchParams.set('view', next)
    url.searchParams.delete('paid')
    window.history.replaceState(null, '', url)
  }

  const shelves = useMemo<Shelf[]>(() => {
    const needle = search.trim().toLowerCase()
    const matches = (title: string, author: string) => !needle || title.toLowerCase().includes(needle) || author.toLowerCase().includes(needle)
    const fromSamples = (collection: Collection): Shelf => ({
      key: collection,
      title: collections[collection].title,
      blurb: collections[collection].blurb,
      books: samples
        .filter((book) => book.collection === collection && matches(book.title, book.author))
        .map((book) => ({ id: String(book.id), title: book.title, author: book.author, detail: book.year ?? `${book.pageCount} pages` }))
    })
    const community: Shelf = {
      key: 'community',
      title: 'From Libra writers',
      blurb: 'New books shared by the Libra writing community.',
      books: published.books
        .filter((book) => matches(book.title, book.author ?? ''))
        .map((book) => ({ id: communityRouteId(book.id), title: book.title, author: book.author ?? 'Libra writer', detail: formatTag(book.mime_type), tag: formatTag(book.mime_type) }))
    }
    return [...collectionOrder.map(fromSamples), community].filter((shelf) => shelf.books.length > 0)
  }, [published.books, search, samples])

  const wallItems = useMemo<WallItem[]>(() => shelves.flatMap((shelf) => [
    {
      key: `placard-${shelf.key}`,
      kind: 'placard' as const,
      aspect: 0.64,
      label: `${shelf.title}: ${shelf.books.length} ${shelf.books.length === 1 ? 'book' : 'books'}`,
      content: <span className="gs-placard"><strong>{shelf.title}</strong><span>{shelf.blurb}</span><small>{shelf.books.length} {shelf.books.length === 1 ? 'book' : 'books'}</small></span>
    },
    ...shelf.books.map((book) => ({
      key: `book-${book.id}`,
      aspect: COVER_ASPECT,
      label: `${book.title} by ${book.author}. Open book.`,
      caption: [book.author, book.title] as [string, string],
      content: <BookCover title={book.title} author={book.author} tag={book.tag} />
    }))
  ]), [shelves])

  const memes = published.posts.filter((post) => post.kind === 'meme')
  const quotes = published.posts.filter((post) => post.kind === 'quote')
  const total = shelves.reduce((sum, shelf) => sum + shelf.books.length, 0)

  return (
    <main className="gs-root">
      <LibraHeader search={search} onSearch={setSearch} />

      <div className="gs-toggle" role="group" aria-label="Choose how to browse">
        <button type="button" aria-pressed={view === 'gallery'} onClick={() => changeView('gallery')}>Gallery</button>
        <button type="button" aria-pressed={view === 'list'} onClick={() => changeView('list')}>List</button>
      </div>

      {paid && <p className="gs-toast" role="status">Payment received. Your reading time is ready.</p>}

      {view === 'gallery'
        ? <section className="gs-gallery" aria-label="Library gallery">
          {wallItems.length > 0
            ? <GalleryWall
              items={wallItems}
              storageKey="libra.wall"
              hint="Scroll or drag to walk the shelves · Click a book to open it"
              onOpen={(item) => router.push(`/book/${item.key.replace(/^book-/, '')}`)}
            />
            : <p className="gs-empty" style={{ paddingTop: 140 }}>No books match “{search}”.</p>}
        </section>
        : <section className="gs-list" aria-label="Library list">
          {shelves.map((shelf) => (
            <div key={shelf.key} className="gs-list-section">
              <div className="gs-list-heading"><h2>{shelf.title}</h2><p>{shelf.blurb}</p></div>
              <div className="gs-grid">
                {shelf.books.map((book) => (
                  <Link key={book.id} href={`/book/${book.id}`} className="gs-card">
                    <span className="gs-card-art" style={{ aspectRatio: '2 / 3' }}><BookCover title={book.title} author={book.author} tag={book.tag} /></span>
                    <span className="gs-card-cap">{book.author}<em>{book.title}</em></span>
                    <span className="gs-card-meta">{book.detail}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {total === 0 && <p className="gs-empty">No books match “{search}”.</p>}
          {error && <p className="gs-empty" role="status">Reader favourites are available. {error}</p>}

          {(memes.length > 0 || quotes.length > 0) && <div className="gs-list-section">
            <div className="gs-list-heading"><h2>Small things worth sharing</h2><p>Memes and quotes from our writers.</p></div>
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
          </div>}
        </section>}
    </main>
  )
}
