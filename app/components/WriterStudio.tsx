'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type WriterStatus = 'pending' | 'approved' | 'disabled'
type SubmissionStatus = 'pending' | 'approved' | 'rejected'
type SubmissionKind = 'book' | 'meme' | 'quote'

type WriterSubmission = {
  id: string
  kind: SubmissionKind
  title: string
  author: string | null
  attribution: string | null
  body: string | null
  file_name: string | null
  status: SubmissionStatus
  created_at: string
  reviewed_at: string | null
}

type WriterResult = {
  writer: { name: string; status: WriterStatus }
  submissions: WriterSubmission[]
}

export default function WriterStudio() {
  const [result, setResult] = useState<WriterResult | null>(null)
  const [kind, setKind] = useState<SubmissionKind>('book')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadStudio = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/writer/submissions')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to load the writer workspace.')
      setResult(data)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load the writer workspace.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadStudio() }, [loadStudio])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    const form = event.currentTarget
    try {
      const response = await fetch('/api/writer/submissions', { method: 'POST', body: new FormData(form) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to submit your work.')
      setNotice(`“${data.submission.title}” is in the review queue. It will appear in the library after admin approval.`)
      form.reset()
      setKind('book')
      await loadStudio()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to submit your work.')
    } finally {
      setSaving(false)
    }
  }

  const writerStatus = result?.writer.status
  const statusLabels = { pending: 'Awaiting admin approval', approved: 'Approved', rejected: 'Not approved' }

  return (
    <main className="writer-page">
      <header className="writer-header">
        <div><p className="admin-eyebrow">LIBRA WRITER STUDIO</p><h1>Make room for your words.</h1><p>Share books, visual or text memes, and quotes with the Libra community.</p></div>
        <Link href="/library" className="writer-library-link">Visit reader library <span aria-hidden="true">→</span></Link>
      </header>

      {error && <p className="admin-inline-error writer-alert" role="alert">{error}</p>}
      {notice && <p className="admin-inline-success writer-alert" role="status">{notice}</p>}

      {loading && !result && <section className="writer-state-card">Loading your writer workspace…</section>}
      {!loading && !result && <section className="writer-state-card"><span className="admin-settings-icon" aria-hidden="true">✎</span><div><h2>Writer access required</h2><p>{error || 'Sign in to a Writer account to view this workspace.'}</p><Link href="/login">Sign in as a writer <span aria-hidden="true">→</span></Link></div></section>}

      {result && <>
        {writerStatus !== 'approved' && <section className={`writer-approval-banner ${writerStatus === 'disabled' ? 'is-disabled' : ''}`}>
          <span aria-hidden="true">{writerStatus === 'pending' ? '◷' : '◇'}</span>
          <div><strong>{writerStatus === 'pending' ? 'Your writer account is under review.' : 'Writer submissions are currently disabled.'}</strong><p>{writerStatus === 'pending' ? 'An administrator needs to approve your writer account before you can submit work. You can check back here for updates.' : 'Contact a Libra administrator if you think you should have writer access.'}</p></div>
        </section>}

        <section className="writer-submission-layout">
          <div className="writer-submission-intro"><p className="admin-eyebrow">YOUR CONTRIBUTION</p><h2>Submit something worth sharing.</h2><p>Every contribution is reviewed by the Libra team before it is published. You can follow the decision in your submission history.</p>
            <div className="writer-content-types"><span>▤ Books</span><span>☺ Memes</span><span>“ Quotes</span></div>
          </div>
          <form className="writer-submission-form" onSubmit={(event) => void submit(event)}>
            <label className="admin-settings-field"><span>What are you sharing?</span><select name="kind" value={kind} onChange={(event) => setKind(event.target.value as SubmissionKind)} disabled={writerStatus !== 'approved' || saving}>
              <option value="book">A book</option><option value="meme">A meme</option><option value="quote">A quote</option>
            </select></label>
            <label className="admin-settings-field"><span>{kind === 'book' ? 'Book title' : kind === 'meme' ? 'Meme title' : 'Quote title'} <span className="admin-required">*</span></span><input name="title" required maxLength={200} placeholder={kind === 'book' ? 'Give your book a title' : kind === 'meme' ? 'Name your meme' : 'A short title for your quote'} disabled={writerStatus !== 'approved' || saving} /></label>
            {kind === 'book' && <label className="admin-settings-field"><span>Author name</span><input name="author" maxLength={160} placeholder={result.writer.name} disabled={writerStatus !== 'approved' || saving} /></label>}
            {kind === 'quote' && <label className="admin-settings-field"><span>Quote attribution</span><input name="attribution" maxLength={200} placeholder="Who said or wrote this?" disabled={writerStatus !== 'approved' || saving} /></label>}
            {(kind === 'meme' || kind === 'quote' || kind === 'book') && <label className="admin-settings-field">
              <span>{kind === 'book' ? 'Book description' : kind === 'meme' ? 'Meme text or image caption' : 'Quote text'}{kind === 'quote' && <span className="admin-required"> *</span>}</span>
              <textarea name="body" maxLength={20_000} required={kind === 'quote'} placeholder={kind === 'book' ? 'What is this book about? (optional)' : kind === 'meme' ? 'Add text, attach an image, or do both' : 'Write or paste the quote'} disabled={writerStatus !== 'approved' || saving} />
            </label>}
            {(kind === 'book' || kind === 'meme') && <label className="admin-settings-field"><span>{kind === 'book' ? 'Book file' : 'Meme image'}{kind === 'book' && <span className="admin-required"> *</span>}</span><input name="file" type="file" accept={kind === 'book' ? '.pdf,.epub,.txt,application/pdf,application/epub+zip,text/plain' : 'image/png,image/jpeg,image/gif,image/webp'} required={kind === 'book'} disabled={writerStatus !== 'approved' || saving} /><small>{kind === 'book' ? 'PDF, EPUB, or UTF-8 text · up to 15 MB' : 'Optional · JPEG, PNG, GIF, or WebP · up to 5 MB'}</small></label>}
            <button type="submit" className="admin-save-button writer-submit-button" disabled={saving || writerStatus !== 'approved'}>{saving ? 'Sending to review…' : 'Submit for admin review'} <span aria-hidden="true">→</span></button>
            <p className="writer-form-note">Your submission stays private until a Libra administrator approves it.</p>
          </form>
        </section>

        <section className="writer-history">
          <div className="writer-history-heading"><div><p className="admin-eyebrow">YOUR WORK</p><h2>Submission history</h2></div><span>{result.submissions.length} submissions</span></div>
          {result.submissions.length === 0
            ? <div className="writer-history-empty"><span aria-hidden="true">✦</span><p>Your submitted books, memes, and quotes will show up here.</p></div>
            : <div className="writer-history-list">{result.submissions.map((submission) => <article key={submission.id} className="writer-history-row">
              <span className={`writer-history-icon is-${submission.kind}`} aria-hidden="true">{submission.kind === 'book' ? '▤' : submission.kind === 'meme' ? '☺' : '“'}</span>
              <div><span className="admin-content-type">{submission.kind}</span><strong>{submission.title}</strong><small>{new Date(submission.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}{submission.file_name ? ` · ${submission.file_name}` : ''}</small></div>
              <span className={`admin-submission-status is-${submission.status}`}>{statusLabels[submission.status]}</span>
            </article>)}</div>}
        </section>
      </>}
    </main>
  )
}
