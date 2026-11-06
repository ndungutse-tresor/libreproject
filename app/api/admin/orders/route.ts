import { NextResponse } from 'next/server'
import { hasPaymentAdminAccess } from '@/lib/admin'
import { getPool } from '@/lib/db'

export const runtime = 'nodejs'

const ORDER_STATUSES = ['all', 'paid', 'pending', 'failed'] as const
type OrderStatus = (typeof ORDER_STATUSES)[number]

export async function GET(request: Request) {
  try {
    if (!(await hasPaymentAdminAccess())) {
      return NextResponse.json({ error: 'You do not have permission to view orders.' }, { status: 403 })
    }

    const searchParams = new URL(request.url).searchParams
    const requestedStatus = searchParams.get('status') ?? 'all'
    const status: OrderStatus = ORDER_STATUSES.includes(requestedStatus as OrderStatus)
      ? requestedStatus as OrderStatus
      : 'all'
    const search = (searchParams.get('q') ?? '').trim().slice(0, 120)
    const requestedPage = Number(searchParams.get('page') ?? '1')
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const pageSize = 25
    const offset = (page - 1) * pageSize
    const pool = getPool()

    const [orders, count, summary] = await Promise.all([
      pool.query(
        `SELECT orders.id::text AS id, profiles.name, profiles.email, plans.name AS plan,
                payment_methods.label AS method, orders.amount::text AS amount, orders.currency,
                orders.status, orders.created_at
         FROM orders
         JOIN profiles ON profiles.id = orders.user_id
         JOIN plans ON plans.id = orders.plan_id
         JOIN payment_methods ON payment_methods.id = orders.method_id
         WHERE ($1 = 'all' OR orders.status = $1)
           AND ($2 = '' OR orders.id::text ILIKE '%' || $2 || '%'
                OR profiles.name ILIKE '%' || $2 || '%'
                OR profiles.email ILIKE '%' || $2 || '%'
                OR plans.name ILIKE '%' || $2 || '%')
         ORDER BY orders.created_at DESC
         LIMIT $3 OFFSET $4`,
        [status, search, pageSize, offset]
      ),
      pool.query(
        `SELECT count(*)::text AS total
         FROM orders
         JOIN profiles ON profiles.id = orders.user_id
         JOIN plans ON plans.id = orders.plan_id
         WHERE ($1 = 'all' OR orders.status = $1)
           AND ($2 = '' OR orders.id::text ILIKE '%' || $2 || '%'
                OR profiles.name ILIKE '%' || $2 || '%'
                OR profiles.email ILIKE '%' || $2 || '%'
                OR plans.name ILIKE '%' || $2 || '%')`,
        [status, search]
      ),
      pool.query(
        `SELECT count(*)::text AS total,
                count(*) FILTER (WHERE status = 'paid')::text AS paid,
                count(*) FILTER (WHERE status = 'pending')::text AS pending,
                count(*) FILTER (WHERE status = 'failed')::text AS failed
         FROM orders`
      )
    ])

    return NextResponse.json({
      orders: orders.rows,
      total: Number(count.rows[0].total),
      summary: {
        total: Number(summary.rows[0].total),
        paid: Number(summary.rows[0].paid),
        pending: Number(summary.rows[0].pending),
        failed: Number(summary.rows[0].failed)
      },
      page,
      pageSize
    })
  } catch (error) {
    console.error('Unable to load admin orders:', error)
    return NextResponse.json({ error: 'Unable to load orders.' }, { status: 500 })
  }
}
