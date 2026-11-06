'use client'

import { FormEvent, Fragment, useEffect, useState } from 'react'
import Link from 'next/link'

type SettingField = {
  name: string
  label: string
  type: 'text' | 'number' | 'select'
  required?: boolean
  min?: number
  max?: number
  step?: string
  options?: { value: string; label: string }[]
  placeholder?: string
}

type SettingColumn = {
  name: string
  label: string
}

type SectionConfig = {
  table: 'payment_methods' | 'plans' | 'coupons' | 'currencies'
  title: string
  description: string
  icon: string
  primaryKey: string
  columns: SettingColumn[]
  fields: SettingField[]
}

type SettingRow = Record<string, unknown> & { enabled?: boolean }

const SECTIONS: SectionConfig[] = [
  {
    table: 'payment_methods',
    title: 'Payment methods',
    description: 'Choose which checkout providers customers can use. Stripe card checkout is currently integrated; other providers need a checkout integration before you enable them.',
    icon: '↗',
    primaryKey: 'id',
    columns: [
      { name: 'label', label: 'Method' },
      { name: 'key', label: 'Key' },
      { name: 'provider', label: 'Provider' }
    ],
    fields: [
      { name: 'key', label: 'Method key', type: 'text', required: true, placeholder: 'e.g. card' },
      { name: 'label', label: 'Display name', type: 'text', required: true, placeholder: 'e.g. Credit / debit card' },
      { name: 'provider', label: 'Provider', type: 'text', required: true, placeholder: 'e.g. stripe' }
    ]
  },
  {
    table: 'plans',
    title: 'Plans & reading-time packs',
    description: 'Manage the reading time and Premium plans shown to readers.',
    icon: '▤',
    primaryKey: 'id',
    columns: [
      { name: 'name', label: 'Plan' },
      { name: 'kind', label: 'Type' },
      { name: 'minutes', label: 'Minutes' },
      { name: 'duration_days', label: 'Premium days' },
      { name: 'price_usd', label: 'Price (USD)' }
    ],
    fields: [
      { name: 'name', label: 'Plan name', type: 'text', required: true, placeholder: 'e.g. 2 hours' },
      { name: 'kind', label: 'Plan type', type: 'select', required: true, options: [{ value: 'time', label: 'Reading time' }, { value: 'premium', label: 'Premium access' }] },
      { name: 'minutes', label: 'Reading minutes', type: 'number', min: 1, placeholder: 'Optional' },
      { name: 'duration_days', label: 'Premium duration (days)', type: 'number', min: 1, placeholder: 'Optional' },
      { name: 'price_usd', label: 'Price in USD', type: 'number', required: true, min: 0, step: '0.01', placeholder: '0.00' }
    ]
  },
  {
    table: 'coupons',
    title: 'Coupons',
    description: 'Create discount codes and keep an eye on how they are used.',
    icon: '％',
    primaryKey: 'code',
    columns: [
      { name: 'code', label: 'Code' },
      { name: 'percent_off', label: 'Discount' },
      { name: 'max_uses', label: 'Use limit' },
      { name: 'used', label: 'Used' }
    ],
    fields: [
      { name: 'code', label: 'Coupon code', type: 'text', required: true, placeholder: 'e.g. WELCOME10' },
      { name: 'percent_off', label: 'Discount (%)', type: 'number', required: true, min: 1, max: 100, placeholder: '10' },
      { name: 'max_uses', label: 'Maximum uses', type: 'number', min: 1, placeholder: 'No limit' }
    ]
  },
  {
    table: 'currencies',
    title: 'Currencies',
    description: 'Set the currencies and exchange rates used by the checkout.',
    icon: '¤',
    primaryKey: 'code',
    columns: [
      { name: 'code', label: 'Code' },
      { name: 'symbol', label: 'Symbol' },
      { name: 'rate_to_usd', label: 'Rate to USD' }
    ],
    fields: [
      { name: 'code', label: 'Currency code', type: 'text', required: true, placeholder: 'e.g. USD' },
      { name: 'symbol', label: 'Display symbol', type: 'text', required: true, placeholder: 'e.g. $' },
      { name: 'rate_to_usd', label: 'Rate to USD', type: 'number', required: true, min: 0.000001, step: '0.000001', placeholder: '1' }
    ]
  }
]

function displayValue(value: unknown, column: SettingColumn) {
  if (value === null || value === undefined || value === '') return '—'
  if (column.name === 'percent_off') return `${String(value)}%`
  if (column.name === 'price_usd') return `$${Number(value).toFixed(2)}`
  if (column.name === 'currencies' && Array.isArray(value)) return value.join(', ')
  return String(value)
}

function Section({ config }: { config: SectionConfig }) {
  const [rows, setRows] = useState<SettingRow[]>([])
  const [fields, setFields] = useState<Record<string, string>>({})
  const [editingKey, setEditingKey] = useState('')
  const [editFields, setEditFields] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [busyKey, setBusyKey] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/payments?table=${config.table}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to load settings.')
      setRows(data.rows)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load settings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [config.table])

  function beginEdit(row: SettingRow) {
    const key = String(row[config.primaryKey])
    setEditingKey(key)
    setEditFields(Object.fromEntries(
      config.fields
        .filter((field) => field.name !== config.primaryKey)
        .map((field) => [field.name, row[field.name] === null || row[field.name] === undefined ? '' : String(row[field.name])])
    ))
    setError('')
    setNotice('')
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>, row: SettingRow) {
    event.preventDefault()
    setEditSaving(true)
    setError('')
    setNotice('')

    const values: Record<string, string | number | null> = {}
    for (const field of config.fields.filter((item) => item.name !== config.primaryKey)) {
      const value = editFields[field.name]?.trim() ?? ''
      const required = field.required ||
        (config.table === 'plans' && field.name === 'minutes' && editFields.kind === 'time') ||
        (config.table === 'plans' && field.name === 'duration_days' && editFields.kind === 'premium')
      if (value === '' && required) {
        setError(`${field.label} is required.`)
        setEditSaving(false)
        return
      }
      values[field.name] = value === '' ? null : field.type === 'number' ? Number(value) : value
    }
    if (config.table === 'plans') {
      if (editFields.kind === 'time') values.duration_days = null
      if (editFields.kind === 'premium') values.minutes = null
    }
    if (typeof values.key === 'string') values.key = values.key.toLowerCase()

    try {
      const response = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: config.table,
          primaryKey: config.primaryKey,
          primaryValue: String(row[config.primaryKey]),
          values
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to save changes.')
      setRows((current) => current.map((item) => String(item[config.primaryKey]) === String(row[config.primaryKey]) ? data.row : item))
      setEditingKey('')
      setEditFields({})
      setNotice(`${String(data.row.label ?? data.row.name ?? data.row.code ?? data.row.key)} was updated.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save changes.')
    } finally {
      setEditSaving(false)
    }
  }

  async function mutate(method: 'PATCH' | 'DELETE', row: SettingRow) {
    const primaryValue = String(row[config.primaryKey])
    const displayName = String(row.label ?? row.name ?? row.code ?? row.key ?? primaryValue)
    if (method === 'DELETE' && !window.confirm(`Remove "${displayName}"? This cannot be undone.`)) return

    setBusyKey(primaryValue)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/payments', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: config.table,
          primaryKey: config.primaryKey,
          primaryValue,
          ...(method === 'PATCH' ? { enabled: !row.enabled } : {})
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to update setting.')
      if (method === 'DELETE') {
        setRows((current) => current.filter((item) => String(item[config.primaryKey]) !== primaryValue))
        setNotice(`${displayName} was removed.`)
      } else {
        setRows((current) => current.map((item) => String(item[config.primaryKey]) === primaryValue ? data.row : item))
        setNotice(`${displayName} is now ${data.row.enabled ? 'enabled' : 'disabled'}.`)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update setting.')
    } finally {
      setBusyKey('')
    }
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    const values: Record<string, string | number | boolean> = {}
    for (const field of config.fields) {
      const value = fields[field.name]?.trim()
      if (value === undefined || value === '') continue
      values[field.name] = field.type === 'number' ? Number(value) : value
    }
    if (typeof values.code === 'string') values.code = values.code.toUpperCase()
    if (typeof values.key === 'string') values.key = values.key.toLowerCase()
    if (config.table === 'plans') {
      if (values.kind === 'time') delete values.duration_days
      if (values.kind === 'premium') delete values.minutes
    }
    values.enabled = false

    try {
      const response = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: config.table, values })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to add setting.')
      setRows((current) => [...current, data.row].sort((a, b) => String(a[config.primaryKey]).localeCompare(String(b[config.primaryKey]), undefined, { numeric: true })))
      setFields({})
      setNotice(`${String(data.row.label ?? data.row.name ?? data.row.code ?? data.row.key)} was added.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to add setting.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-settings-card" aria-labelledby={`settings-${config.table}`}>
      <header className="admin-settings-card-header">
        <span className="admin-settings-icon" aria-hidden="true">{config.icon}</span>
        <div>
          <div className="admin-settings-card-title">
            <h2 id={`settings-${config.table}`}>{config.title}</h2>
            <span className="admin-settings-count">{rows.length}</span>
          </div>
          <p>{config.description}</p>
        </div>
        <button className="admin-settings-refresh" type="button" onClick={() => void load()} disabled={loading} aria-label={`Refresh ${config.title}`}>
          <span aria-hidden="true">↻</span>
        </button>
      </header>

      {error && <p className="admin-inline-error" role="alert">{error}</p>}
      {notice && <p className="admin-inline-success" role="status">{notice}</p>}

      <div className="admin-settings-table-wrap">
        <table className="admin-settings-table" aria-busy={loading}>
          <thead>
            <tr>
              {config.columns.map((column) => <th key={column.name}>{column.label}</th>)}
              <th>Status</th>
              <th><span className="admin-sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const primaryValue = String(row[config.primaryKey])
              const rowBusy = busyKey === primaryValue
              return (
                <Fragment key={primaryValue}>
                <tr key={primaryValue}>
                  {config.columns.map((column) => <td key={column.name}>{displayValue(row[column.name], column)}</td>)}
                  <td><span className={`admin-status-pill ${row.enabled ? 'is-enabled' : 'is-disabled'}`}><span aria-hidden="true" />{row.enabled ? 'Enabled' : 'Disabled'}</span></td>
                  <td className="admin-settings-actions">
                    <button className="admin-settings-toggle" type="button" onClick={() => editingKey === primaryValue ? setEditingKey('') : beginEdit(row)} disabled={rowBusy}>{editingKey === primaryValue ? 'Cancel edit' : 'Edit'}</button>
                    <button className="admin-settings-toggle" type="button" onClick={() => void mutate('PATCH', row)} disabled={rowBusy} aria-label={`${row.enabled ? 'Disable' : 'Enable'} ${String(row.label ?? row.name ?? row.code ?? row.key ?? primaryValue)}`}>
                      {rowBusy ? 'Updating…' : row.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button className="admin-settings-delete" type="button" onClick={() => void mutate('DELETE', row)} disabled={rowBusy} aria-label={`Remove ${String(row.label ?? row.name ?? row.code ?? row.key ?? primaryValue)}`}>Remove</button>
                  </td>
                </tr>
                {editingKey === primaryValue && <tr key={`${primaryValue}-edit`} className="admin-settings-edit-row">
                  <td colSpan={config.columns.length + 2}>
                    <form className="admin-settings-edit-form" onSubmit={(event) => void saveEdit(event, row)}>
                      <div className="admin-settings-fields">
                        {config.fields.filter((field) => field.name !== config.primaryKey && !(config.table === 'plans' && (
                          (field.name === 'minutes' && editFields.kind === 'premium') ||
                          (field.name === 'duration_days' && editFields.kind === 'time')
                        ))).map((field) => (
                          <label key={field.name} className="admin-settings-field">
                            <span>{field.label}{(field.required || (config.table === 'plans' && field.name === 'minutes' && editFields.kind === 'time') || (config.table === 'plans' && field.name === 'duration_days' && editFields.kind === 'premium')) && <span className="admin-required"> *</span>}</span>
                            {field.type === 'select'
                              ? <select required={field.required} value={editFields[field.name] ?? ''} onChange={(event) => setEditFields((current) => ({ ...current, [field.name]: event.target.value }))}>
                                <option value="">Choose a type</option>
                                {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                              </select>
                              : <input
                                type={field.type}
                                required={field.required || (config.table === 'plans' && field.name === 'minutes' && editFields.kind === 'time') || (config.table === 'plans' && field.name === 'duration_days' && editFields.kind === 'premium')}
                                min={field.type === 'number' ? field.min : undefined}
                                max={field.type === 'number' ? field.max : undefined}
                                step={field.type === 'number' ? field.step : undefined}
                                placeholder={field.placeholder}
                                value={editFields[field.name] ?? ''}
                                onChange={(event) => setEditFields((current) => ({ ...current, [field.name]: event.target.value }))}
                              />}
                          </label>
                        ))}
                      </div>
                      <div className="admin-settings-edit-actions">
                        <button className="admin-save-button" type="submit" disabled={editSaving}>{editSaving ? 'Saving…' : 'Save changes'}</button>
                        <button className="admin-secondary-button" type="button" onClick={() => setEditingKey('')} disabled={editSaving}>Cancel</button>
                      </div>
                    </form>
                  </td>
                </tr>}
                </Fragment>
              )
            })}
            {!loading && rows.length === 0 && <tr><td className="admin-settings-empty" colSpan={config.columns.length + 2}>No settings yet. Add one below to get started.</td></tr>}
            {loading && rows.length === 0 && <tr><td className="admin-settings-empty" colSpan={config.columns.length + 2}>Loading settings…</td></tr>}
          </tbody>
        </table>
      </div>

      <form className="admin-settings-form" onSubmit={(event) => void add(event)}>
        <div className="admin-settings-form-heading">
          <div><h3>Add to {config.title.toLowerCase()}</h3><p>New entries are disabled until you enable them.</p></div>
          <button className="admin-save-button" type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add entry'} <span aria-hidden="true">＋</span></button>
        </div>
        <div className="admin-settings-fields">
          {config.fields.filter((field) => !(config.table === 'plans' && (
            (field.name === 'minutes' && fields.kind === 'premium') ||
            (field.name === 'duration_days' && fields.kind === 'time')
          ))).map((field) => (
            <label key={field.name} className="admin-settings-field">
              <span>{field.label}{(field.required || (field.name === 'minutes' && fields.kind === 'time') || (field.name === 'duration_days' && fields.kind === 'premium')) && <span className="admin-required"> *</span>}</span>
              {field.type === 'select'
                ? <select required={field.required} value={fields[field.name] ?? ''} onChange={(event) => setFields((current) => ({ ...current, [field.name]: event.target.value }))}>
                  <option value="">Choose a type</option>
                  {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                : <input
                  type={field.type}
                  required={field.required || (field.name === 'minutes' && fields.kind === 'time') || (field.name === 'duration_days' && fields.kind === 'premium')}
                  min={field.type === 'number' ? field.min : undefined}
                  max={field.type === 'number' ? field.max : undefined}
                  step={field.type === 'number' ? field.step : undefined}
                  placeholder={field.placeholder}
                  value={fields[field.name] ?? ''}
                  onChange={(event) => setFields((current) => ({ ...current, [field.name]: event.target.value }))}
                />}
            </label>
          ))}
        </div>
      </form>
    </section>
  )
}

export default function PaymentsAdmin() {
  const [state, setState] = useState<'loading' | 'ready' | 'signed-out' | 'denied' | 'error'>('loading')

  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Unable to verify account.')
        if (!data.user) {
          setState('signed-out')
          return
        }
        const allowed = data.user.role === 'super' || (data.user.role === 'admin' && data.user.perms?.includes('payments'))
        setState(allowed ? 'ready' : 'denied')
      })
      .catch(() => setState('error'))
  }, [])

  if (state !== 'ready') {
    const message = state === 'loading'
      ? 'Checking your administrator access…'
      : state === 'error'
        ? 'We could not verify your account. Refresh the page to try again.'
        : state === 'signed-out'
          ? 'Sign in with an administrator account to manage platform settings.'
          : 'Your account does not have permission to manage platform settings.'

    return (
      <section className="admin-settings-page">
        <header className="admin-page-heading">
          <div><p className="admin-eyebrow">COMMERCE &amp; CONFIGURATION</p><h1>Platform settings</h1><p>Manage checkout options, plans, discounts, and currencies.</p></div>
        </header>
        <div className="admin-access-card" role={state === 'error' ? 'alert' : undefined}>
          <span className="admin-settings-icon" aria-hidden="true">{state === 'loading' ? '◷' : '◇'}</span>
          <div><h2>{state === 'loading' ? 'Verifying access' : state === 'denied' ? 'Access restricted' : state === 'signed-out' ? 'Sign in required' : 'Could not verify access'}</h2><p>{message}</p>
            {state === 'signed-out' && <Link className="admin-primary-link" href="/login?next=%2Fadmin%2Fpayments">Continue to sign in <span aria-hidden="true">→</span></Link>}
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="admin-settings-page">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">COMMERCE &amp; CONFIGURATION</p>
          <h1>Platform settings</h1>
          <p>Manage the plans and checkout options that power the Libra reading experience.</p>
        </div>
        <span className="admin-settings-secure"><span aria-hidden="true">✓</span> Admin controls</span>
      </section>
      <section className="admin-settings-intro">
        <span className="admin-settings-intro-icon" aria-hidden="true">✦</span>
        <div><strong>Your platform, your way.</strong><p>Keep payment methods and offers up to date. New entries start disabled, so you can review them before making them available.</p></div>
      </section>
      <div className="admin-settings-sections">
        {SECTIONS.map((config) => <Section key={config.table} config={config} />)}
      </div>
    </div>
  )
}
