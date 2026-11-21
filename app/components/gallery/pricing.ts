'use client'

import { useEffect, useState } from 'react'

export type Plan = { id: string; name: string; kind: 'time' | 'premium' | string; minutes: number | null; duration_days: number | null; price_usd: string }
export type Currency = { code: string; symbol: string; rate_to_usd: string }
export type PaymentMethod = { key: string; label: string; provider: string; currencies: string[] }
export type Pricing = { plans: Plan[]; currencies: Currency[]; methods: PaymentMethod[] }

let request: Promise<Pricing> | null = null

function loadPricing() {
  request ??= fetch('/api/plans')
    .then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to load plans.')
      return data as Pricing
    })
    .catch((error: unknown) => {
      request = null
      throw error
    })
  return request
}

/** Plans, currencies and payment methods, fetched once per page load. */
export function usePricing() {
  const [pricing, setPricing] = useState<Pricing | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    loadPricing()
      .then((data) => { if (active) setPricing(data) })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load plans.') })
    return () => { active = false }
  }, [])
  return { pricing, error }
}

const CURRENCY_KEY = 'libra.currency'
const CURRENCY_EVENT = 'libra:currency'

/** The visitor's display currency, shared between the header and the page. */
export function useCurrency(): [string, (code: string) => void] {
  const [currency, setCurrency] = useState('USD')
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CURRENCY_KEY)
      if (saved) setCurrency(saved)
    } catch { /* storage unavailable */ }
    const onChange = (event: Event) => setCurrency((event as CustomEvent<string>).detail)
    window.addEventListener(CURRENCY_EVENT, onChange)
    return () => window.removeEventListener(CURRENCY_EVENT, onChange)
  }, [])
  const update = (code: string) => {
    setCurrency(code)
    try { window.localStorage.setItem(CURRENCY_KEY, code) } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(CURRENCY_EVENT, { detail: code }))
  }
  return [currency, update]
}

export function formatPrice(usd: number, currency: Currency | undefined) {
  if (!currency) return `$${usd.toFixed(2)}`
  const amount = usd * Number(currency.rate_to_usd)
  const digits = currency.code === 'RWF' ? 0 : 2
  return `${currency.symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}
