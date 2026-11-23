'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import BookCover from './gallery/BookCover'
import { GaIcon, Segmented, StatCard, initials, rise } from '../admin/glass/GlassKit'

type SubmissionStatus = 'pending' | 'approved' | 'rejected'
type ContentFilter = 'all' | SubmissionStatus

type Submission = {
  id: string
  kind: 'book' | 'meme' | 'quote'
  title: string
  author: string | null
  attribution: string | null
  body: string | null
  file_name: string | null
  mime_type: string | null
  status: SubmissionStatus
  created_at: string
  reviewed_at: string | null
  writer_name: string
  writer_email: string
  book_id: string | null
  book_enabled: boolean | null
  post_id: string | null
  post_enabled: boolean | null
}

type ModerationResult = {
  submissions: Submission[]
  summary: { total: number; pending: number; approved: number; rejected: number }
}

const STATUS_CHIP = { pending: ['is-amber', 'In review'], approved: ['is-green', 'Approved'], rejected: ['is-red', 'Declined'] } as const
const KIND_ICON = { book: 'book', meme: 'image', quote: 'quote' } as const

function ago(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000)
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : days < 30 ? `${days} days ago` : new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function submissionEnabled(item: Submission) {
  return item.kind === 'book' ? item.book_enabled === true : item.post_enabled === true
}

export default function AdminContentManager() {
  const router = useRouter()
  const [result, setResult] = useState<ModerationResult | null>(null)
  const [filter, setFilter] = useState<ContentFilter>('all')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [editingBookId, setEditingBookId] = useState('')
  const [bookTitleDraft, setBookTitleDraft] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadSubmissions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/content?status=${filter}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to load publishing submissions.')
      setResult(data)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load publishing submissions.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { void loadSubmissions() }, [loadSubmissions])

  async function moderate(submission: Submission, action: 'approve' | 'reject' | 'enable' | 'disable') {
    setBusyId(submission.id)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id, action })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to update this submission.')
      const messages = {
        approve: 'Submission approved and published.',
        reject: 'Submission declined.',
        enable: 'Published content is visible in the library.',
        disable: 'Published content is hidden from the library.'
      }
      setNotice(messages[action])
      await loadSubmissions()
      // Refresh the waiting counts beside the navigation.
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update this submission.')
    } finally {
      setBusyId('')
    }
  }

  async function saveBookTitle(submission: Submission) {
    setBusyId(submission.id)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id, action: 'edit-title', title: bookTitleDraft })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to update the book title.')
      setEditingBookId('')
      setNotice('Book title updated. It will appear on the login and signup artwork.')
      await loadSubmissions()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update the book title.')
    } finally {
      setBusyId('')
    }
  }

  const summary = result?.summary

  return (
    <div className="admin-content-page">
      <header className="ga-head">
        <div {...rise(0)}>
          <h1>Publishing</h1>
          <p>Every book, meme and quote a writer sends is checked here before readers see it</p>
        </div>
        <div {...rise(1, 'ga-head-actions')}>
          <button className="ga-button" type="button" onClick={() => void loadSubmissions()} disabled={loading}><GaIcon name="refresh" /> {loading ? 'Refreshing…' : 'Refresh'}</button>
          <button className="ga-button is-dark" type="button" onClick={() => setFilter('pending')}><GaIcon name="check" /> Show what’s waiting</button>
        </div>
      </header>

      {summary && <div className="ga-grid is-four" aria-label="Publishing overview">
        <StatCard index={2} icon="layers" value={summary.total} label="All submissions" sub="Books, memes and quotes" onClick={() => setFilter('all')} pressed={filter === 'all'} />
        <StatCard index={3} icon="clock" value={summary.pending} label="Waiting for review" sub="Oldest first is fairest" onClick={() => setFilter('pending')} pressed={filter === 'pending'} />
        <StatCard index={4} icon="check" value={summary.approved} label="Approved" sub="Published to the library" onClick={() => setFilter('approved')} pressed={filter === 'approved'} />
        <StatCard index={5} icon="x" value={summary.rejected} label="Declined" sub="Sent back to the writer" onClick={() => setFilter('rejected')} pressed={filter === 'rejected'} />
      </div>}

      <div {...rise(6, 'ga-toolbar')} style={{ ...rise(6).style, marginTop: 16 }}>
        <Segmented<ContentFilter>
          label="Filter submissions"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All work', count: summary?.total },
            { value: 'pending', label: 'In review', count: summary?.pending },
            { value: 'approved', label: 'Approved', count: summary?.approved },
            { value: 'rejected', label: 'Declined', count: summary?.rejected }
          ]}
        />
      </div>
      {error && <p className="ga-notice is-error" role="alert"><GaIcon name="alert" />{error}</p>}
      {notice && <p className="ga-notice is-success" role="status"><GaIcon name="check" />{notice}</p>}

      <div className="ga-grid is-tiles" aria-busy={loading}>
        {result?.submissions.map((submission, index) => {
          const busy = busyId === submission.id
          const enabled = submissionEnabled(submission)
          const fileUrl = `/api/admin/content/file?id=${encodeURIComponent(submission.id)}`
          const isImage = submission.mime_type?.startsWith('image/')
          const [tone, statusLabel] = STATUS_CHIP[submission.status]
          return (
            <article key={submission.id} {...rise(7 + Math.min(index, 8), 'ga-card ga-tile is-lift')}>
              <div className="ga-tile-media">
                {submission.kind === 'meme' && isImage
                  ? <img src={fileUrl} alt={submission.title} loading="lazy" />
                  : submission.kind === 'quote'
                    ? <div className="ga-tile-art ga-tile-quote"><blockquote>“{(submission.body ?? submission.title).slice(0, 140)}{(submission.body ?? '').length > 140 ? '…' : ''}”</blockquote></div>
                    : <div className="ga-tile-art"><span className="ga-tile-cover"><BookCover title={submission.title} author={submission.author} /></span></div>}
                <span className={`ga-chip is-glass`}><span className={`ga-pip ga-pip-${tone}`} />{statusLabel}</span>
                <span className="ga-chip is-glass"><GaIcon name={KIND_ICON[submission.kind]} />{submission.kind}</span>
              </div>
              <div className="ga-tile-body">
                <h3>{submission.title}</h3>
                {submission.kind === 'book' && submission.author && <p>Book author: {submission.author}</p>}
                {submission.kind === 'quote' && submission.attribution && <p>Attribution: {submission.attribution}</p>}
                {submission.kind !== 'quote' && submission.body && <p className="ga-clamp">{submission.body}</p>}
                <div className="ga-person">
                  <span className="ga-avatar">{initials(submission.writer_name)}</span>
                  <div><strong>{submission.writer_name}</strong><small>{submission.writer_email} · {ago(submission.created_at)}</small></div>
                </div>
                <div className="ga-tile-tags">
                  {submission.file_name && <a className="ga-chip is-blue" href={fileUrl} target="_blank" rel="noreferrer"><GaIcon name={isImage ? 'image' : 'external'} />{submission.file_name}</a>}
                  {submission.status === 'approved' && <span className={`ga-chip ${enabled ? 'is-green' : ''}`}>{enabled ? 'Visible in the library' : 'Hidden from the library'}</span>}
                  {submission.reviewed_at && <span className="ga-chip">Reviewed {new Date(submission.reviewed_at).toLocaleDateString()}</span>}
                </div>
                {submission.kind === 'book' && submission.status === 'approved' && editingBookId === submission.id && (
                  <label className="ga-field" style={{ marginTop: 10 }}>Book cover title
                    <input className="ga-input" value={bookTitleDraft} onChange={(event) => setBookTitleDraft(event.target.value)} maxLength={160} />
                  </label>
                )}
              </div>
              <footer className="ga-tile-actions">
                {submission.status === 'pending' && <>
                  <button className="ga-button is-danger" type="button" onClick={() => void moderate(submission, 'reject')} disabled={busy}><GaIcon name="x" /> Decline</button>
                  <button className="ga-button is-dark" type="button" onClick={() => void moderate(submission, 'approve')} disabled={busy}><GaIcon name="check" /> {busy ? 'Saving…' : 'Approve'}</button>
                </>}
                {submission.status === 'approved' && (editingBookId === submission.id ? <>
                  <button className="ga-button" type="button" onClick={() => setEditingBookId('')} disabled={busy}>Cancel</button>
                  <button className="ga-button is-dark" type="button" onClick={() => void saveBookTitle(submission)} disabled={busy}>{busy ? 'Saving…' : 'Save title'}</button>
                </> : <>
                  {submission.kind === 'book'
                    ? <button className="ga-button" type="button" onClick={() => { setEditingBookId(submission.id); setBookTitleDraft(submission.title) }}><GaIcon name="review" /> Edit title</button>
                    : <a className="ga-button" href={fileUrl} target="_blank" rel="noreferrer"><GaIcon name="eye" /> Review</a>}
                  <button className={`ga-button${enabled ? '' : ' is-dark'}`} type="button" onClick={() => void moderate(submission, enabled ? 'disable' : 'enable')} disabled={busy}>{busy ? 'Saving…' : enabled ? 'Hide' : 'Show'}</button>
                </>)}
                {submission.status === 'rejected' && <span className="ga-tile-note">Declined. The writer can send a new version.</span>}
              </footer>
            </article>
          )
        })}
      </div>
      {!loading && result?.submissions.length === 0 && <div {...rise(7, 'ga-card ga-empty')}><GaIcon name="sparkles" size={22} /><strong>{filter === 'pending' ? 'You’re all caught up.' : 'No submissions here yet.'}</strong><span>{filter === 'pending' ? 'New writer work will appear here for review.' : 'Writer submissions will appear here when they are sent.'}</span></div>}
      {loading && !result && <div className="ga-empty">Loading submissions…</div>}
      {error && !result && <div className="ga-empty">The submission queue could not be loaded.</div>}
      <p className="admin-content-note"><GaIcon name="info" size={14} /> Writers need admin approval before they can submit. Every book, meme and quote needs its own review before publication.</p>
    </div>
  )
}
