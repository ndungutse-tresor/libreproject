'use client'

import { useCallback, useEffect, useState } from 'react'

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

const FILTERS: { value: ContentFilter; label: string }[] = [
  { value: 'all', label: 'All work' },
  { value: 'pending', label: 'Awaiting review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Declined' }
]

function submissionEnabled(item: Submission) {
  return item.kind === 'book' ? item.book_enabled === true : item.post_enabled === true
}

export default function AdminContentManager() {
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

  return (
    <div className="admin-content-page">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">WRITERS &amp; COMMUNITY</p>
          <h1>Publishing</h1>
          <p>Review books, memes, and quotes before they appear in the reader library.</p>
        </div>
        <button className="admin-secondary-button" type="button" onClick={() => void loadSubmissions()} disabled={loading}>
          <span aria-hidden="true">↻</span> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </section>

      {result && <section className="admin-content-stats" aria-label="Publishing overview">
        <article><span>All submissions</span><strong>{result.summary.total.toLocaleString()}</strong></article>
        <article className="is-review"><span>Awaiting review</span><strong>{result.summary.pending.toLocaleString()}</strong></article>
        <article className="is-approved"><span>Approved work</span><strong>{result.summary.approved.toLocaleString()}</strong></article>
        <article><span>Declined</span><strong>{result.summary.rejected.toLocaleString()}</strong></article>
      </section>}

      <section className="admin-panel admin-content-panel">
        <div className="admin-content-toolbar">
          <div><h2>Writer submissions</h2><p>Approve to publish or decline work that is not ready to share.</p></div>
        </div>
        <div className="admin-content-filters" aria-label="Filter submissions">
          {FILTERS.map((item) => <button key={item.value} type="button" className={filter === item.value ? 'is-selected' : ''} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>
            {item.label}{item.value === 'pending' && result && <span>{result.summary.pending}</span>}
          </button>)}
        </div>
        {error && <p className="admin-inline-error" role="alert">{error}</p>}
        {notice && <p className="admin-inline-success" role="status">{notice}</p>}
        <div className="admin-submission-list" aria-busy={loading}>
          {result?.submissions.map((submission) => {
            const busy = busyId === submission.id
            const enabled = submissionEnabled(submission)
            const fileUrl = `/api/admin/content/file?id=${encodeURIComponent(submission.id)}`
            return <article className="admin-submission-card" key={submission.id}>
              <div className={`admin-submission-kind is-${submission.kind}`} aria-hidden="true">{submission.kind === 'book' ? '▤' : submission.kind === 'meme' ? '☺' : '“'}</div>
              <div className="admin-submission-main">
                <header className="admin-submission-heading">
                  <div><span className="admin-content-type">{submission.kind}</span><h3>{submission.title}</h3></div>
                  <span className={`admin-submission-status is-${submission.status}`}>{submission.status === 'pending' ? 'Awaiting review' : submission.status}</span>
                </header>
                {submission.kind === 'book' && submission.status === 'approved' && <div className="admin-book-title-editor">
                  {editingBookId === submission.id ? <>
                    <label>Book cover title
                      <input value={bookTitleDraft} onChange={(event) => setBookTitleDraft(event.target.value)} maxLength={160} />
                    </label>
                    <button className="admin-content-approve" type="button" onClick={() => void saveBookTitle(submission)} disabled={busy}>{busy ? 'Saving…' : 'Save title'}</button>
                    <button className="admin-content-toggle" type="button" onClick={() => setEditingBookId('')} disabled={busy}>Cancel</button>
                  </> : <button className="admin-content-toggle" type="button" onClick={() => { setEditingBookId(submission.id); setBookTitleDraft(submission.title) }}>Edit cover title</button>}
                </div>}
                <p className="admin-submission-writer">By <strong>{submission.writer_name}</strong> · {submission.writer_email} · {new Date(submission.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                {submission.kind === 'book' && submission.author && <p className="admin-submission-detail">Book author: {submission.author}</p>}
                {submission.kind === 'quote' && submission.attribution && <p className="admin-submission-detail">Attribution: {submission.attribution}</p>}
                {submission.body && <p className={`admin-submission-body ${submission.kind === 'quote' ? 'is-quote' : ''}`}>{submission.body}</p>}
                {submission.file_name && <a className="admin-submission-file" href={fileUrl} target="_blank" rel="noreferrer"><span aria-hidden="true">{submission.mime_type?.startsWith('image/') ? '▧' : '↗'}</span>{submission.file_name} <span>Preview file</span></a>}
                {submission.kind === 'meme' && submission.mime_type?.startsWith('image/') && <img className="admin-submission-image" src={fileUrl} alt={submission.title} />}
                <footer className="admin-submission-actions">
                  {submission.status === 'pending' && <>
                    <button className="admin-content-approve" type="button" onClick={() => void moderate(submission, 'approve')} disabled={busy}>{busy ? 'Saving…' : 'Approve & publish'}</button>
                    <button className="admin-content-reject" type="button" onClick={() => void moderate(submission, 'reject')} disabled={busy}>Decline</button>
                  </>}
                  {submission.status === 'approved' && <button className="admin-content-toggle" type="button" onClick={() => void moderate(submission, enabled ? 'disable' : 'enable')} disabled={busy}>{busy ? 'Saving…' : enabled ? 'Disable from library' : 'Enable in library'}</button>}
                  {submission.reviewed_at && <span>Reviewed {new Date(submission.reviewed_at).toLocaleDateString()}</span>}
                </footer>
              </div>
            </article>
          })}
          {!loading && result?.submissions.length === 0 && <div className="admin-content-empty"><span aria-hidden="true">✦</span><h3>{filter === 'pending' ? 'You’re all caught up.' : 'No submissions here yet.'}</h3><p>{filter === 'pending' ? 'New writer work will appear here for review.' : 'Writer submissions will appear here when they are sent.'}</p></div>}
          {loading && !result && <div className="admin-content-empty">Loading submissions…</div>}
          {error && !result && <div className="admin-content-empty">Submission queue could not be loaded.</div>}
        </div>
      </section>
      <p className="admin-content-note"><span aria-hidden="true">ⓘ</span> Writers need admin approval before they can submit. Every book, meme, and quote needs a separate review before publication.</p>
    </div>
  )
}
