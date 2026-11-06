import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import AdminAccessDenied from '../AdminAccessDenied'

const sections = [
  { permission: 'users', href: '/admin/users', title: 'Members', description: 'Manage member access and the accounts you are authorized to support.', icon: '♙' },
  { permission: 'payments', href: '/admin/orders', title: 'Orders & platform settings', description: 'Review transactions and manage the settings granted to your account.', icon: '◇' },
  { permission: 'content', href: '/admin/content', title: 'Publishing', description: 'Review submissions and manage approved content.', icon: '✎' }
] as const

export default async function DelegatedAdminHomePage() {
  const userId = await getSessionUserId()
  if (!userId) return <AdminAccessDenied />

  let profile: { name: string; role: string; perms: string[] } | undefined
  try {
    const { rows } = await getPool().query(
      'SELECT name, role, perms FROM profiles WHERE id = $1',
      [userId]
    )
    profile = rows[0]
  } catch (error) {
    console.error('Unable to load delegated admin dashboard:', error)
    return (
      <section className="admin-error-panel">
        <p className="admin-eyebrow">DASHBOARD UNAVAILABLE</p>
        <h1>We couldn’t load your workspace.</h1>
        <p>Check the database connection and try again.</p>
      </section>
    )
  }

  if (!profile || profile.role !== 'admin') {
    if (profile?.role === 'super') redirect('/admin')
    return <AdminAccessDenied />
  }

  const accessibleSections = sections.filter((section) => profile.perms.includes(section.permission))
  return (
    <div className="admin-dashboard admin-delegated-dashboard">
      <section className="admin-welcome">
        <div>
          <p className="admin-eyebrow">YOUR ADMIN WORKSPACE</p>
          <h1>Welcome, {profile.name}.</h1>
          <p>Your workspace only includes the areas the super administrator has granted to your account.</p>
        </div>
      </section>
      <section className="admin-delegated-sections" aria-label="Your permitted admin sections">
        {accessibleSections.map((section) => (
          <Link className="admin-delegated-section" href={section.href} key={section.permission}>
            <span className="admin-shortcut-icon" aria-hidden="true">{section.icon}</span>
            <span><strong>{section.title}</strong><small>{section.description}</small></span>
            <span className="admin-delegated-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
        {accessibleSections.length === 0 && (
          <p className="admin-permission-note">No admin sections have been assigned to your account yet. Contact the super administrator if you need access.</p>
        )}
      </section>
    </div>
  )
}
