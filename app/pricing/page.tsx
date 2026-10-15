'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Plan = { id: string; name: string; kind: string; minutes: number | null; duration_days: number | null; price_usd: string }
type Currency = { code: string; symbol: string; rate_to_usd: string }
type PaymentMethod = { key: string; label: string; provider: string; currencies: string[] }

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [currency, setCurrency] = useState('USD')
  const [coupon, setCoupon] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/plans')
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Unable to load plans.')
        setPlans(data.plans)
        setCurrencies(data.currencies)
        setMethods(data.methods)
        if (!data.currencies.some((item: Currency) => item.code === 'USD')) {
          setCurrency(data.currencies[0]?.code ?? '')
        }
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load plans.'))
  }, [])

  const selectedCurrency = currencies.find((item) => item.code === currency)
  const cardAvailable = methods.some((item) => item.key === 'card' && item.currencies.includes(currency))

  async function checkout(planId: string) {
    setBusy(planId)
    setError('')
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, methodKey: 'card', currency, coupon })
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
      setBusy(null)
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: 32 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 12 }}>Choose your plan</h1>
      <p style={{ textAlign: 'center', color: '#475569', marginBottom: 24 }}>Get extra reading time or unlock the full library with Premium.</p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <label>
          Currency{' '}
          <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
            {currencies.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}
          </select>
        </label>
        <label>
          Coupon{' '}
          <input value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Optional" />
        </label>
      </div>

      {error && (
        <p role="alert" style={{ color: '#b91c1c', textAlign: 'center' }}>
          {error} {error.includes('Sign in') && <Link href="/login">Log in</Link>}
        </p>
      )}

      {plans.length === 0 && !error
        ? <p style={{ textAlign: 'center' }}>Loading available plans…</p>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 24, boxShadow: '0 10px 30px rgba(15,23,42,0.05)' }}>
            <h2>Free</h2>
            <p style={{ fontSize: 32, fontWeight: 700, margin: '12px 0' }}>Free</p>
            <p style={{ color: '#475569', minHeight: 48 }}>Read the free half of each sample title.</p>
            <Link href="/library" style={{ display: 'inline-block', background: '#111827', color: '#fff', textDecoration: 'none', padding: '10px 18px', borderRadius: 999 }}>Start reading</Link>
          </div>
          {plans.map((plan) => {
            const amount = selectedCurrency ? Number(plan.price_usd) * Number(selectedCurrency.rate_to_usd) : Number(plan.price_usd)
            return (
              <div key={plan.id} style={{ background: '#fff', borderRadius: 18, padding: 24, boxShadow: '0 10px 30px rgba(15,23,42,0.05)' }}>
                <h2>{plan.name}</h2>
                <p style={{ fontSize: 32, fontWeight: 700, margin: '12px 0' }}>
                  {selectedCurrency?.symbol}{amount.toFixed(2)} <small style={{ fontSize: 14 }}>{currency}</small>
                </p>
                <p style={{ color: '#475569', minHeight: 48 }}>
                  {plan.kind === 'premium' ? `${plan.duration_days} days of Premium access.` : `${plan.minutes} minutes of additional reading.`}
                </p>
                <button
                  disabled={!cardAvailable || busy !== null}
                  onClick={() => void checkout(plan.id)}
                  style={{ background: '#111827', color: '#fff', border: 0, padding: '10px 18px', borderRadius: 999, opacity: !cardAvailable ? 0.5 : 1 }}
                >
                  {busy === plan.id ? 'Starting checkout…' : cardAvailable ? 'Continue to checkout' : 'Payment unavailable'}
                </button>
              </div>
            )
          })}
        </div>}
    </main>
  )
}
