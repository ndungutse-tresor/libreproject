'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type AuditEvent = {
  id: string
  actor_name: string
  actor_email: string
  action: string
  entity_type: string
  entity_id: string
  target_name: string
  summary: string
  before_state: Record<string, unknown> | null
  after_state: Record<string, unknown> | null
  can_restore: boolean
  restored_at: string | null
  related_event_id: string | null
  created_at: string
}

export default function AdminHistoryManager() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('all')
  const [actorFilter, setActorFilter] = useState('all')

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/audit')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to load admin history.')
      setEvents(data.events)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load admin history.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadHistory() }, [loadHistory])

  const visibleEvents = events.filter((event) => {
    const matchesEntity = entityFilter === 'all' || event.entity_type === entityFilter
    const matchesActor = actorFilter === 'all' || event.actor_email === actorFilter
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || [
      event.actor_name,
      event.actor_email,
      event.target_name,
      event.summary,
      event.action
    ].some((value) => value.toLowerCase().includes(query))
    return matchesEntity && matchesActor && matchesSearch
  })
  const actors = Array.from(new Map(events.map((event) => [
    event.actor_email,
    { email: event.actor_email, name: event.actor_name }
  ])).values())

  async function restoreEvent(event: AuditEvent) {
    if (!window.confirm(`Restore the change to ${event.target_name}? This applies the recorded earlier state and is itself added to history.`)) return

    setBusyId(event.id)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditId: event.id })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to restore this change.')
      setNotice('The earlier state was restored. The action is recorded in admin history.')
      await loadHistory()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to restore this change.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="admin-history-page">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">SUPER ADMINISTRATOR ONLY</p>
          <h1>Admin history</h1>
          <p>Review administrator activity, inspect changes, adjust accounts, or restore supported earlier states.</p>
        </div>
        <button className="admin-secondary-button" type="button" onClick={() => void loadHistory()} disabled={loading}>
          <span aria-hidden="true">↻</span> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </section>

      {error && <p className="admin-inline-error" role="alert">{error}</p>}
      {notice && <p className="admin-inline-success" role="status">{notice}</p>}
      <section className="admin-panel admin-history-panel">
        <div className="admin-history-toolbar">
          <label className="admin-search-input">
            <span aria-hidden="true">⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search administrator, target, or action" aria-label="Search admin history" />
          </label>
          <label className="admin-history-filter-label" htmlFor="admin-history-type">Action type</label>
          <select id="admin-history-type" value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)}>
            <option value="all">All activity</option>
            <option value="profile">Member and admin accounts</option>
            <option value="submission">Publishing</option>
            <option value="payment_setting">Platform settings</option>
          </select>
          <label className="admin-history-filter-label" htmlFor="admin-history-admin">Administrator</label>
          <select id="admin-history-admin" value={actorFilter} onChange={(event) => setActorFilter(event.target.value)}>
            <option value="all">All administrators</option>
            {actors.map((actor) => <option value={actor.email} key={actor.email}>{actor.name}</option>)}
          </select>
          <span className="admin-history-count">{visibleEvents.length} of {events.length} actions</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table admin-history-table" aria-busy={loading}>
            <thead><tr><th>Action &amp; details</th><th>Administrator</th><th>Target</th><th>Date</th><th>Manage / restore</th></tr></thead>
            <tbody>
              {visibleEvents.map((event) => (
                <tr key={event.id}>
                  <td>
                    <strong>{event.summary}</strong>
                    <small className="admin-table-sub">{event.action.replaceAll('_', ' ')}</small>
                    <details className="admin-history-details">
                      <summary>View before / after</summary>
                      <div className="admin-history-snapshots">
                        <div><strong>Before</strong><pre>{JSON.stringify(event.before_state, null, 2) ?? 'null'}</pre></div>
                        <div><strong>After</strong><pre>{JSON.stringify(event.after_state, null, 2) ?? 'null'}</pre></div>
                      </div>
                    </details>
                  </td>
                  <td><strong>{event.actor_name}</strong><small className="admin-table-sub">{event.actor_email}</small></td>
                  <td>
                    {event.target_name}
                    {event.entity_type === 'profile' && <small className="admin-table-sub">{event.entity_id}</small>}
                  </td>
                  <td>{new Date(event.created_at).toLocaleString()}</td>
                  <td>
                    <div className="admin-history-actions">
                      {event.entity_type === 'profile' && <Link className="admin-history-manage" href={`/admin/users?memberId=${encodeURIComponent(event.entity_id)}`}>Manage account</Link>}
                      {event.restored_at
                        ? <span className="admin-badge admin-badge-neutral">Restored</span>
                        : event.can_restore
                          ? <button className="admin-history-restore" type="button" onClick={() => void restoreEvent(event)} disabled={busyId === event.id}>{busyId === event.id ? 'Restoring…' : 'Restore'}</button>
                          : <span className="admin-badge admin-badge-neutral">Audit only</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && visibleEvents.length === 0 && <tr><td colSpan={5} className="admin-empty-cell">{events.length ? 'No history entries match your search.' : 'Admin actions will appear here as they are recorded.'}</td></tr>}
              {loading && events.length === 0 && <tr><td colSpan={5} className="admin-empty-cell">Loading admin history…</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="admin-history-note">Use “Manage account” to update an account’s email, role, permissions, or password. Restores are guarded against overwriting newer changes, and each restore is recorded. Passwords are never stored and cannot be restored.</p>
      </section>
    </div>
  )
}
