import { NextResponse } from 'next/server'
import type { PoolClient } from 'pg'
import Stripe from 'stripe'
import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Sign in before checkout.' }, { status: 401 })
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 })
  }

  let client: PoolClient | undefined
  let orderId: string | undefined
  let stripeSessionCreated = false
  try {
    const body = await request.json()
    const planId = Number(body.planId)
    const methodKey = typeof body.methodKey === 'string' ? body.methodKey : ''
    const currency = typeof body.currency === 'string' ? body.currency.toUpperCase() : ''
    const couponCode = typeof body.coupon === 'string' ? body.coupon.trim().toUpperCase() : ''
    if (!Number.isSafeInteger(planId) || planId < 1 || !/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json({ error: 'Invalid plan or currency.' }, { status: 400 })
    }
    if (methodKey !== 'card') {
      return NextResponse.json({ error: 'This payment provider is not yet available.' }, { status: 501 })
    }

    const pool = getPool()
    client = await pool.connect()
    await client.query('BEGIN')

    const [planResult, methodResult, currencyResult] = await Promise.all([
      client.query('SELECT * FROM plans WHERE id = $1 AND enabled = true', [planId]),
      client.query('SELECT * FROM payment_methods WHERE key = $1 AND enabled = true', [methodKey]),
      client.query('SELECT * FROM currencies WHERE code = $1 AND enabled = true', [currency])
    ])
    const plan = planResult.rows[0]
    const method = methodResult.rows[0]
    const currencyRow = currencyResult.rows[0]
    if (!plan || !method || !currencyRow || !method.currencies.includes(currency)) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Plan, payment method, or currency is not available.' }, { status: 400 })
    }

    let usd = Number(plan.price_usd)
    let appliedCoupon: string | null = null
    if (couponCode) {
      const couponResult = await client.query(
        'SELECT * FROM coupons WHERE code = $1 AND enabled = true FOR UPDATE',
        [couponCode]
      )
      const coupon = couponResult.rows[0]
      if (coupon && (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) && (coupon.max_uses === null || coupon.used < coupon.max_uses)) {
        usd *= 1 - Number(coupon.percent_off) / 100
        appliedCoupon = coupon.code
        await client.query('UPDATE coupons SET used = used + 1 WHERE code = $1', [coupon.code])
      }
    }

    const amount = Math.round(usd * Number(currencyRow.rate_to_usd) * 100) / 100
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, plan_id, method_id, currency, amount, coupon)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [userId, plan.id, method.id, currency, amount, appliedCoupon]
    )
    orderId = String(orderResult.rows[0].id)
    await client.query('COMMIT')

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const baseUrl = process.env.SITE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:3000'
    const zeroDecimal = currency === 'RWF'
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: orderId,
      metadata: { orderId },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: Math.round(amount * (zeroDecimal ? 1 : 100)),
          product_data: { name: plan.name }
        }
      }],
      success_url: `${baseUrl}/library?paid=1`,
      cancel_url: `${baseUrl}/pricing`
    })
    stripeSessionCreated = true
    if (!session.url) throw new Error('Stripe did not return a checkout URL')
    await pool.query('UPDATE orders SET provider_ref = $1 WHERE id = $2', [session.id, orderId])
    return NextResponse.json({ url: session.url })
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        console.error('Unable to roll back checkout transaction:', rollbackError)
      }
    }
    if (orderId && !stripeSessionCreated) {
      try {
        await getPool().query("UPDATE orders SET status = 'failed' WHERE id = $1 AND status = 'pending'", [orderId])
      } catch (updateError) {
        console.error('Unable to mark failed checkout order:', updateError)
      }
    }
    console.error('Checkout creation failed:', error)
    return NextResponse.json({ error: 'Unable to create checkout session.' }, { status: 500 })
  } finally {
    client?.release()
  }
}
