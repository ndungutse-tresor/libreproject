import { notFound } from 'next/navigation'
import { books } from '../../libra-data'
import BookReader from '../../components/BookReader'

export default async function ReaderPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params
  const book = books.find((entry) => entry.id === Number(bookId))
  if (!book) notFound()

  return <BookReader bookId={book.id} title={book.title} pageCount={book.pages.length} />
}
