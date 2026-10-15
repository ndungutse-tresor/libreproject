'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error ?? 'Unable to authenticate.')
        return
      }
      router.push('/library')
      router.refresh()
    } catch {
      setError('Unable to reach the server. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '80px auto', padding: 24 }}>
      <h1>{mode === 'login' ? 'Log in' : 'Create account'}</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        {mode === 'register' && (
          <input name="name" type="text" placeholder="Name" autoComplete="name" required maxLength={100} style={inputStyle} />
        )}
        <input name="email" type="email" placeholder="Email" autoComplete="email" required style={inputStyle} />
        <input name="password" type="password" placeholder="Password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 8 : undefined} style={inputStyle} />
        {error && <p role="alert" style={{ color: '#b91c1c', margin: 0 }}>{error}</p>}
        <button disabled={busy} type="submit" style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 16px', cursor: 'pointer' }}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Continue' : 'Create account'}
        </button>
      </form>
      <p style={{ color: '#475569', marginTop: 20 }}>
        {mode === 'login' ? <>New to Libra? <Link href="/signup">Create an account</Link></> : <>Already registered? <Link href="/login">Log in</Link></>}
      </p>
    </main>
  )
}

const inputStyle = { padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1' }
