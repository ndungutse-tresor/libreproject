'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'

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
  page: number
  pageSize: number
}

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

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSearch(searchDraft.trim())
  }

  const pageCount = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1

  return (
    <div className="admin-orders-page">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">PAYMENTS &amp; ACTIVITY</p>
          <h1>Orders</h1>
          <p>Review checkout activity and track payment status across Libra.</p>
        </div>
        <button className="admin-secondary-button" type="button" onClick={() => void loadOrders()} disabled={loading}>
          <span aria-hidden="true">↻</span> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </section>

      {result && <section className="admin-order-stats" aria-label="Order summary">
        <article className="admin-order-stat">
          <span className="admin-order-stat-icon" aria-hidden="true">▤</span>
          <div><span>All orders</span><strong>{result.summary.total.toLocaleString()}</strong></div>
        </article>
        <article className="admin-order-stat">
          <span className="admin-order-stat-icon is-paid" aria-hidden="true">✓</span>
          <div><span>Paid</span><strong>{result.summary.paid.toLocaleString()}</strong></div>
        </article>
        <article className="admin-order-stat">
          <span className="admin-order-stat-icon is-pending" aria-hidden="true">◷</span>
          <div><span>Pending</span><strong>{result.summary.pending.toLocaleString()}</strong></div>
        </article>
        <article className="admin-order-stat">
          <span className="admin-order-stat-icon is-failed" aria-hidden="true">×</span>
          <div><span>Failed</span><strong>{result.summary.failed.toLocaleString()}</strong></div>
        </article>
      </section>}

      <section className="admin-panel admin-orders-panel">
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
                  <td><strong>{order.name}</strong><span className="admin-table-sub">{order.email}</span></td>
                  <td>{order.plan}</td>
                  <td>{order.method}</td>
                  <td><strong>{order.currency} {Number(order.amount).toFixed(2)}</strong></td>
                  <td><span className={`admin-order-status is-${order.status}`}><span aria-hidden="true" />{order.status}</span></td>
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
