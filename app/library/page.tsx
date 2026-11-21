import LibraryCatalog, { type SampleShelfBook } from '../components/LibraryCatalog'
import { books } from '../libra-data'

export default function LibraryPage() {
  // Only titles and details go to the browser; page text stays on the server,
  // where /api/pages enforces the free half and reading time.
  const samples: SampleShelfBook[] = books.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    collection: book.collection,
    year: book.year ?? null,
    pageCount: book.pages.length
  }))
  return <LibraryCatalog samples={samples} />
}
