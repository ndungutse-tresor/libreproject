import Link from 'next/link'
import { books } from '../libra-data'

export default function LibraryPage() {
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 32 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Library</h1>
        <Link href="/pricing" style={{ color: '#1d4ed8' }}>Upgrade</Link>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
        {books.map((book) => (
          <div key={book.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
            <img src={book.cover} alt={book.title} style={{ display: 'block', width: '100%', height: 220, objectFit: 'cover' }} />
            <div style={{ padding: 20 }}>
              <h2 style={{ margin: '0 0 8px' }}>{book.title}</h2>
              <p style={{ margin: '0 0 12px', color: '#475569' }}>{book.author}</p>
              <p style={{ margin: '0 0 20px', color: '#334155' }}>{book.description}</p>
              <Link href={`/reader/${book.id}`} style={{ color: '#fff', background: '#0f172a', padding: '10px 16px', borderRadius: 999, textDecoration: 'none', display: 'inline-block' }}>
                Read now
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
