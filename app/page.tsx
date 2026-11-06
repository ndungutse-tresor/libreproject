import Link from 'next/link'
import ProfileQuickLink from './components/ProfileQuickLink'

export default function HomePage() {
  return (
    <main className="landing">
      <div className="landing-shell">
        <nav className="landing-nav" aria-label="Main navigation">
          <Link className="landing-brand" href="/">libra.</Link>
          <div className="landing-nav-links">
            <Link className="landing-nav-optional" href="/library">Library</Link>
            <Link className="landing-nav-optional" href="/pricing">Pricing</Link>
            <ProfileQuickLink />
            <Link href="/login">Log in</Link>
            <Link className="landing-nav-cta" href="/signup">Join Libra</Link>
          </div>
        </nav>

        <section className="landing-hero">
          <div>
            <p className="landing-eyebrow">A quieter place to read</p>
            <h1 className="landing-title">Make room for <span>a good book.</span></h1>
            <p className="landing-copy">
              Find your next read, settle into a better reading rhythm, and keep your library close wherever the day takes you.
            </p>
            <div className="landing-actions">
              <Link className="landing-primary" href="/library">Explore the library <span aria-hidden="true">→</span></Link>
              <Link className="landing-secondary" href="/signup">Create your free account</Link>
            </div>
          </div>

          <div className="landing-art" aria-label="An illustrated green book">
            <div className="landing-art-halo" />
            <div className="landing-book">
              <span className="landing-book-label">A little more space</span>
              <h2 className="landing-book-title">The art<br />of slowing<br />down</h2>
              <span className="landing-book-author">A Libra reading moment</span>
            </div>
            <div className="landing-note"><strong>Your next chapter</strong>A few quiet minutes, just for you.</div>
          </div>
        </section>

        <footer className="landing-bottom">
          <span>Libra — a home for your reading life.</span>
          <span>Discover a book. Find your rhythm.</span>
        </footer>
      </div>
    </main>
  )
}
