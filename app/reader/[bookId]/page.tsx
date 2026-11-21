import { notFound } from 'next/navigation'
import { books } from '../../libra-data'
import BookReader from '../../components/BookReader'
import PublishedBookReader from '../../components/PublishedBookReader'
import { getPool } from '@/lib/db'
import { parseBookRoute } from '../../book-routes'

export default async function ReaderPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params
  const route = parseBookRoute(bookId, (id) => books.some((entry) => entry.id === id))
  if (!route) notFound()
  const book = route.kind === 'sample' ? books.find((entry) => entry.id === Number(route.id)) : undefined
  if (book) return <BookReader bookId={book.id} title={book.title} pageCount={book.pages.length} />

  try {
    const { rows } = await getPool().query(
      `SELECT books.id::text AS id, books.title, books.author, books.description, submissions.mime_type
       FROM books
       JOIN content_submissions AS submissions ON submissions.id = books.source_submission_id
       WHERE books.id = $1 AND books.is_published = true`,
      [route.id]
    )
    const publishedBook = rows[0]
    if (!publishedBook) notFound()

    return (
      <PublishedBookReader
        bookId={publishedBook.id}
        title={publishedBook.title}
        author={publishedBook.author}
        description={publishedBook.description}
        mimeType={publishedBook.mime_type}
      />
    )
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error) throw error
    console.error('Unable to load published book:', error)
    notFound()
  }
}
