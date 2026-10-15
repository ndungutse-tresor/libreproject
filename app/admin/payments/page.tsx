'use client'

import { useEffect, useState } from 'react'

const SECTIONS = [
  { table: 'payment_methods', title: 'Payment methods', pk: 'id', show: ['label', 'key', 'provider'], fields: [['key', 'text'], ['label', 'text'], ['provider', 'text']] },
  { table: 'plans', title: 'Plans & reading-time packs', pk: 'id', show: ['name', 'kind', 'minutes', 'duration_days', 'price_usd'], fields: [['name', 'text'], ['kind', 'text'], ['minutes', 'number'], ['duration_days', 'number'], ['price_usd', 'number']] },
  { table: 'coupons', title: 'Coupons', pk: 'code', show: ['code', 'percent_off', 'max_uses', 'used'], fields: [['code', 'text'], ['percent_off', 'number'], ['max_uses', 'number']] },
  { table: 'currencies', title: 'Currencies', pk: 'code', show: ['code', 'symbol', 'rate_to_usd'], fields: [['code', 'text'], ['symbol', 'text'], ['rate_to_usd', 'number']] }
] as const

type SectionConfig = (typeof SECTIONS)[number]

function Section({ config }: { config: SectionConfig }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  async function load() {
    const response = await fetch(`/api/admin/payments?table=${config.table}`)
    const data = await response.json()
    if (!response.ok) {
      setError(data.error ?? 'Unable to load settings.')
      return
    }
    setRows(data.rows)
    setError('')
  }

  useEffect(() => { void load() }, [config.table])

  async function mutate(method: 'PATCH' | 'DELETE', row: Record<string, unknown>) {
    const primaryKey = config.pk
    const response = await fetch('/api/admin/payments', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: config.table,
        primaryKey,
        primaryValue: String(row[primaryKey]),
        ...(method === 'PATCH' ? { enabled: !row.enabled } : {})
      })
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error ?? 'Unable to update setting.')
      return
    }
    await load()
  }

  async function add() {
    const values = Object.fromEntries(config.fields.map(([name, type]) => {
      const value = fields[name]
      return [name, type === 'number' && value !== undefined && value !== '' ? Number(value) : value]
    }).filter(([, value]) => value !== undefined && value !== ''))
    const response = await fetch('/api/admin/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: config.table, values })
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error ?? 'Unable to add setting.')
      return
    }
    setFields({})
    await load()
  }

  return (
    <section style={{ marginBottom: 32 }}>
      <h2>{config.title}</h2>
      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left' }}>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row[config.pk])}>
                {config.show.map((key) => <td key={key} style={{ padding: 8 }}>{String(row[key] ?? '')}</td>)}
                <td style={{ padding: 8 }}>
                  <button onClick={() => void mutate('PATCH', row)}>{row.enabled ? 'Enabled' : 'Disabled'}</button>
                </td>
                <td style={{ padding: 8 }}><button onClick={() => void mutate('DELETE', row)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        {config.fields.map(([key, type]) => (
          <input
            key={key}
            type={type}
            placeholder={key}
            value={fields[key] ?? ''}
            onChange={(event) => setFields({ ...fields, [key]: event.target.value })}
          />
        ))}
        <button onClick={() => void add()}>+ Add</button>
      </div>
    </section>
  )
}

export default function PaymentsAdmin() {
  const [state, setState] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading')

  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Unable to verify account.')
        if (!data.user) {
          setState('denied')
          return
        }
        const allowed = data.user.role === 'super' || (data.user.role === 'admin' && data.user.perms?.includes('payments'))
        setState(allowed ? 'ready' : 'denied')
      })
      .catch(() => setState('error'))
  }, [])

  if (state !== 'ready') {
    return (
      <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <h1>Payments admin</h1>
        <p>{state === 'loading' ? 'Checking access…' : state === 'error' ? 'Could not verify your account. Try again later.' : 'Sign in as an administrator with payment permissions to continue.'}</p>
      </main>
    )
  }

  return <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>{SECTIONS.map((config) => <Section key={config.table} config={config} />)}</main>
}
