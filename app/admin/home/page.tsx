import { redirect } from 'next/navigation'
import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import AdminAccessDenied from '../AdminAccessDenied'
import DelegatedHome from '../glass/DelegatedHome'

const sections = [
  { permission: 'users', href: '/admin/users', title: 'Members', description: 'Manage member access and the accounts you are authorized to support.', icon: 'users', unit: 'writers to approve' },
  { permission: 'payments', href: '/admin/orders', title: 'Orders & platform settings', description: 'Review transactions and manage the settings granted to your account.', icon: 'receipt', unit: 'pending orders' },
  { permission: 'content', href: '/admin/content', title: 'Publishing', description: 'Review submissions and manage approved content.', icon: 'review', unit: 'waiting for review' }
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
      <div className="ga-empty" role="alert">
        <strong>We couldn’t load your workspace.</strong>
        <span>Check the database connection and try again.</span>
      </div>
    )
  }

  if (!profile || profile.role !== 'admin') {
    if (profile?.role === 'super') redirect('/admin')
    return <AdminAccessDenied />
  }

  const accessibleSections = sections.filter((section) => profile.perms.includes(section.permission))
  let waiting: Record<string, number> = {}
  try {
    const { rows } = await getPool().query(
      `SELECT
         (SELECT count(*) FROM profiles WHERE account_type = 'writer' AND writer_status = 'pending')::int AS users,
         (SELECT count(*) FROM orders WHERE status = 'pending')::int AS payments,
         (SELECT count(*) FROM content_submissions WHERE status = 'pending')::int AS content`
    )
    waiting = rows[0]
  } catch (error) {
    console.error('Unable to load delegated admin counts:', error)
  }

  return <DelegatedHome name={profile.name.trim().split(/\s+/)[0] || profile.name} sections={accessibleSections.map((section) => ({ ...section, waiting: waiting[section.permission] ?? 0 }))} />
}
