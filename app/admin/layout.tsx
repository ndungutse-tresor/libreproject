import Link from 'next/link'
import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import AdminSignOut from '../components/AdminSignOut'
import AdminNavigation from '../components/AdminNavigation'

type AdminProfile = {
  name: string
  email: string
  role: 'admin' | 'super' | 'user'
  perms: string[]
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return (
      <main className="admin-gate">
        <section>
          <span className="admin-brand">libra<span>.</span></span>
          <p className="admin-eyebrow">Administration</p>
          <h1>Sign in to your admin workspace</h1>
          <p>Use your existing Libra account. Admin access is based on your account role and permissions.</p>
          <Link className="admin-primary-link" href="/login?next=%2Fadmin">Continue to login</Link>
        </section>
      </main>
    )
  }

  let profile: AdminProfile | undefined
  try {
    const { rows } = await getPool().query(
      'SELECT name, email, role, perms FROM profiles WHERE id = $1',
      [userId]
    )
    profile = rows[0] as AdminProfile | undefined
  } catch (error) {
    console.error('Unable to verify admin workspace access:', error)
    return (
      <main className="admin-gate">
        <section>
          <span className="admin-brand">libra<span>.</span></span>
          <p className="admin-eyebrow">Administration</p>
          <h1>Workspace unavailable</h1>
          <p>We could not verify your administrator account. Check the database connection and try again.</p>
          <Link className="admin-primary-link" href="/login">Return to login</Link>
        </section>
      </main>
    )
  }

  if (!profile || !['admin', 'super'].includes(profile.role)) {
    return (
      <main className="admin-gate">
        <section>
          <span className="admin-brand">libra<span>.</span></span>
          <p className="admin-eyebrow">Access restricted</p>
          <h1>This workspace is for administrators</h1>
          <p>Your current account does not have administrator access.</p>
          <Link className="admin-primary-link" href="/library">Return to your library</Link>
        </section>
      </main>
    )
  }

  const isSuper = profile.role === 'super'
  const canManageUsers = isSuper || profile.perms.includes('users')
  const canManagePayments = isSuper || profile.perms.includes('payments')
  const canManageContent = isSuper || profile.perms.includes('content')

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand"><span className="admin-brand-mark" aria-hidden="true">L</span><span>libra<span>.</span></span></Link>
        <div className="admin-sidebar-section">
          <p className="admin-sidebar-label">WORKSPACE</p>
          <AdminNavigation
            canManageUsers={canManageUsers}
            canManagePayments={canManagePayments}
            canManageContent={canManageContent}
            isSuperAdmin={isSuper}
          />
        </div>
        <div className="admin-sidebar-footer">
          <span className="admin-sidebar-caption">A little more room to read.</span>
          <Link href="/" className="admin-sidebar-home"><span aria-hidden="true">↗</span> View Libra site</Link>
        </div>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-topbar-heading">
            <span className="admin-topbar-label">LIBRA CONTROL CENTER</span>
            <strong>Admin workspace</strong>
          </div>
          <div className="admin-account">
            <div className="admin-avatar" aria-hidden="true">{profile.name.trim().slice(0, 1).toUpperCase()}</div>
            <div className="admin-account-copy"><strong>{profile.name}</strong><span>{isSuper ? 'Super administrator' : 'Administrator'}</span></div>
            <AdminSignOut />
          </div>
        </header>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  )
}
