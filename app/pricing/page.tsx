'use client'

import { useState } from 'react'
import Link from 'next/link'
import LibraHeader from '../components/gallery/LibraHeader'
import { OrderDrawer, PlanThumb, planLength } from '../components/gallery/OrderDrawer'
import { formatPrice, useCurrency, usePricing, type Plan } from '../components/gallery/pricing'
import '../components/gallery/gallery.css'
import '../components/gallery/libra.css'

export default function PricingPage() {
  const { pricing, error } = usePricing()
  const [currencyCode, setCurrencyCode] = useCurrency()
  const [chosen, setChosen] = useState<Plan | null>(null)

  const currencies = pricing?.currencies ?? []
  const currency = currencies.find((item) => item.code === currencyCode) ?? currencies.find((item) => item.code === 'USD') ?? currencies[0]
  const cardAvailable = Boolean(currency && pricing?.methods.some((method) => method.key === 'card' && method.currencies.includes(currency.code)))
  const plans = [...(pricing?.plans ?? [])].sort((a, b) => (a.kind === b.kind ? Number(a.price_usd) - Number(b.price_usd) : a.kind === 'premium' ? 1 : -1))

  function perUnit(plan: Plan) {
    if (!currency) return ''
    if (plan.kind === 'premium' && plan.duration_days) return `${formatPrice(Number(plan.price_usd) / plan.duration_days, currency)} a day`
    if (plan.minutes) return `${formatPrice((Number(plan.price_usd) / plan.minutes) * 60, currency)} an hour`
    return ''
  }

  return (
    <main className="gs-root">
      <LibraHeader />
      <section className="lp-page">
        <div className="lp-intro">
          <div>
            <p className="gs-crumb"><Link href="/library">Library</Link> / Plans</p>
            <h1 className="gs-kicker">Reading plans</h1>
            <p className="gs-desc">The first half of every sample book is free, and community books are always free. Add reading time when you want to keep going, or go Premium for no limits at all.</p>
          </div>
          {currencies.length > 1 && <div className="gs-option">
            <p className="gs-option-label">Currency: <span>{currency?.code}</span></p>
            <div className="gs-chips">
              {currencies.map((item) => <button key={item.code} type="button" className="gs-chip" aria-pressed={currency?.code === item.code} onClick={() => setCurrencyCode(item.code)}>{item.code}</button>)}
            </div>
          </div>}
        </div>

        {error && <p className="gs-error" role="alert">Plans could not be loaded right now. {error}</p>}

        <div className="lp-grid">
          <article className="lp-card" style={{ animationDelay: '0ms' }}>
            <p className="lp-tag">Always</p>
            <h2 className="lp-name">Free</h2>
            <p className="lp-price">Free</p>
            <p className="lp-sub">No card needed</p>
            <ul className="lp-features">
              <li>The first half of every sample book</li>
              <li>Every community book, in full</li>
              <li>Day and night reading</li>
            </ul>
            <Link className="gs-cta is-light" href="/library">Start reading</Link>
          </article>

          {!pricing && !error && [0, 1, 2].map((index) => <div key={index} className="lp-skeleton" aria-hidden="true" />)}

          {plans.map((plan, index) => {
            const premium = plan.kind === 'premium'
            return (
              <article key={plan.id} className={`lp-card${premium ? ' is-premium' : ''}`} style={{ animationDelay: `${(index + 1) * 70}ms` }}>
                <p className="lp-tag">{premium ? 'No limits' : 'Top up'}</p>
                <h2 className="lp-name">{premium ? plan.name : planLength(plan)}</h2>
                <p className="lp-price">{formatPrice(Number(plan.price_usd), currency)}</p>
                <p className="lp-sub">{perUnit(plan)}</p>
                <ul className="lp-features">
                  {premium
                    ? <><li>Every page of every book, for {planLength(plan)}</li><li>No clock while you read</li><li>One payment, no automatic renewal</li></>
                    : <><li>{planLength(plan)} of reading time</li><li>Use it on any locked page</li><li>Only counts down while a locked page is open</li></>}
                </ul>
                <button type="button" className="gs-cta" disabled={!cardAvailable} onClick={() => setChosen(plan)}>
                  {cardAvailable ? 'Add to order' : 'Card payments unavailable'}
                </button>
              </article>
            )
          })}
        </div>

        <div className="lp-faq">
          <div><h3>How does reading time work?</h3><p>It only counts down while a locked page is open, in 15-second steps, and stops the moment you close the book.</p></div>
          <div><h3>Does Premium renew?</h3><p>No. Premium is a one-time purchase for the days shown, so nothing is charged again unless you buy it again.</p></div>
          <div><h3>Which currencies can I pay in?</h3><p>{currencies.length ? `${currencies.map((item) => item.code).join(', ')}. ` : ''}Prices are converted from US dollars at the rate set by the Libra team.</p></div>
        </div>
      </section>

      {chosen && <OrderDrawer
        plan={chosen}
        currency={currency}
        cardAvailable={cardAvailable}
        thumb={<PlanThumb plan={chosen} />}
        note="Use it on any book in the library."
        onClose={() => setChosen(null)}
      />}
    </main>
  )
}
