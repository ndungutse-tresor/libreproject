'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'

type Member = {
  id: string
  name: string
  email: string
  role: 'user' | 'admin' | 'super'
  perms: string[]
  account_type: 'reader' | 'writer'
  writer_status: 'disabled' | 'pending' | 'approved'
  reading_seconds: number
  premium_until: string | null
  created_at: string
}

type MembersResult = {
  users: Member[]
  total: number
  summary: {
    total: number
    premium: number
    administrators: number
    writers: number
    pendingWriters: number
  }
  page: number
  pageSize: number
  canManageRoles: boolean
}

function toDateTimeLocal(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function MemberRow({ member, canManageRoles, onSaved }: { member: Member; canManageRoles: boolean; onSaved: (member: Member) => void }) {
  const [email, setEmail] = useState(member.email)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [readingSeconds, setReadingSeconds] = useState(String(member.reading_seconds))
  const [premiumUntil, setPremiumUntil] = useState(toDateTimeLocal(member.premium_until))
  const [role, setRole] = useState<'user' | 'admin' | 'super'>(member.role)
  const [perms, setPerms] = useState<string[]>(member.perms)
  const [accountType, setAccountType] = useState<'reader' | 'writer'>(member.account_type)
  const [writerStatus, setWriterStatus] = useState<'disabled' | 'pending' | 'approved'>(member.writer_status)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [credentialsBusy, setCredentialsBusy] = useState(false)
  const [credentialsError, setCredentialsError] = useState('')
  const [credentialsSaved, setCredentialsSaved] = useState(false)
  const isProtected = member.role === 'super'

  function togglePermission(permission: string) {
    setPerms((current) => current.includes(permission)
      ? current.filter((item) => item !== permission)
      : [...current, permission])
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSaved(false)
    const seconds = Number(readingSeconds)
    if (!Number.isInteger(seconds) || seconds < 0 || seconds > 1_000_000) {
      setError('Enter reading time between 0 and 1,000,000 seconds.')
      setBusy(false)
      return
    }

    const payload: Record<string, unknown> = {
      userId: member.id,
      readingSeconds: seconds,
      premiumUntil: premiumUntil ? new Date(premiumUntil).toISOString() : null
    }
    if (canManageRoles && !isProtected && role !== member.role) {
      payload.role = role
      payload.perms = role === 'admin' ? perms : []
    } else if (canManageRoles && !isProtected && role === 'admin' && member.role === 'admin' && JSON.stringify([...perms].sort()) !== JSON.stringify([...member.perms].sort())) {
      payload.role = role
      payload.perms = perms
    }
    if (canManageRoles && !isProtected && (accountType !== member.account_type || writerStatus !== member.writer_status)) {
      payload.accountType = accountType
      payload.writerStatus = accountType === 'reader' ? 'disabled' : writerStatus
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error ?? 'Unable to save member changes.')
        return
      }
      onSaved(result.user)
      setSaved(true)
    } catch {
      setError('Unable to reach the server. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function saveCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCredentialsBusy(true)
    setCredentialsError('')
    setCredentialsSaved(false)

    if (newPassword && newPassword !== confirmNewPassword) {
      setCredentialsError('The new passwords do not match.')
      setCredentialsBusy(false)
      return
    }

    const payload: Record<string, string> = { userId: member.id }
    if (member.role === 'admin' && email.trim().toLowerCase() !== member.email.toLowerCase()) {
      payload.email = email
    }
    if (newPassword) payload.newPassword = newPassword
    if (Object.keys(payload).length === 1) {
      setCredentialsError('Change the email or enter a new password first.')
      setCredentialsBusy(false)
      return
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      if (!response.ok) {
        setCredentialsError(result.error ?? 'Unable to update member credentials.')
        return
      }
      onSaved(result.user)
      setEmail(result.user.email)
      setNewPassword('')
      setConfirmNewPassword('')
      setCredentialsSaved(true)
    } catch {
      setCredentialsError('Unable to reach the server. Try again.')
    } finally {
      setCredentialsBusy(false)
    }
  }

  return (
    <tr>
      <td className="admin-member-cell">
        <span className="admin-member-avatar" aria-hidden="true">{member.name.trim().slice(0, 1).toUpperCase()}</span>
        <span><strong>{member.name}</strong><small>{member.email}</small></span>
      </td>
      <td>
        <form id={`member-${member.id}`} className="admin-member-form" onSubmit={(event) => void save(event)}>
          <label className="admin-input-label">Reading time
            <span className="admin-input-suffix">
              <input type="number" min="0" max="1000000" step="1" value={readingSeconds} onChange={(event) => { setReadingSeconds(event.target.value); setSaved(false) }} disabled={isProtected} />
              <span>sec</span>
            </span>
          </label>
          <label className="admin-input-label">Premium access
            <input type="datetime-local" value={premiumUntil} onChange={(event) => { setPremiumUntil(event.target.value); setSaved(false) }} disabled={isProtected} />
          </label>
        </form>
      </td>
      <td>
        {canManageRoles && !isProtected
          ? <div className="admin-role-editor">
            <label className="admin-input-label" htmlFor={`role-${member.id}`}>Account role</label>
            <select id={`role-${member.id}`} value={role} onChange={(event) => { const nextRole = event.target.value as 'user' | 'admin' | 'super'; setRole(nextRole); if (nextRole !== 'admin') setPerms([]); setSaved(false) }}>
              <option value="user">Member</option>
              <option value="admin">Administrator</option>
              {member.role === 'admin' && <option value="super">Super administrator</option>}
            </select>
            {role === 'admin' && <div className="admin-permission-list">
              <span className="admin-input-label">Permissions</span>
              {['users', 'payments', 'content'].map((permission) => <label key={permission}><input type="checkbox" checked={perms.includes(permission)} onChange={() => { togglePermission(permission); setSaved(false) }} /> {permission === 'users' ? 'Members' : permission === 'payments' ? 'Platform settings' : 'Publishing'}</label>)}
            </div>}
          </div>
          : <div className="admin-role-readonly">
            <span className={`admin-badge ${member.role === 'user' ? 'admin-badge-neutral' : 'admin-badge-green'}`}>{member.role === 'super' ? 'Super admin' : member.role === 'admin' ? 'Admin' : 'Member'}</span>
            {isProtected && <small>Protected account</small>}
          </div>}
        {canManageRoles && !isProtected && <form className="admin-member-credentials" onSubmit={(event) => void saveCredentials(event)}>
          {member.role === 'admin' && <label className="admin-input-label">Administrator email
            <input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setCredentialsSaved(false) }} maxLength={254} required />
          </label>}
          <label className="admin-input-label">{member.role === 'admin' ? 'Set new password' : 'Reset password'}
            <input type="password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setCredentialsSaved(false) }} minLength={12} maxLength={72} autoComplete="new-password" placeholder="At least 12 characters" />
          </label>
          {newPassword && <label className="admin-input-label">Confirm new password
            <input type="password" value={confirmNewPassword} onChange={(event) => { setConfirmNewPassword(event.target.value); setCredentialsSaved(false) }} minLength={12} maxLength={72} autoComplete="new-password" required />
          </label>}
          <button className="admin-save-button" type="submit" disabled={credentialsBusy || (!newPassword && (member.role !== 'admin' || email.trim().toLowerCase() === member.email.toLowerCase()))}>
            {credentialsBusy ? 'Saving…' : newPassword ? 'Save credentials' : 'Update email'}
          </button>
          {credentialsSaved && <span className="admin-row-saved" role="status">Credentials updated. Share any new password securely.</span>}
          {credentialsError && <span className="admin-row-error" role="alert">{credentialsError}</span>}
        </form>}
        {canManageRoles && !isProtected && <div className="admin-writer-editor">
          <label className="admin-input-label" htmlFor={`account-type-${member.id}`}>Reader / Writer</label>
          <select
            id={`account-type-${member.id}`}
            value={accountType}
            onChange={(event) => {
              const nextType = event.target.value as 'reader' | 'writer'
              setAccountType(nextType)
              setWriterStatus(nextType === 'reader' ? 'disabled' : member.writer_status === 'disabled' ? 'pending' : writerStatus)
              setSaved(false)
            }}
          >
            <option value="reader">Reader</option>
            <option value="writer">Writer</option>
          </select>
          {accountType === 'writer' && <>
            <label className="admin-input-label" htmlFor={`writer-status-${member.id}`}>Writer access</label>
            <select id={`writer-status-${member.id}`} value={writerStatus} onChange={(event) => { setWriterStatus(event.target.value as 'disabled' | 'pending' | 'approved'); setSaved(false) }}>
              <option value="pending">Awaiting approval</option>
              <option value="approved">Approved to submit</option>
              <option value="disabled">Disabled</option>
            </select>
          </>}
        </div>}
      </td>
      <td>{new Date(member.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
      <td className="admin-save-cell">
        <button className="admin-save-button" type="submit" form={`member-${member.id}`} disabled={busy || isProtected}>{busy ? 'Saving…' : 'Save changes'}</button>
        {saved && <span className="admin-row-saved" role="status">Saved</span>}
        {error && <span className="admin-row-error" role="alert">{error}</span>}
      </td>
    </tr>
  )
}

export default function AdminUsersManager() {
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('')
  const [newAdminPermissions, setNewAdminPermissions] = useState<string[]>([])
  const [creatingAdmin, setCreatingAdmin] = useState(false)
  const [createAdminError, setCreateAdminError] = useState('')
  const [createAdminNotice, setCreateAdminNotice] = useState('')
  const [result, setResult] = useState<MembersResult | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchReady, setSearchReady] = useState(false)

  const loadMembers = useCallback(async () => {
    if (!searchReady) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), q: search })
      const response = await fetch(`/api/admin/users?${params}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to load members.')
      setResult(data)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load members.')
    } finally {
      setLoading(false)
    }
  }, [page, search, searchReady])

  useEffect(() => { void loadMembers() }, [loadMembers])

  useEffect(() => {
    const memberId = new URLSearchParams(window.location.search).get('memberId')
    if (memberId) {
      setSearchDraft(memberId)
      setSearch(memberId)
    }
    setSearchReady(true)
  }, [])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSearch(searchDraft.trim())
  }

  function replaceMember(updated: Member) {
    setResult((current) => current ? { ...current, users: current.users.map((member) => member.id === updated.id ? updated : member) } : current)
  }

  function toggleNewAdminPermission(permission: string) {
    setNewAdminPermissions((current) => current.includes(permission)
      ? current.filter((item) => item !== permission)
      : [...current, permission])
  }

  async function createAdministrator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreatingAdmin(true)
    setCreateAdminError('')
    setCreateAdminNotice('')
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAdminName,
          email: newAdminEmail,
          password: newAdminPassword,
          perms: newAdminPermissions
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to create administrator account.')
      setNewAdminName('')
      setNewAdminEmail('')
      setNewAdminPassword('')
      setNewAdminPermissions([])
      setCreateAdminNotice(`Administrator access created for ${data.user.email}.`)
      setSearchDraft(data.user.email)
      setSearch(data.user.email)
      setPage(1)
    } catch (reason) {
      setCreateAdminError(reason instanceof Error ? reason.message : 'Unable to create administrator account.')
    } finally {
      setCreatingAdmin(false)
    }
  }

  const pageCount = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1

  return (
    <div className="admin-users-page">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">COMMUNITY MANAGEMENT</p>
          <h1>Members</h1>
          <p>Manage reading access and administrator permissions across your community.</p>
        </div>
        <button className="admin-secondary-button" type="button" onClick={() => void loadMembers()} disabled={loading}>
          <span aria-hidden="true">↻</span> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </section>

      {result && <section className="admin-member-stats" aria-label="Community summary">
        <article className="admin-member-stat">
          <span className="admin-member-stat-icon" aria-hidden="true">♙</span>
          <div><span>Total accounts</span><strong>{result.summary.total.toLocaleString()}</strong></div>
        </article>
        <article className="admin-member-stat">
          <span className="admin-member-stat-icon" aria-hidden="true">✦</span>
          <div><span>Premium access</span><strong>{result.summary.premium.toLocaleString()}</strong></div>
        </article>
        <article className="admin-member-stat">
          <span className="admin-member-stat-icon" aria-hidden="true">◇</span>
          <div><span>Administrators</span><strong>{result.summary.administrators.toLocaleString()}</strong></div>
        </article>
        <article className="admin-member-stat">
          <span className="admin-member-stat-icon" aria-hidden="true">✎</span>
          <div><span>Writers · {result.summary.pendingWriters} awaiting review</span><strong>{result.summary.writers.toLocaleString()}</strong></div>
        </article>
      </section>}

      {result?.canManageRoles && <section className="admin-panel admin-create-admin">
        <div className="admin-create-admin-heading">
          <div><h2>Add an administrator</h2><p>Create a login for someone new and choose exactly which admin areas they can access.</p></div>
        </div>
        <form className="admin-create-admin-form" onSubmit={(event) => void createAdministrator(event)}>
          <label className="admin-input-label">Full name
            <input value={newAdminName} onChange={(event) => setNewAdminName(event.target.value)} autoComplete="name" maxLength={100} required />
          </label>
          <label className="admin-input-label">Email address
            <input type="email" value={newAdminEmail} onChange={(event) => setNewAdminEmail(event.target.value)} autoComplete="email" maxLength={254} required />
          </label>
          <label className="admin-input-label">Initial password
            <input type="password" value={newAdminPassword} onChange={(event) => setNewAdminPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={72} required />
            <small>At least 12 characters and no more than 72 bytes. Share securely so they can sign in.</small>
          </label>
          <fieldset className="admin-create-admin-permissions">
            <legend>Choose permissions</legend>
            <label><input type="checkbox" checked={newAdminPermissions.includes('users')} onChange={() => toggleNewAdminPermission('users')} /> <span><strong>Members</strong><small>View and manage member accounts</small></span></label>
            <label><input type="checkbox" checked={newAdminPermissions.includes('payments')} onChange={() => toggleNewAdminPermission('payments')} /> <span><strong>Platform settings</strong><small>Access payment and platform settings</small></span></label>
            <label><input type="checkbox" checked={newAdminPermissions.includes('content')} onChange={() => toggleNewAdminPermission('content')} /> <span><strong>Publishing</strong><small>Review and manage submitted content</small></span></label>
          </fieldset>
          {createAdminError && <p className="admin-inline-error" role="alert">{createAdminError}</p>}
          {createAdminNotice && <p className="admin-inline-success" role="status">{createAdminNotice}</p>}
          <button className="admin-save-button" type="submit" disabled={creatingAdmin || newAdminPermissions.length === 0}>{creatingAdmin ? 'Creating…' : 'Create administrator'}</button>
        </form>
      </section>}

      <section className="admin-panel admin-members-panel">
        <div className="admin-members-toolbar">
          <div><h2>All members</h2><p>Search for a member, choose Administrator, select the areas they can access, then save.</p></div>
          <form className="admin-search-form" onSubmit={submitSearch}>
            <label className="admin-search-input"><span aria-hidden="true">⌕</span><input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Name or email" aria-label="Search by member name or email" /></label>
            {searchDraft && <button className="admin-secondary-button admin-clear-search" type="button" onClick={() => { setSearchDraft(''); setSearch(''); setPage(1) }}>Clear</button>}
            <button className="admin-save-button" type="submit" disabled={loading}>Search</button>
          </form>
        </div>
        {error && <p className="admin-inline-error" role="alert">{error}</p>}
        <div className="admin-table-wrap">
          <table className="admin-table admin-members-table" aria-busy={loading}>
            <thead><tr><th>Member</th><th>Reading access</th><th>Role &amp; permissions</th><th>Joined</th><th>Action</th></tr></thead>
            <tbody>
              {result?.users.map((member) => <MemberRow key={member.id} member={member} canManageRoles={result.canManageRoles} onSaved={replaceMember} />)}
              {!loading && result?.users.length === 0 && <tr><td colSpan={5} className="admin-empty-cell">No members match your search.</td></tr>}
              {loading && !result && <tr><td colSpan={5} className="admin-empty-cell">Loading your community…</td></tr>}
              {error && !result && <tr><td colSpan={5} className="admin-empty-cell">Member data could not be loaded. Use Refresh to try again.</td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="admin-pagination">
          <span>{loading ? 'Refreshing members…' : result ? `Showing ${result.total === 0 ? 0 : (page - 1) * result.pageSize + 1}–${Math.min(page * result.pageSize, result.total)} of ${result.total} matching accounts` : 'Member list unavailable'}</span>
          <div><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page >= pageCount || loading}>Next</button></div>
        </footer>
      </section>
      <p className="admin-permission-note"><span aria-hidden="true">ⓘ</span> Only a super administrator can grant administrator roles or promote an administrator to super administrator. Super administrator accounts cannot be removed or changed in this platform.</p>
      {result?.canManageRoles && <p className="admin-permission-note"><span aria-hidden="true">ⓘ</span> Changing an administrator email does not change the configured super-admin login. When you reset a password, provide the new password securely to the member.</p>}
    </div>
  )
}
