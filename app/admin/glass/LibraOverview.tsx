'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { BarChart, Change, Donut, GaIcon, Greeting, Segmented, StatCard, Today, initials, lastMonths, money, rise } from './GlassKit'

export type OverviewData = {
  name: string
  monthly: { month: string; usd: number; orders: number }[]
  plans: { label: string; usd: number; orders: number }[]
  stats: {
    members: number
    membersThisMonth: number
    membersLastMonth: number
    pendingSubmissions: number
    pendingWriters: number
    writers: number
    premium: number
    paidTotal: number
    pendingOrders: number
    books: number
    writerBooks: number
    approvedWork: number
    audit30: number
  }
  recentOrders: { id: string; name: string; email: string; plan: string; amount: number; currency: string; status: 'paid' | 'pending' | 'failed'; created_at: string }[]
  recentMembers: { id: string; name: string; email: string; role: string; account_type: string; writer_status: string; created_at: string }[]
  activity: { id: string; actor_name: string; summary: string; entity_type: string; created_at: string }[]
}

type Range = '3' | '6' | '12'

const usd = money('USD')
const usdCompact = money('USD', true)
const STATUS_TONE = { paid: 'is-green', pending: 'is-amber', failed: 'is-red' } as const
const ENTITY_ICON: Record<string, string> = { profile: 'users', submission: 'review', payment_setting: 'card' }

function when(value: string) {
  const date = new Date(value)
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (days <= 0) return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function LibraOverview({ data }: { data: OverviewData }) {
  const [range, setRange] = useState<Range>('6')
  const { stats } = data

  // Twelve calendar months, so empty months still show as gaps.
  const months = useMemo(() => {
    const byMonth = new Map(data.monthly.map((row) => [row.month, row]))
    return lastMonths(12).map((month) => ({ ...month, usd: byMonth.get(month.key)?.usd ?? 0, orders: byMonth.get(month.key)?.orders ?? 0 }))
  }, [data.monthly])
  const shown = months.slice(-Number(range))
  const rangeTotal = shown.reduce((sum, month) => sum + month.usd, 0)
  const rangeOrders = shown.reduce((sum, month) => sum + month.orders, 0)
  const thisMonth = months[months.length - 1]
  const lastMonth = months[months.length - 2]
  const planTotal = data.plans.reduce((sum, plan) => sum + plan.usd, 0)
  const attention = stats.pendingSubmissions + stats.pendingWriters + stats.pendingOrders

  return (
    <div>
      <header className="ga-head">
        <div {...rise(0)}>
          <h1><Greeting name={data.name} /></h1>
          <p><Today /> · {attention === 0 ? 'Nothing needs your attention' : `${attention} ${attention === 1 ? 'thing needs' : 'things need'} your attention`}</p>
        </div>
        <div {...rise(1, 'ga-head-actions')}>
          <Link className="ga-button" href="/admin/history"><GaIcon name="history" /> Admin history</Link>
          <Link className="ga-button is-dark" href="/admin/content"><GaIcon name="review" /> Review submissions</Link>
        </div>
      </header>

      <div className="ga-grid is-hero">
        <section {...rise(2, 'ga-card')}>
          <div className="ga-card-head">
            <div>
              <h2>Revenue</h2>
              <p>{usd(rangeTotal)} from {rangeOrders} paid {rangeOrders === 1 ? 'order' : 'orders'} in the last {range} months</p>
            </div>
            <div className="ga-card-tools">
              <Segmented<Range> label="Revenue period" value={range} onChange={setRange} options={[{ value: '3', label: '3 months' }, { value: '6', label: '6 months' }, { value: '12', label: '12 months' }]} />
              <Link className="ga-button is-dark is-small" href="/admin/orders"><GaIcon name="receipt" /> View orders</Link>
            </div>
          </div>
          <BarChart
            data={shown.map((month) => ({ label: month.label, value: month.usd, hint: `${month.label} · ${month.orders} paid ${month.orders === 1 ? 'order' : 'orders'}` }))}
            format={usdCompact}
            empty="Paid orders will chart here month by month."
          />
        </section>

        <section {...rise(3, 'ga-card')}>
          <div className="ga-card-head">
            <div><h2>Sales by plan</h2><p>Paid orders, last 12 months</p></div>
          </div>
          {data.plans.length ? (
            <Donut
              data={data.plans.map((plan) => ({ label: plan.label, value: plan.usd }))}
              center={usdCompact(planTotal)}
              centerLabel={`${data.plans.reduce((sum, plan) => sum + plan.orders, 0)} orders`}
              format={usdCompact}
            />
          ) : <div className="ga-empty"><GaIcon name="coins" size={22} /><span>No paid orders in the last year yet.</span></div>}
        </section>
      </div>

      <div className="ga-grid is-four">
        <StatCard index={4} icon="users" value={stats.members} label="Members" sub={`${stats.membersThisMonth} joined this month`} badge={<Change now={stats.membersThisMonth} before={stats.membersLastMonth} />} />
        <StatCard index={5} icon="review" value={stats.pendingSubmissions} label="Waiting for review" sub="Books, memes and quotes" />
        <StatCard index={6} icon="userPlus" value={stats.pendingWriters} label="Writers to approve" sub={`${stats.writers} approved writers`} />
        <StatCard index={7} icon="dollar" value={thisMonth.usd} format={usd} label="Revenue this month" sub={`${usd(lastMonth.usd)} last month`} badge={<Change now={thisMonth.usd} before={lastMonth.usd} />} />
        <StatCard index={8} icon="receipt" value={thisMonth.orders} label="Paid orders this month" sub={`${stats.paidTotal} all time · ${stats.pendingOrders} pending`} />
        <StatCard index={9} icon="star" value={stats.premium} label="Premium readers" sub={stats.members ? `${Math.round((stats.premium / stats.members) * 100)}% of members` : 'No members yet'} />
        <StatCard index={10} icon="book" value={stats.books} label="Books in the library" sub={`${stats.writerBooks} uploaded · ${stats.approvedWork} approved works`} />
        <StatCard index={11} icon="history" value={stats.audit30} label="Admin actions" sub="In the last 30 days" />
      </div>

      <div className="ga-grid is-hero">
        <section {...rise(12, 'ga-card')}>
          <div className="ga-card-head">
            <div><h2>Recent orders</h2><p>The latest checkouts across Libra</p></div>
            <Link className="ga-button is-small" href="/admin/orders">All orders <GaIcon name="up" /></Link>
          </div>
          {data.recentOrders.length ? (
            <div className="ga-table-wrap">
              <table className="ga-table">
                <thead><tr><th>Member</th><th>Plan</th><th>Amount</th><th>Status</th><th>When</th></tr></thead>
                <tbody>
                  {data.recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td><div className="ga-person"><span className="ga-avatar">{initials(order.name)}</span><div><strong>{order.name}</strong><small>{order.email}</small></div></div></td>
                      <td>{order.plan}</td>
                      <td><strong>{money(order.currency)(order.amount)}</strong></td>
                      <td><span className={`ga-chip ${STATUS_TONE[order.status]}`}><span className="ga-pip" />{order.status}</span></td>
                      <td>{when(order.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="ga-empty"><GaIcon name="receipt" size={22} /><span>Orders will appear here after the first checkout.</span></div>}
        </section>

        <section {...rise(13, 'ga-card')}>
          <div className="ga-card-head">
            <div><h2>Latest activity</h2><p>What administrators changed</p></div>
            <Link className="ga-button is-small" href="/admin/history">History</Link>
          </div>
          {data.activity.length ? (
            <div className="ga-feed">
              {data.activity.map((event) => (
                <div className="ga-feed-item" key={event.id}>
                  <span className="ga-stat-icon"><GaIcon name={ENTITY_ICON[event.entity_type] ?? 'activity'} /></span>
                  <div><p>{event.summary}</p><small>{event.actor_name} · {when(event.created_at)}</small></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ga-feed">
              {data.recentMembers.map((member) => (
                <div className="ga-feed-item" key={member.id}>
                  <span className="ga-avatar" style={{ width: 30, height: 30, fontSize: 10.5 }}>{initials(member.name)}</span>
                  <div><p><strong>{member.name}</strong> joined as a {member.account_type}</p><small>{when(member.created_at)}</small></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section {...rise(14, 'ga-card')}>
        <div className="ga-card-head">
          <div><h2>New members</h2><p>The latest people to join</p></div>
          <Link className="ga-button is-small" href="/admin/users">All members <GaIcon name="up" /></Link>
        </div>
        <div className="ga-grid is-three">
          {data.recentMembers.map((member) => (
            <Link className="ga-person is-link" key={member.id} href={`/admin/users?memberId=${encodeURIComponent(member.id)}`}>
              <span className="ga-avatar">{initials(member.name)}</span>
              <div>
                <strong>{member.name}</strong>
                <small>{member.role === 'super' ? 'Super admin' : member.role === 'admin' ? 'Administrator' : member.account_type === 'writer' ? (member.writer_status === 'pending' ? 'Writer · awaiting approval' : 'Writer') : 'Reader'} · {when(member.created_at)}</small>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
