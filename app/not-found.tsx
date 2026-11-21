import Link from 'next/link'
import LibraHeader from './components/gallery/LibraHeader'
import './components/gallery/gallery.css'
import './components/gallery/libra.css'

export const metadata = { title: 'Page not found — Libra' }

export default function NotFound() {
  return (
    <main className="gs-root">
      <LibraHeader />
      <section className="lnf">
        <div>
          <p className="lnf-code">404</p>
          <h1 className="gs-kicker">This page is not on our shelves</h1>
          <p className="gs-desc">The link may be old, or the book may have been taken out of the library. Everything else is right where you left it.</p>
          <div className="lnf-actions">
            <Link className="gs-cta" href="/library">Browse the library</Link>
            <Link className="gs-cta is-light" href="/">Go to the home page</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
