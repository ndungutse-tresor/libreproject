import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 32 }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <h1 style={{ margin: 0 }}>Libra</h1>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link href="/library" style={{ color: '#111827' }}>Library</Link>
          <Link href="/pricing" style={{ color: '#111827' }}>Pricing</Link>
          <Link href="/login" style={{ color: '#111827' }}>Login</Link>
          <Link href="/admin/payments" style={{ color: '#111827' }}>Admin</Link>
        </div>
      </nav>

      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 32, alignItems: 'center', marginBottom: 40 }}>
        <div>
          <p style={{ textTransform: 'uppercase', letterSpacing: '0.12em', color: '#475569', fontWeight: 700 }}>Read better</p>
          <h2 style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', lineHeight: 1.1, margin: '0 0 16px' }}>Build a reading habit that lasts.</h2>
          <p style={{ color: '#475569', fontSize: 18, lineHeight: 1.7 }}>
            A reading platform starter for premium access, subscriptions, reading time tracking, and a curated digital library.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            <Link href="/library" style={{ background: '#111827', color: '#fff', textDecoration: 'none', padding: '12px 18px', borderRadius: 999 }}>Open library</Link>
            <Link href="/pricing" style={{ background: '#e2e8f0', color: '#111827', textDecoration: 'none', padding: '12px 18px', borderRadius: 999 }}>View pricing</Link>
          </div>
        </div>
        <div style={{ background: '#fff', padding: 24, borderRadius: 24, boxShadow: '0 14px 40px rgba(15,23,42,0.08)' }}>
          <p style={{ margin: '0 0 8px', color: '#475569' }}>Featured book</p>
          <h3 style={{ margin: '0 0 8px' }}>Atomic Habits</h3>
          <p style={{ color: '#475569', marginBottom: 16 }}>James Clear</p>
          <div style={{ height: 220, borderRadius: 16, background: 'linear-gradient(135deg, #c7d2fe, #f8fafc)', display: 'grid', placeItems: 'center' }}>
            <span style={{ fontSize: 40 }}>📚</span>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
        {[
          ['Reading time', '300 sec'],
          ['Members', '12k'],
          ['Premium unlocks', '89%'],
          ['Avg. session', '17 min']
        ].map(([label, value]) => (
          <div key={label} style={{ background: '#fff', borderRadius: 18, padding: 20 }}>
            <p style={{ margin: '0 0 8px', color: '#475569' }}>{label}</p>
            <strong style={{ fontSize: 28 }}>{value}</strong>
          </div>
        ))}
      </section>
    </main>
  )
}
