import Link from 'next/link'
import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import LibraAdminShell from './glass/LibraAdminShell'
import './glass/glass-admin.css'
import './glass/libra-admin.css'

type AdminProfile = {
  name: string
  email: string
  role: 'admin' | 'super' | 'user'
  perms: string[]
  has_image: boolean
}

/** Sign-in and access messages, on the same glass as the workspace. */
function Gate({ eyebrow, title, text, href, action }: { eyebrow: string; title: string; text: string; href: string; action: string }) {
  return (
    <main className="ga-shell ga-gate">
      <div className="ga-backdrop" aria-hidden="true"><span /><span /><span /></div>
      <section className="ga-gate-card">
        <span className="ga-brand-mark" aria-hidden="true">L</span>
        <p className="ga-gate-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{text}</p>
        <Link className="ga-button is-dark" href={href}>{action}</Link>
      </section>
    </main>
  )
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return <Gate eyebrow="Administration" title="Sign in to your admin workspace" text="Use your existing Libra account. Admin access is based on your account role and permissions." href="/login?next=%2Fadmin" action="Continue to login" />
  }

  let profile: AdminProfile | undefined
  try {
    const { rows } = await getPool().query(
      'SELECT name, email, role, perms, profile_image_mime_type IS NOT NULL AS has_image FROM profiles WHERE id = $1',
      [userId]
    )
    profile = rows[0] as AdminProfile | undefined
  } catch (error) {
    console.error('Unable to verify admin workspace access:', error)
    return <Gate eyebrow="Administration" title="Workspace unavailable" text="We could not verify your administrator account. Check the database connection and try again." href="/login" action="Return to login" />
  }

  if (!profile || !['admin', 'super'].includes(profile.role)) {
    return <Gate eyebrow="Access restricted" title="This workspace is for administrators" text="Your current account does not have administrator access." href="/library" action="Return to your library" />
  }

  const isSuper = profile.role === 'super'
  const can = {
    users: isSuper || profile.perms.includes('users'),
    payments: isSuper || profile.perms.includes('payments'),
    content: isSuper || profile.perms.includes('content')
  }

  // What is waiting on each page, for the counts beside the navigation.
  let counts = { pendingWriters: 0, pendingOrders: 0, pendingSubmissions: 0 }
  let meter = { premium: 0, members: 0 }
  try {
    const { rows } = await getPool().query(
      `SELECT
         (SELECT count(*) FROM profiles WHERE account_type = 'writer' AND writer_status = 'pending')::int AS pending_writers,
         (SELECT count(*) FROM orders WHERE status = 'pending')::int AS pending_orders,
         (SELECT count(*) FROM content_submissions WHERE status = 'pending')::int AS pending_submissions,
         (SELECT count(*) FROM profiles WHERE premium_until > now())::int AS premium,
         (SELECT count(*) FROM profiles)::int AS members`
    )
    const row = rows[0]
    counts = { pendingWriters: row.pending_writers, pendingOrders: row.pending_orders, pendingSubmissions: row.pending_submissions }
    meter = { premium: row.premium, members: row.members }
  } catch (error) {
    // The counts are a convenience; the workspace still opens without them.
    console.error('Unable to load admin navigation counts:', error)
  }

  return (
    <LibraAdminShell
      isSuper={isSuper}
      can={can}
      counts={counts}
      meter={meter}
      user={{ name: profile.name, role: isSuper ? 'Super administrator' : 'Administrator', hasImage: profile.has_image }}
    >
      {children}
    </LibraAdminShell>
  )
}
