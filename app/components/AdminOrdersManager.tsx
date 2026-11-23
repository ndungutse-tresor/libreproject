'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart, GaIcon, Ring, Segmented, StatCard, initials, lastMonths, money, rise } from '../admin/glass/GlassKit'

type OrderStatus = 'paid' | 'pending' | 'failed'
type StatusFilter = 'all' | OrderStatus

type Order = {
  id: string
  name: string
  email: string
  plan: string
  method: string
  amount: string
  currency: string
  status: OrderStatus
  created_at: string
}

type OrdersResult = {
  orders: Order[]
  total: number
  summary: {
    total: number
    paid: number
    pending: number
    failed: number
  }
  monthly: { month: string; usd: number; orders: number }[]
  plans: { label: string; usd: number; orders: number }[]
  page: number
  pageSize: number
}

const usd = money('USD')
const usdCompact = money('USD', true)
const STATUS_TONE = { paid: 'is-green', pending: 'is-amber', failed: 'is-red' } as const

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All orders' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' }
]

export default function AdminOrdersManager() {
  const [result, setResult] = useState<OrdersResult | null>(null)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), status, q: search })
      const response = await fetch(`/api/admin/orders?${params}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to load orders.')
      setResult(data)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load orders.')
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => { void loadOrders() }, [loadOrders])

  // A search typed in the top bar arrives as ?q=
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) { setSearchDraft(q); setSearch(q) }
  }, [])

  const months = useMemo(() => {
    const byMonth = new Map((result?.monthly ?? []).map((row) => [row.month, row]))
    return lastMonths(12).map((month) => ({ ...month, usd: byMonth.get(month.key)?.usd ?? 0, orders: byMonth.get(month.key)?.orders ?? 0 }))
  }, [result?.monthly])
  const [range, setRange] = useState<'6' | '12'>('12')
  const shown = months.slice(-Number(range))
  const paidRevenue = (result?.plans ?? []).reduce((sum, plan) => sum + plan.usd, 0)
  const averageOrder = result && result.summary.paid ? paidRevenue / result.summary.paid : 0
  const decided = result ? result.summary.paid + result.summary.failed : 0

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSearch(searchDraft.trim())
  }

  const pageCount = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1

  return (
    <div className="admin-orders-page">
      <header className="ga-head">
        <div {...rise(0)}>
          <h1>Orders</h1>
          <p>Checkout activity and payment status across Libra</p>
        </div>
        <div {...rise(1, 'ga-head-actions')}>
          <button className="ga-button" type="button" onClick={() => void loadOrders()} disabled={loading}><GaIcon name="refresh" /> {loading ? 'Refreshing…' : 'Refresh'}</button>
          <a className="ga-button is-dark" href="/admin/payments"><GaIcon name="card" /> Platform settings</a>
        </div>
      </header>

      {result && <>
        <div className="ga-grid is-four" aria-label="Order summary">
          <StatCard index={2} icon="dollar" value={paidRevenue} format={usd} label="Paid revenue" sub={`${result.summary.paid} paid ${result.summary.paid === 1 ? 'order' : 'orders'}, in US dollars`} onClick={() => { setStatus('paid'); setPage(1) }} pressed={status === 'paid'} />
          <StatCard index={3} icon="clock" value={result.summary.pending} label="Pending" sub="Waiting for the payment provider" onClick={() => { setStatus('pending'); setPage(1) }} pressed={status === 'pending'} />
          <StatCard index={4} icon="x" value={result.summary.failed} label="Failed" sub="Checkouts that did not complete" onClick={() => { setStatus('failed'); setPage(1) }} pressed={status === 'failed'} />
          <StatCard index={5} icon="trending" value={averageOrder} format={usd} label="Average order" sub={`${result.summary.total} orders in all`} onClick={() => { setStatus('all'); setPage(1) }} pressed={status === 'all'} />
        </div>

        <div className="ga-grid is-hero">
          <section {...rise(6, 'ga-card')}>
            <div className="ga-card-head">
              <div><h2>Revenue by month</h2><p>Paid orders, converted to US dollars</p></div>
              <Segmented<'6' | '12'> label="Revenue period" value={range} onChange={setRange} options={[{ value: '6', label: '6 months' }, { value: '12', label: '12 months' }]} />
            </div>
            <BarChart data={shown.map((month) => ({ label: month.label, value: month.usd, hint: `${month.label} · ${month.orders} paid` }))} format={usdCompact} height={290} empty="Paid orders will chart here month by month." />
          </section>
          <section {...rise(7, 'ga-card')}>
            <div className="ga-card-head"><div><h2>Checkouts that went through</h2><p>Paid against failed, all time</p></div></div>
            <Ring value={decided ? result.summary.paid / decided : 0} label="paid" />
            <div className="ga-minis">
              <div className="ga-mini"><strong>{result.summary.paid}</strong><small>Paid</small></div>
              <div className="ga-mini"><strong>{result.summary.pending}</strong><small>Pending</small></div>
              <div className="ga-mini"><strong>{result.summary.failed}</strong><small>Failed</small></div>
            </div>
            {result.plans.length > 0 && <div className="ga-feed" style={{ marginTop: 16 }}>
              {result.plans.slice(0, 3).map((plan) => (
                <div key={plan.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 5 }}><span>{plan.label}</span><strong>{usdCompact(plan.usd)}</strong></div>
                  <span className="ga-progress"><b style={{ width: `${paidRevenue ? (plan.usd / paidRevenue) * 100 : 0}%` }} /></span>
                </div>
              ))}
            </div>}
          </section>
        </div>
      </>}

      <section className="admin-panel admin-orders-panel" style={{ marginTop: 14 }}>
        <div className="admin-orders-toolbar">
          <div><h2>Transaction history</h2><p>Search by order number, member, email, or plan.</p></div>
          <form className="admin-search-form" onSubmit={submitSearch}>
            <label className="admin-search-input"><span aria-hidden="true">⌕</span><input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Search orders" aria-label="Search order number, member, email, or plan" /></label>
            <button className="admin-save-button" type="submit" disabled={loading}>Search</button>
          </form>
        </div>
        <div className="admin-order-filters" aria-label="Filter orders by payment status">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={status === filter.value ? 'is-selected' : ''}
              aria-pressed={status === filter.value}
              onClick={() => { setStatus(filter.value); setPage(1) }}
            >
              {filter.label}
              {filter.value !== 'all' && result && <span>{result.summary[filter.value]}</span>}
            </button>
          ))}
        </div>
        {error && <p className="admin-inline-error" role="alert">{error}</p>}
        <div className="admin-table-wrap">
          <table className="admin-table admin-orders-table" aria-busy={loading}>
            <thead><tr><th>Order</th><th>Member</th><th>Plan</th><th>Payment method</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {result?.orders.map((order) => (
                <tr key={order.id}>
                  <td><strong>#{order.id}</strong></td>
                  <td><div className="ga-person"><span className="ga-avatar">{initials(order.name)}</span><div><strong>{order.name}</strong><small>{order.email}</small></div></div></td>
                  <td>{order.plan}</td>
                  <td>{order.method}</td>
                  <td><strong>{money(order.currency)(Number(order.amount))}</strong></td>
                  <td><span className={`ga-chip ${STATUS_TONE[order.status]}`}><span className="ga-pip" />{order.status}</span></td>
                  <td>{new Date(order.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                </tr>
              ))}
              {!loading && result?.orders.length === 0 && <tr><td colSpan={7} className="admin-empty-cell">No orders match these filters.</td></tr>}
              {loading && !result && <tr><td colSpan={7} className="admin-empty-cell">Loading transaction history…</td></tr>}
              {error && !result && <tr><td colSpan={7} className="admin-empty-cell">Order data could not be loaded. Use Refresh to try again.</td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="admin-pagination">
          <span>{loading ? 'Refreshing orders…' : result ? `Showing ${result.total === 0 ? 0 : (page - 1) * result.pageSize + 1}–${Math.min(page * result.pageSize, result.total)} of ${result.total} matching orders` : 'Order history unavailable'}</span>
          <div>
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}>Previous</button>
            <span>Page {page} of {pageCount}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount || loading}>Next</button>
          </div>
        </footer>
      </section>
      <p className="admin-orders-note"><span aria-hidden="true">ⓘ</span> Order records are read-only here. Payment status and access are updated by the verified payment webhook.</p>
    </div>
  )
}
