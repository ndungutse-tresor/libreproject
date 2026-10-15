import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = request.headers.get('stripe-signature')
  if (!secret || !webhookSecret || !signature) {
    return NextResponse.json({ error: 'Stripe webhook is not configured.' }, { status: 503 })
  }

  let event: Stripe.Event
  try {
    const stripe = new Stripe(secret)
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret)
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  if (session.payment_status !== 'paid' || !session.client_reference_id) {
    return NextResponse.json({ received: true })
  }

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT o.id, o.user_id, o.status, o.provider_ref, p.kind, p.minutes, p.duration_days
       FROM orders o JOIN plans p ON p.id = o.plan_id
       WHERE o.id = $1 FOR UPDATE`,
      [session.client_reference_id]
    )
    const order = rows[0]
    if (!order || order.status !== 'pending' || (order.provider_ref && order.provider_ref !== session.id)) {
      await client.query('ROLLBACK')
      return NextResponse.json({ received: true })
    }

    await client.query(
      "UPDATE orders SET status = 'paid', provider_ref = $2 WHERE id = $1 AND status = 'pending'",
      [order.id, session.id]
    )
    if (order.kind === 'time' && order.minutes) {
      await client.query(
        'UPDATE profiles SET reading_seconds = reading_seconds + $1 WHERE id = $2',
        [Number(order.minutes) * 60, order.user_id]
      )
    } else if (order.kind === 'premium' && order.duration_days) {
      await client.query(
        `UPDATE profiles
         SET premium_until = GREATEST(COALESCE(premium_until, now()), now()) + ($1 * interval '1 day')
         WHERE id = $2`,
        [order.duration_days, order.user_id]
      )
    }
    await client.query('COMMIT')
    return NextResponse.json({ received: true })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Unable to process paid Stripe order:', error)
    return NextResponse.json({ error: 'Unable to process paid order.' }, { status: 500 })
  } finally {
    client.release()
  }
}
