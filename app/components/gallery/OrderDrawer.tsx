'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Drawer } from './Drawer'
import { formatPrice, type Currency, type Plan } from './pricing'

export function planLength(plan: Plan) {
  if (plan.kind === 'premium') return plan.duration_days === 1 ? '1 day' : `${plan.duration_days} days`
  if (plan.minutes && plan.minutes >= 60 && plan.minutes % 60 === 0) return plan.minutes === 60 ? '1 hour' : `${plan.minutes / 60} hours`
  return `${plan.minutes} minutes`
}

export function planLabel(plan: Plan) {
  return plan.kind === 'premium' ? `${planLength(plan)} of Premium` : `${planLength(plan)} of reading time`
}

type Props = {
  plan: Plan
  currency: Currency | undefined
  cardAvailable: boolean
  thumb: ReactNode
  /** One line under the plan name, e.g. which book it was bought from. */
  note: string
  onClose: () => void
}

/** The order "bag": one plan, an optional coupon, and the Stripe checkout button. */
export function OrderDrawer({ plan, currency, cardAvailable, thumb, note, onClose }: Props) {
  const [coupon, setCoupon] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const price = formatPrice(Number(plan.price_usd), currency)

  async function checkout() {
    if (!currency) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, methodKey: 'card', currency: currency.code, coupon })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? 'Unable to start checkout.')
        return
      }
      if (typeof data.url !== 'string') throw new Error('Checkout did not return a payment URL.')
      window.location.assign(data.url)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start checkout.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      title="Your order"
      onClose={onClose}
      footer={(close) => <>
        <p className="gs-total"><span>Total</span><span>{price}</span></p>
        <button type="button" className="gs-cta" disabled={!cardAvailable || busy} onClick={() => void checkout()}>
          {busy ? 'Starting checkout…' : cardAvailable ? 'Checkout' : 'Card payments unavailable'}
        </button>
        <button type="button" className="gs-cta is-light" onClick={close}>Keep browsing</button>
      </>}
    >
      <div className="gs-line-item">
        <span className="gs-line-thumb">{thumb}</span>
        <div>
          <p className="gs-line-title">{planLabel(plan)}</p>
          <p className="gs-line-meta">{note} Paid in {currency?.code ?? 'USD'}.</p>
        </div>
        <span className="gs-line-price">{price}</span>
      </div>
      <div className="gs-option" style={{ marginTop: 28 }}>
        <label className="gs-option-label" htmlFor="order-coupon">Coupon: <span>optional, applied at checkout</span></label>
        <input id="order-coupon" className="gs-chip" style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', cursor: 'text' }} value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Code" autoComplete="off" />
      </div>
      {error && <p className="gs-error" role="alert">
        {error}{' '}
        {/sign in/i.test(error) && <><Link href="/login">Log in</Link> or <Link href="/signup">create an account</Link>.</>}
      </p>}
      <p className="gs-fine">Secure card checkout by Stripe. Time is added to your account as soon as the payment clears.</p>
    </Drawer>
  )
}

/** A small stand-in picture for a plan in the order drawer. */
export function PlanThumb({ plan }: { plan: Plan }) {
  const premium = plan.kind === 'premium'
  return (
    <svg viewBox="0 0 72 108" role="img" aria-label={planLabel(plan)}>
      <rect width="72" height="108" fill={premium ? '#1f5c45' : '#efe4cf'} />
      <circle cx="36" cy="50" r="20" fill="none" stroke={premium ? '#e9b949' : '#2a3d7c'} strokeWidth="5" />
      <path d={premium ? 'M27 50l6 6 12-13' : 'M36 38v12l8 6'} fill="none" stroke={premium ? '#e9b949' : '#2a3d7c'} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="36" y="92" textAnchor="middle" fill={premium ? '#f3e7d3' : '#1b1b1b'} style={{ font: "600 10px Oswald, 'Arial Narrow', Arial, sans-serif", letterSpacing: '0.06em' }}>{premium ? 'PREMIUM' : planLength(plan).toUpperCase()}</text>
    </svg>
  )
}
