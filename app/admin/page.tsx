import { redirect } from 'next/navigation'
import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { books as catalogue } from '../libra-data'
import AdminAccessDenied from './AdminAccessDenied'
import LibraOverview, { type OverviewData } from './glass/LibraOverview'

type AdminDashboardProfile = { name: string; role: string; perms: string[] }

export default async function AdminDashboardPage() {
  let profile: AdminDashboardProfile | undefined
  const userId = await getSessionUserId()

  try {
    if (userId) {
      const { rows } = await getPool().query<AdminDashboardProfile>(
        'SELECT name, role, perms FROM profiles WHERE id = $1',
        [userId]
      )
      profile = rows[0]
    }
  } catch (error) {
    console.error('Unable to verify admin dashboard access:', error)
    return <Unavailable title="We couldn’t verify your workspace access." />
  }

  if (profile?.role !== 'super') {
    if (profile?.role === 'admin') redirect('/admin/home')
    return <AdminAccessDenied />
  }

  try {
    const pool = getPool()
    // Order amounts are stored in the buyer's currency; rate_to_usd is units per US dollar.
    const [monthly, plans, stats, recentOrders, recentMembers, activity] = await Promise.all([
      pool.query<{ month: string; usd: number; orders: number }>(
        `SELECT to_char(date_trunc('month', orders.created_at), 'YYYY-MM') AS month,
                coalesce(sum(orders.amount / NULLIF(currencies.rate_to_usd, 0)), 0)::float AS usd,
                count(*)::int AS orders
         FROM orders
         JOIN currencies ON currencies.code = orders.currency
         WHERE orders.status = 'paid' AND orders.created_at >= date_trunc('month', now()) - interval '11 months'
         GROUP BY 1
         ORDER BY 1`
      ),
      pool.query<{ label: string; usd: number; orders: number }>(
        `SELECT plans.name AS label,
                coalesce(sum(orders.amount / NULLIF(currencies.rate_to_usd, 0)), 0)::float AS usd,
                count(*)::int AS orders
         FROM orders
         JOIN plans ON plans.id = orders.plan_id
         JOIN currencies ON currencies.code = orders.currency
         WHERE orders.status = 'paid' AND orders.created_at >= now() - interval '12 months'
         GROUP BY plans.name
         ORDER BY usd DESC`
      ),
      pool.query(
        `SELECT
           (SELECT count(*) FROM profiles)::int AS members,
           (SELECT count(*) FROM profiles WHERE created_at >= date_trunc('month', now()))::int AS members_this_month,
           (SELECT count(*) FROM profiles WHERE created_at >= date_trunc('month', now()) - interval '1 month'
                                            AND created_at < date_trunc('month', now()))::int AS members_last_month,
           (SELECT count(*) FROM content_submissions WHERE status = 'pending')::int AS pending_submissions,
           (SELECT count(*) FROM profiles WHERE account_type = 'writer' AND writer_status = 'pending')::int AS pending_writers,
           (SELECT count(*) FROM profiles WHERE account_type = 'writer' AND writer_status = 'approved')::int AS writers,
           (SELECT count(*) FROM profiles WHERE premium_until > now())::int AS premium,
           (SELECT count(*) FROM orders WHERE status = 'paid')::int AS paid_total,
           (SELECT count(*) FROM orders WHERE status = 'pending')::int AS pending_orders,
           (SELECT count(*) FROM books WHERE is_published)::int AS db_books,
           (SELECT count(*) FROM content_submissions WHERE status = 'approved')::int AS approved_work,
           (SELECT count(*) FROM admin_audit_log WHERE created_at >= now() - interval '30 days')::int AS audit_30`
      ),
      pool.query(
        `SELECT orders.id::text AS id, profiles.name, profiles.email, plans.name AS plan,
                orders.amount::float AS amount, orders.currency, orders.status, orders.created_at
         FROM orders
         JOIN profiles ON profiles.id = orders.user_id
         JOIN plans ON plans.id = orders.plan_id
         ORDER BY orders.created_at DESC
         LIMIT 6`
      ),
      pool.query(
        `SELECT id::text AS id, name, email, role, account_type, writer_status, created_at
         FROM profiles ORDER BY created_at DESC LIMIT 6`
      ),
      pool.query(
        `SELECT id::text AS id, actor_name, summary, entity_type, created_at
         FROM admin_audit_log ORDER BY created_at DESC LIMIT 6`
      )
    ])

    const s = stats.rows[0]
    const data: OverviewData = {
      name: profile.name.trim().split(/\s+/)[0] || 'there',
      monthly: monthly.rows,
      plans: plans.rows,
      stats: {
        members: s.members,
        membersThisMonth: s.members_this_month,
        membersLastMonth: s.members_last_month,
        pendingSubmissions: s.pending_submissions,
        pendingWriters: s.pending_writers,
        writers: s.writers,
        premium: s.premium,
        paidTotal: s.paid_total,
        pendingOrders: s.pending_orders,
        books: catalogue.length + s.db_books,
        writerBooks: s.db_books,
        approvedWork: s.approved_work,
        audit30: s.audit_30
      },
      recentOrders: recentOrders.rows.map((row) => ({ ...row, created_at: new Date(row.created_at).toISOString() })),
      recentMembers: recentMembers.rows.map((row) => ({ ...row, created_at: new Date(row.created_at).toISOString() })),
      activity: activity.rows.map((row) => ({ ...row, created_at: new Date(row.created_at).toISOString() }))
    }
    return <LibraOverview data={data} />
  } catch (error) {
    console.error('Unable to load admin dashboard:', error)
    return <Unavailable title="We couldn’t load your platform overview." />
  }
}

function Unavailable({ title }: { title: string }) {
  return (
    <div className="ga-empty" role="alert">
      <strong>{title}</strong>
      <span>Check the database connection and try again.</span>
    </div>
  )
}
