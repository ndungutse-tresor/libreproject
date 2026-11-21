import { cache } from 'react'
import { notFound } from 'next/navigation'
import { books, collections, SUMMARY_CREDIT } from '../../libra-data'
import BookShop, { type ShopBook } from '../../components/BookShop'
import { getPool } from '@/lib/db'
import { communityRouteId, parseBookRoute } from '../../book-routes'

type Params = { params: Promise<{ bookId: string }> }

const findBook = cache(async (bookId: string): Promise<ShopBook | null> => {
  const route = parseBookRoute(bookId, (id) => books.some((entry) => entry.id === id))
  if (!route) return null
  const sample = route.kind === 'sample' ? books.find((entry) => entry.id === Number(route.id)) : undefined
  if (sample) {
    return {
      kind: 'sample',
      id: String(sample.id),
      title: sample.title,
      author: sample.author,
      year: sample.year ?? null,
      description: sample.description,
      // The opening of the first page, without its chapter heading.
      excerpt: (sample.pages[0] ?? '').replace(/^##[^\n]*\n+/, '').split(/\n\s*\n/)[0],
      format: sample.format ?? 'summary',
      subtitle: sample.subtitle ?? null,
      credit: sample.format === 'original' ? null : SUMMARY_CREDIT,
      collection: collections[sample.collection].title,
      pageCount: sample.pages.length,
      freePages: Math.ceil(sample.pages.length / 2)
    }
  }

  try {
    const { rows } = await getPool().query(
      `SELECT books.id::text AS id, books.title, books.author, books.description, books.language, submissions.mime_type
       FROM books
       JOIN content_submissions AS submissions ON submissions.id = books.source_submission_id
       WHERE books.id = $1 AND books.is_published = true`,
      [route.id]
    )
    const book = rows[0]
    if (!book) return null
    return {
      kind: 'community',
      id: communityRouteId(book.id),
      fileId: book.id,
      title: book.title,
      author: book.author ?? 'Libra writer',
      year: null,
      description: book.description || 'A new book shared by the Libra writing community.',
      excerpt: '',
      collection: 'From Libra writers',
      mimeType: book.mime_type,
      language: book.language ?? 'en'
    }
  } catch (error) {
    console.error('Unable to load published book:', error)
    return null
  }
})

export async function generateMetadata({ params }: Params) {
  const { bookId } = await params
  const book = await findBook(bookId)
  return { title: book ? `${book.title} — Libra` : 'Book not found — Libra' }
}

export default async function BookPage({ params }: Params) {
  const { bookId } = await params
  const book = await findBook(bookId)
  if (!book) notFound()
  return <BookShop book={book} />
}
