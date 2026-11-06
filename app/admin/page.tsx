import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import AdminAccessDenied from './AdminAccessDenied'

type CountRow = { count: string }
type RecentUser = { name: string; email: string; role: string; created_at: Date }
type RecentOrder = { id: string; name: string; plan: string; amount: string; currency: string; status: string; created_at: Date }
type AdminDashboardProfile = { role: string; perms: string[] }

export default async function AdminDashboardPage() {
  let profile: AdminDashboardProfile | undefined
  const userId = await getSessionUserId()

  try {
    if (userId) {
      const { rows } = await getPool().query<AdminDashboardProfile>(
        'SELECT role, perms FROM profiles WHERE id = $1',
        [userId]
      )
      profile = rows[0]
    }
  } catch (error) {
    console.error('Unable to verify admin dashboard access:', error)
    return (
      <section className="admin-error-panel">
        <p className="admin-eyebrow">DASHBOARD UNAVAILABLE</p>
        <h1>We couldn’t verify your workspace access.</h1>
        <p>Check the database connection and try again.</p>
      </section>
    )
  }

  if (profile?.role !== 'super') {
    if (profile?.role === 'admin') redirect('/admin/home')
    return <AdminAccessDenied />
  }

  try {
    const pool = getPool()
    const [members, premium, plans, paidOrders, recentUsers, recentOrders, auditEvents] = await Promise.all([
      pool.query<CountRow>('SELECT count(*)::text AS count FROM profiles'),
      pool.query<CountRow>("SELECT count(*)::text AS count FROM profiles WHERE premium_until > now()"),
      pool.query<CountRow>('SELECT count(*)::text AS count FROM plans WHERE enabled = true'),
      pool.query<CountRow>("SELECT count(*)::text AS count FROM orders WHERE status = 'paid'"),
      pool.query<RecentUser>(
        'SELECT name, email, role, created_at FROM profiles ORDER BY created_at DESC LIMIT 6'
      ),
      pool.query<RecentOrder>(
        `SELECT orders.id::text, profiles.name, plans.name AS plan, orders.amount::text, orders.currency,
                orders.status, orders.created_at
         FROM orders
         JOIN profiles ON profiles.id = orders.user_id
         JOIN plans ON plans.id = orders.plan_id
         ORDER BY orders.created_at DESC
         LIMIT 5`
      ),
      pool.query<CountRow>('SELECT count(*)::text AS count FROM admin_audit_log')
    ])

    const stats = [
      { label: 'Total members', value: members.rows[0].count, note: 'Registered Libra accounts', mark: '♙' },
      { label: 'Premium members', value: premium.rows[0].count, note: 'Currently active access', mark: '✦' },
      { label: 'Paid orders', value: paidOrders.rows[0].count, note: 'Completed purchases', mark: '↗' },
      { label: 'Active plans', value: plans.rows[0].count, note: 'Available on pricing page', mark: '◇' },
      { label: 'Admin history', value: auditEvents.rows[0].count, note: 'Recorded admin actions', mark: '◷' }
    ]

    return (
      <div className="admin-dashboard">
        <section className="admin-welcome">
          <div>
            <p className="admin-eyebrow">YOUR PLATFORM AT A GLANCE</p>
            <h1>Good day. Here’s your overview.</h1>
            <p>Keep an eye on your community and manage the Libra reading experience.</p>
          </div>
          <Link href="/admin/history" className="admin-primary-link">Review admin history <span aria-hidden="true">→</span></Link>
        </section>

        <section className="admin-stat-grid" aria-label="Platform metrics">
          {stats.map((stat) => (
            <article className="admin-stat-card" key={stat.label}>
              <div className="admin-stat-heading"><span>{stat.label}</span><span className="admin-stat-mark" aria-hidden="true">{stat.mark}</span></div>
              <strong>{stat.value}</strong>
              <p>{stat.note}</p>
            </article>
          ))}
        </section>

        <div className="admin-dashboard-grid">
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div><p className="admin-eyebrow">COMMUNITY</p><h2>Recently joined</h2></div>
              <Link href="/admin/users">All members <span aria-hidden="true">→</span></Link>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Member</th><th>Account type</th><th>Joined</th></tr></thead>
                <tbody>
                  {recentUsers.rows.map((user) => (
                    <tr key={user.email}>
                      <td><strong>{user.name}</strong><span className="admin-table-sub">{user.email}</span></td>
                      <td><span className={`admin-badge ${user.role === 'user' ? 'admin-badge-neutral' : 'admin-badge-green'}`}>{user.role === 'super' ? 'Super admin' : user.role === 'admin' ? 'Admin' : 'Member'}</span></td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {recentUsers.rows.length === 0 && <tr><td colSpan={3} className="admin-empty-cell">New members will appear here.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div><p className="admin-eyebrow">PLATFORM</p><h2>Recent orders</h2></div>
              <Link href="/admin/orders">All orders <span aria-hidden="true">→</span></Link>
            </div>
            <div className="admin-order-list">
              {recentOrders.rows.map((order) => (
                <article className="admin-order-row" key={order.id}>
                  <span className="admin-order-icon" aria-hidden="true">{order.status === 'paid' ? '✓' : '◷'}</span>
                  <div className="admin-order-copy"><strong>{order.plan}</strong><span>{order.name} · {new Date(order.created_at).toLocaleDateString()}</span></div>
                  <div className="admin-order-amount"><strong>{order.currency} {Number(order.amount).toFixed(2)}</strong><span className={`admin-badge ${order.status === 'paid' ? 'admin-badge-green' : 'admin-badge-neutral'}`}>{order.status}</span></div>
                </article>
              ))}
              {recentOrders.rows.length === 0 && <p className="admin-empty-state">Completed and pending orders will appear here.</p>}
            </div>
          </section>
        </div>

        <section className="admin-shortcuts">
          <div><span className="admin-shortcut-icon" aria-hidden="true">♙</span><div><strong>Manage your community</strong><p>Search members and update their reading access.</p></div><Link href="/admin/users" aria-label="Open user management">→</Link></div>
          <div><span className="admin-shortcut-icon" aria-hidden="true">◇</span><div><strong>Configure the platform</strong><p>Review plans, payment methods, coupons, and currencies.</p></div><Link href="/admin/payments" aria-label="Open platform settings">→</Link></div>
        </section>
      </div>
    )
  } catch (error) {
    console.error('Unable to load admin dashboard:', error)
    return (
      <section className="admin-error-panel">
        <p className="admin-eyebrow">DASHBOARD UNAVAILABLE</p>
        <h1>We couldn’t load your platform overview.</h1>
        <p>Check the database connection and try again.</p>
      </section>
    )
  }
}
