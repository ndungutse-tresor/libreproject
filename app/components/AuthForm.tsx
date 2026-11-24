'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type AccountType = 'reader' | 'writer'
type AuthBookCover = { eyebrow: string; title: string; footer: string }

const defaultBookCovers: AuthBookCover[] = [
  { eyebrow: 'LIBRA EDITIONS', title: 'The quiet art of reading', footer: 'FIND YOUR NEXT CHAPTER' },
  { eyebrow: 'VOLUME 01', title: 'Stories to stay with you', footer: 'READ · REFLECT · RETURN' },
  { eyebrow: "A READER'S JOURNAL", title: 'Make room for wonder', footer: 'YOUR LIBRARY, YOUR RHYTHM' },
  { eyebrow: 'FIELD NOTES', title: 'Wild gardens', footer: 'COLLECT SMALL MOMENTS' },
  { eyebrow: 'THE ATLAS', title: 'Somewhere new', footer: 'TAKE THE LONG WAY' },
  { eyebrow: 'POETRY', title: 'Soft mornings', footer: 'WORDS FOR SLOW DAYS' },
  { eyebrow: 'LIBRA COLLECTION', title: 'Notes from home', footer: 'KEEP WHAT MOVES YOU' }
]

const isGmail = (email: string) => /^[^\s@]+@(gmail|googlemail)\.com$/i.test(email.trim())

const VERIFIED_NOTICES: Record<string, { tone: 'ok' | 'warn'; text: string }> = {
  '1': { tone: 'ok', text: 'Your email is confirmed. Log in to start reading.' },
  expired: { tone: 'warn', text: 'That link has expired or was already used. Log in and we can send you a new one.' },
  error: { tone: 'warn', text: 'We couldn’t confirm your email just now. Open the link again in a minute.' }
}

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null)
  // After signing up (or when a login needs confirming first): the address the link went to.
  const [pendingEmail, setPendingEmail] = useState('')
  const [sentNow, setSentNow] = useState(true)
  const [resendWait, setResendWait] = useState(0)
  const [resendMessage, setResendMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [accountType, setAccountType] = useState<AccountType | null>(mode === 'register' ? 'reader' : null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [bookCovers, setBookCovers] = useState(defaultBookCovers)
  const router = useRouter()

  useEffect(() => {
    let active = true
    fetch('/api/auth/art')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load published book titles.')
        return response.json()
      })
      .then((data: { books?: { title: string; author: string | null }[] }) => {
        if (!active || !Array.isArray(data.books) || data.books.length < 3) return
        const publishedBooks = data.books.filter((book) => typeof book.title === 'string' && book.title.trim())
        if (publishedBooks.length < 3) return
        setBookCovers(defaultBookCovers.map((_, index) => {
          const book = publishedBooks[index % publishedBooks.length]
          return {
            eyebrow: book.author?.trim().slice(0, 32) || 'FROM THE LIBRA LIBRARY',
            title: book.title.trim(),
            footer: 'NOW IN THE LIBRARY'
          }
        }))
      })
      .catch((reason: unknown) => {
        console.error('Unable to update auth page book covers:', reason)
      })
    return () => { active = false }
  }, [])

  // Coming back from the confirmation link.
  useEffect(() => {
    const verified = new URLSearchParams(window.location.search).get('verified')
    if (verified && VERIFIED_NOTICES[verified]) setNotice(VERIFIED_NOTICES[verified])
  }, [])

  useEffect(() => {
    if (resendWait <= 0) return
    const timer = window.setTimeout(() => setResendWait((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendWait])

  async function resend(email: string) {
    setResendMessage('')
    try {
      const response = await fetch('/api/auth/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const result = await response.json()
      if (!response.ok) {
        if (typeof result.wait === 'number') setResendWait(result.wait)
        setResendMessage(result.error ?? 'Unable to send a new link.')
        return
      }
      setResendWait(60)
      setResendMessage(result.message ?? 'A new link is on its way.')
    } catch {
      setResendMessage('Unable to reach the server. Try again.')
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setErrorCode('')
    setResendMessage('')
    const form = new FormData(event.currentTarget)
    if (mode === 'register' && form.get('password') !== form.get('confirmPassword')) {
      setError('Passwords do not match.')
      return
    }
    if (mode === 'register' && !isGmail(String(form.get('email') ?? ''))) {
      setError('Libra accounts use Gmail. Enter an address that ends in @gmail.com.')
      return
    }

    setBusy(true)
    const payload = Object.fromEntries(form.entries())
    delete payload.confirmPassword

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error ?? 'Unable to authenticate.')
        setErrorCode(result.code ?? '')
        if (result.code === 'unverified') setPendingEmail(String(payload.email ?? ''))
        return
      }
      if (mode === 'register' && result.verify) {
        // The account opens from the link in the email, not straight away.
        setPendingEmail(result.email)
        setSentNow(result.sent !== false)
        setResendWait(result.sent === false ? 0 : 60)
        return
      }
      let destination = accountType === 'writer' ? '/writer' : '/library'
      if (mode === 'login') {
        const user = result.user
        const requestedDestination = new URLSearchParams(window.location.search).get('next')

        if (user?.role === 'admin' || user?.role === 'super' ||
            requestedDestination === '/admin' || requestedDestination?.startsWith('/admin/')) {
          destination = '/admin'
        } else if (user?.account_type === 'writer') {
          destination = '/writer'
        } else {
          destination = '/library'
        }
      }
      router.push(destination)
      router.refresh()
    } catch {
      setError('Unable to reach the server. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={`auth-page auth-page-themed ${mode === 'login' ? 'auth-page-login' : 'auth-page-register'}`}>
      <div className="auth-login-art" aria-hidden="true">
          <p className="auth-login-art-kicker">THE LIBRA READING ROOM</p>
          <div className="auth-login-books">
            {bookCovers.map((cover, index) => {
              const bookClass = `auth-login-book auth-login-book-${['one', 'two', 'three', 'four', 'five', 'six', 'seven'][index]}`
              return <div className={bookClass} key={index}>
                <span>{cover.eyebrow}</span>
                <strong>{cover.title}</strong>
                <small>{cover.footer}</small>
              </div>
            })}
            {bookCovers.slice(0, 3).map((cover, index) => {
              const bookClass = `auth-login-book auth-login-book-${['one', 'two', 'three'][index]} auth-login-book-left-${['one', 'two', 'three'][index]}`
              return <div className={bookClass} key={`left-${index}`}>
                <span>{cover.eyebrow}</span>
                <strong>{cover.title}</strong>
                <small>{cover.footer}</small>
              </div>
            })}
          </div>
          <p className="auth-login-art-note">A little more space for a good book.</p>
      </div>
      <section className="auth-card">
        <div className="auth-card-watermark" aria-hidden="true">
          {Array.from({ length: 20 }, (_, index) => <span key={index}>LIBRE</span>)}
        </div>
        <Link href="/" className="auth-brand">libra.</Link>
        <p className="auth-eyebrow">{mode === 'login' ? 'Welcome back' : 'Start your reading life'}</p>
        <h1>{mode === 'login' ? 'Log in to Libra' : 'Create your account'}</h1>
        <p className="auth-description">
          {mode === 'login' ? 'Pick up where you left off and get back to a good book.' : 'Join Libra and make a little more room for reading.'}
        </p>
        {mode === 'register' && pendingEmail ? (
          <div className="auth-check-email" role="status">
            <span className="auth-check-email-icon" aria-hidden="true">✉</span>
            <h2>Check your Gmail</h2>
            <p>{sentNow ? <>We sent a confirmation link to <strong>{pendingEmail}</strong>. Open it to finish creating your account.</> : <>Your account is ready, but the confirmation email didn’t go out. Send it again below.</>}</p>
            <p className="auth-check-email-note">It can take a minute. Look in Spam or Promotions if you don’t see it.</p>
            <button type="button" className="auth-submit auth-submit-light" disabled={resendWait > 0} onClick={() => void resend(pendingEmail)}>
              {resendWait > 0 ? `Send a new link in ${resendWait}s` : 'Send a new link'}
            </button>
            {resendMessage && <p className="auth-check-email-note" role="status">{resendMessage}</p>}
            <Link href="/login" className="auth-submit">I’ve confirmed it, log in</Link>
          </div>
        ) : <>
        {notice && <p className={`auth-notice is-${notice.tone}`} role="status">{notice.text}</p>}
        <form onSubmit={submit} className="auth-form">
        {mode === 'register' && (
          <label className="auth-field">Name
            <input name="name" type="text" placeholder="Your name" autoComplete="name" required maxLength={100} />
          </label>
        )}
        <fieldset className="auth-account-choice">
          <legend>{mode === 'login' ? 'Continue as' : 'I want to join as a'}</legend>
          <div className="auth-account-options">
            <label className={`auth-account-option ${accountType === 'reader' ? 'is-selected' : ''}`}>
              <input type="radio" name="accountType" value="reader" checked={accountType === 'reader'} onChange={() => setAccountType('reader')} />
              <span className="auth-account-option-icon" aria-hidden="true">▤</span>
              <span><strong>Reader</strong><small>Explore books and ideas</small></span>
            </label>
            <label className={`auth-account-option ${accountType === 'writer' ? 'is-selected' : ''}`}>
              <input type="radio" name="accountType" value="writer" checked={accountType === 'writer'} onChange={() => setAccountType('writer')} />
              <span className="auth-account-option-icon" aria-hidden="true">✎</span>
              <span><strong>Writer</strong><small>Submit work for review</small></span>
            </label>
          </div>
          {mode === 'register' && accountType === 'writer' && <p className="auth-account-note">Writer accounts and every submission need admin approval before publishing.</p>}
        </fieldset>
        <label className="auth-field">{mode === 'register' ? 'Gmail address' : 'Email'}
          <input name="email" type="email" placeholder="you@gmail.com" autoComplete="email" required maxLength={254} />
          {mode === 'register' && <small className="auth-field-hint">Libra accounts use Gmail. We’ll email you a link to confirm it.</small>}
        </label>
        <label className="auth-field">Password
          <span className="auth-password-control">
            <input name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 8 : undefined} />
            <button type="button" className="auth-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
                <circle cx="12" cy="12" r="2.5" />
                {showPassword && <path d="m4 4 16 16" />}
              </svg>
            </button>
          </span>
        </label>
        {mode === 'register' && (
          <label className="auth-field">Confirm password
            <span className="auth-password-control">
              <input name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Enter your password again" autoComplete="new-password" required minLength={8} />
              <button type="button" className="auth-password-toggle" aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
                  <circle cx="12" cy="12" r="2.5" />
                  {showConfirmPassword && <path d="m4 4 16 16" />}
                </svg>
              </button>
            </span>
          </label>
        )}
        {error && <p role="alert" style={{ color: '#b91c1c', margin: 0 }}>{error}</p>}
        {errorCode === 'unverified' && pendingEmail && <div className="auth-resend">
          <button type="button" className="auth-link-button" disabled={resendWait > 0} onClick={() => void resend(pendingEmail)}>
            {resendWait > 0 ? `Send a new confirmation link in ${resendWait}s` : 'Send a new confirmation link'}
          </button>
          {resendMessage && <p role="status">{resendMessage}</p>}
        </div>}
        <button disabled={busy} type="submit" className="auth-submit">
          {busy ? 'Please wait…' : mode === 'login' ? 'Continue' : 'Create account'}
        </button>
        </form>
        </>}
        <p className="auth-switch">
        {mode === 'login' ? <>New to Libra? <Link href="/signup">Create an account</Link></> : <>Already registered? <Link href="/login">Log in</Link></>}
        </p>
      </section>
    </main>
  )
}
