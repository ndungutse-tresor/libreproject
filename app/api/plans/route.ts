import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const pool = getPool()
    const [plans, currencies, methods] = await Promise.all([
      pool.query('SELECT id, kind, name, minutes, duration_days, price_usd FROM plans WHERE enabled = true ORDER BY price_usd'),
      pool.query('SELECT code, symbol, rate_to_usd FROM currencies WHERE enabled = true ORDER BY code'),
      pool.query('SELECT key, label, provider, currencies FROM payment_methods WHERE enabled = true ORDER BY id')
    ])
    return NextResponse.json({
      plans: plans.rows,
      currencies: currencies.rows,
      methods: methods.rows
    })
  } catch (error) {
    console.error('Unable to load pricing:', error)
    return NextResponse.json({ error: 'Unable to load plans.' }, { status: 500 })
  }
}
