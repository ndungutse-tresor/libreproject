'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type QuickProfile = {
  name: string
  has_profile_image: boolean
}

export default function ProfileQuickLink() {
  const [profile, setProfile] = useState<QuickProfile | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/profile')
      .then(async (response) => {
        if (!response.ok) return
        const data = await response.json()
        if (active) setProfile(data.profile)
      })
      .catch((error: unknown) => {
        console.error('Unable to load account shortcut:', error)
      })
    return () => { active = false }
  }, [])

  if (!profile) return null

  return (
    <Link className="profile-quick-link" href="/profile" aria-label="Edit your profile">
      {profile.has_profile_image
        ? <img src="/api/profile/avatar" alt="" />
        : <span aria-hidden="true">{profile.name.trim().slice(0, 1).toUpperCase()}</span>}
      <span>My profile</span>
    </Link>
  )
}
