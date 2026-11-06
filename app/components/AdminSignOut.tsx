'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AdminSignOut() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function signOut() {
    setBusy(true)
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Unable to sign out.')
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Unable to sign out:', error)
      setBusy(false)
    }
  }

  return <button className="admin-signout" type="button" onClick={() => void signOut()} disabled={busy}>{busy ? 'Signing out…' : 'Sign out'}</button>
}
