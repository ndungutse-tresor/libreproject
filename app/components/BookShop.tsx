'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import BookCover from './gallery/BookCover'
import LibraHeader from './gallery/LibraHeader'
import { formatPrice, useCurrency, usePricing, type Plan } from './gallery/pricing'
import './gallery/gallery.css'

export type ShopBook =
  | {
    kind: 'sample'
    id: string
    title: string
    author: string
    year: string | null
    description: string
    excerpt: string
    collection: string
    pageCount: number
    freePages: number
  }
  | {
    kind: 'community'
    id: string
    title: string
    author: string
    year: string | null
    description: string
    excerpt: string
    collection: string
    mimeType: string
    language: string
  }

type Access = 'free' | 'time' | 'premium'

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', fr: 'French', rw: 'Kinyarwanda', sw: 'Swahili', es: 'Spanish', de: 'German' }

const SAVED_KEY = 'libra.saved'

function formatLabel(mimeType: string) {
  return mimeType === 'application/pdf' ? 'PDF' : mimeType === 'application/epub+zip' ? 'EPUB' : 'Text'
}

function planLength(plan: Plan) {
  if (plan.kind === 'premium') return plan.duration_days === 1 ? '1 day' : `${plan.duration_days} days`
  return plan.minutes === 60 ? '1 hour' : `${plan.minutes} minutes`
}

export default function BookShop({ book }: { book: ShopBook }) {
  const { pricing, error: pricingError } = usePricing()
  const [currencyCode, setCurrencyCode] = useCurrency()
  const [access, setAccess] = useState<Access>('free')
  const [planId, setPlanId] = useState<string | null>(null)
  const [coupon, setCoupon] = useState('')
  const [format, setFormat] = useState<'online' | 'download'>('online')
  const [expanded, setExpanded] = useState(false)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Lets the gallery's flying artwork know the page image is in place.
  useEffect(() => { window.dispatchEvent(new Event('gs:arrived')) }, [])

  useEffect(() => {
    try {
      const list = JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? '[]') as string[]
      setSaved(list.includes(book.id))
    } catch { /* ignore */ }
  }, [book.id])

  function toggleSaved() {
    try {
      const list = new Set(JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? '[]') as string[])
      if (list.has(book.id)) list.delete(book.id)
      else list.add(book.id)
      window.localStorage.setItem(SAVED_KEY, JSON.stringify(Array.from(list)))
      setSaved(list.has(book.id))
    } catch { /* ignore */ }
  }

  const currencies = pricing?.currencies ?? []
  const currency = currencies.find((item) => item.code === currencyCode) ?? currencies.find((item) => item.code === 'USD') ?? currencies[0]
  const plansForAccess = useMemo(() => (pricing?.plans ?? []).filter((plan) => plan.kind === access), [pricing, access])
  const plan = plansForAccess.find((item) => item.id === planId) ?? plansForAccess[0]
  const cardAvailable = Boolean(currency && pricing?.methods.some((method) => method.key === 'card' && method.currencies.includes(currency.code)))

  function chooseAccess(next: Access) {
    setAccess(next)
    setPlanId(null)
    setError('')
  }

  async function checkout() {
    if (!plan || !currency) return
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

  const fullText = book.excerpt ? `${book.description} It begins: ${book.excerpt}` : book.description
  const short = fullText.length > 190 && !expanded ? `${fullText.slice(0, 180).replace(/\s+\S*$/, '')} …` : fullText
  const readerHref = `/reader/${book.id}`
  const fileUrl = `/api/content/files?id=${encodeURIComponent(book.id)}&kind=book`
  const byline = [book.author, book.year].filter(Boolean).join(', ')

  let price: React.ReactNode
  let badge: string
  if (book.kind === 'community') {
    price = <>Free<small>{formatLabel(book.mimeType)} · community book</small></>
    badge = 'Shared by a Libra writer'
  } else if (access === 'free') {
    price = <>Free<small>pages 1–{book.freePages} of {book.pageCount}</small></>
    badge = `First half free · ${book.freePages} of ${book.pageCount} pages`
  } else if (plan) {
    price = <>{formatPrice(Number(plan.price_usd), currency)}<small>{planLength(plan)}{access === 'premium' ? ' of Premium' : ' of reading time'}</small></>
    badge = access === 'premium' ? 'Every book, no limits' : 'Use it on any locked page'
  } else {
    price = <>—<small>{pricingError ? 'plans unavailable' : 'loading plans…'}</small></>
    badge = access === 'premium' ? 'Every book, no limits' : 'Use it on any locked page'
  }

  return (
    <main className="gs-root">
      <LibraHeader />
      <article className="gs-product">
        <div className="gs-media">
          <span className="gs-media-frame" style={{ aspectRatio: '2 / 3' }}>
            <BookCover title={book.title} author={book.author} tag={book.kind === 'community' ? formatLabel(book.mimeType).toUpperCase() : undefined} />
          </span>
          <div className="gs-media-bar">
            <span>1/1</span>
            <Link className="gs-media-action" href={readerHref}>
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" /><path d="M5 5.5c1.2-.6 2.2-.6 3 0v5.5c-.8-.6-1.8-.6-3 0Zm6 0c-1.2-.6-2.2-.6-3 0v5.5c.8-.6 1.8-.6 3 0Z" fill="currentColor" /></svg>
              {book.kind === 'sample' ? 'Read a sample' : 'Open the book'}
            </Link>
            <button type="button" className="gs-media-action" aria-pressed={saved} aria-label={saved ? 'Saved on this device. Remove.' : 'Save for later on this device'} title={saved ? 'Saved' : 'Save for later'} onClick={toggleSaved}>
              <svg width="12" height="15" viewBox="0 0 12 15" aria-hidden="true"><path d="M1 1h10v13l-5-3.6L1 14Z" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" /></svg>
            </button>
          </div>
        </div>

        <div className="gs-info">
          <p className="gs-crumb"><Link href="/library">Library</Link> / {book.collection}</p>
          <h1 className="gs-kicker">{book.collection}</h1>
          <h2 className="gs-title">{book.title}</h2>
          <p className="gs-byline">{byline}</p>
          <p className="gs-desc">
            {short}{' '}
            {fullText.length > 190 && <button type="button" className="gs-more" onClick={() => setExpanded((value) => !value)}>{expanded ? 'Show less' : 'Read more »'}</button>}
          </p>

          <p className="gs-price">{price}</p>
          <p className="gs-badge">{badge}</p>

          <p className="gs-note">
            {book.kind === 'sample'
              ? 'Reading time only counts down while a locked page is open, and pauses when you close the book. Premium removes every limit.'
              : 'Community books are free to read. Writers share them through the Libra writer studio.'}
          </p>

          <div className="gs-options">
            {book.kind === 'sample' && <div className="gs-option">
              <p className="gs-option-label">Access: <span>{access === 'free' ? 'First half free' : access === 'time' ? 'Reading time' : 'Premium'}</span></p>
              <div className="gs-chips">
                <button type="button" className="gs-chip" aria-pressed={access === 'free'} onClick={() => chooseAccess('free')}>First half free</button>
                <button type="button" className="gs-chip" aria-pressed={access === 'time'} onClick={() => chooseAccess('time')}>Reading time</button>
                <button type="button" className="gs-chip" aria-pressed={access === 'premium'} onClick={() => chooseAccess('premium')}>Premium</button>
              </div>
            </div>}

            {book.kind === 'sample' && access !== 'free' && <div className="gs-option">
              <p className="gs-option-label">{access === 'premium' ? 'Length' : 'Time'}: <span>{plan ? planLength(plan) : '—'}</span></p>
              <div className="gs-chips">
                {plansForAccess.map((item) => (
                  <button key={item.id} type="button" className="gs-chip" aria-pressed={plan?.id === item.id} onClick={() => setPlanId(item.id)}>
                    {planLength(item)} · {formatPrice(Number(item.price_usd), currency)}
                  </button>
                ))}
                {pricing && plansForAccess.length === 0 && <span className="gs-chip is-plain">No plans available yet</span>}
                {!pricing && <span className="gs-chip is-plain">{pricingError ? 'Plans could not be loaded' : 'Loading…'}</span>}
              </div>
            </div>}

            {book.kind === 'sample' && access !== 'free' && currencies.length > 0 && <div className="gs-option">
              <p className="gs-option-label">Currency: <span>{currency?.code}</span></p>
              <div className="gs-chips">
                {currencies.map((item) => (
                  <button key={item.code} type="button" className="gs-chip" aria-pressed={currency?.code === item.code} onClick={() => setCurrencyCode(item.code)}>{item.code}</button>
                ))}
              </div>
            </div>}

            {book.kind === 'community' && <div className="gs-option">
              <p className="gs-option-label">Format: <span>{format === 'online' ? 'Read online' : `Download ${formatLabel(book.mimeType)}`}</span></p>
              <div className="gs-chips">
                <button type="button" className="gs-chip" aria-pressed={format === 'online'} onClick={() => setFormat('online')}>Read online</button>
                <button type="button" className="gs-chip" aria-pressed={format === 'download'} onClick={() => setFormat('download')}>Download {formatLabel(book.mimeType)}</button>
              </div>
            </div>}

            <div className="gs-option">
              <p className="gs-option-label">Language: <span>{book.kind === 'community' ? LANGUAGE_NAMES[book.language] ?? book.language.toUpperCase() : 'English'}</span></p>
              <div className="gs-chips">
                <span className="gs-chip is-selected is-info">{book.kind === 'community' ? LANGUAGE_NAMES[book.language] ?? book.language.toUpperCase() : 'English'}</span>
                <span className="gs-chip is-plain">More languages soon</span>
              </div>
            </div>

            {book.kind === 'sample' && access !== 'free' && <div className="gs-option">
              <label className="gs-option-label" htmlFor="coupon">Coupon: <span>optional</span></label>
              <div className="gs-chips">
                <input id="coupon" className="gs-chip" style={{ width: 180, textAlign: 'left', cursor: 'text' }} value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="CODE" autoComplete="off" />
              </div>
            </div>}
          </div>

          <div className="gs-buy">
            {book.kind === 'community'
              ? format === 'online'
                ? <Link className="gs-cta" href={readerHref}>Read now</Link>
                : <a className="gs-cta" href={fileUrl} download>Download {formatLabel(book.mimeType)}</a>
              : access === 'free'
                ? <Link className="gs-cta" href={readerHref}>Start reading</Link>
                : <button type="button" className="gs-cta" disabled={!plan || !cardAvailable || busy} onClick={() => void checkout()}>
                  {busy ? 'Starting checkout…' : !plan ? 'Choose a plan' : !cardAvailable ? 'Card payments unavailable' : `Buy ${planLength(plan)} · ${formatPrice(Number(plan.price_usd), currency)}`}
                </button>}
          </div>

          {error && <p className="gs-error" role="alert">{error} {/sign in/i.test(error) && <Link href="/login">Log in</Link>}</p>}
          {book.kind === 'sample' && access !== 'free' && <p className="gs-fine">Secure card checkout by Stripe. Time is added to your account as soon as the payment clears.</p>}
        </div>
      </article>
    </main>
  )
}
