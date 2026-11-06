'use client'

import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import Link from 'next/link'

type AccountProfile = {
  id: string
  name: string
  email: string
  role: 'user' | 'admin' | 'super'
  account_type: 'reader' | 'writer'
  writer_status: string
  gender: 'male' | 'female' | 'prefer_not_to_say' | null
  age: number | null
  bio: string
  favorite_genres: string[]
  has_profile_image: boolean
}

function displayRole(profile: AccountProfile) {
  if (profile.role === 'super') return 'Super administrator'
  if (profile.role === 'admin') return 'Administrator'
  return profile.account_type === 'writer' ? 'Writer' : 'Reader'
}

export default function ProfileEditor() {
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [bio, setBio] = useState('')
  const [genres, setGenres] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pictureBusy, setPictureBusy] = useState(false)
  const [pictureVersion, setPictureVersion] = useState(0)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/profile')
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Sign in to edit your profile.')
        if (!active) return
        const account = data.profile as AccountProfile
        setProfile(account)
        setName(account.name)
        setGender(account.gender ?? '')
        setAge(account.age === null ? '' : String(account.age))
        setBio(account.bio ?? '')
        setGenres((account.favorite_genres ?? []).join(', '))
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load your profile.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const favoriteGenres = genres.split(',').map((genre) => genre.trim()).filter(Boolean)
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gender, age, bio, favoriteGenres })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to save your profile.')
      setProfile(data.profile)
      setName(data.profile.name)
      setNotice('Your profile details have been saved.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save your profile.')
    } finally {
      setSaving(false)
    }
  }

  async function uploadPicture(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    setNotice('')

    if (file.size > 2 * 1024 * 1024) {
      setError('Profile pictures must be 2 MB or smaller.')
      event.target.value = ''
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP image.')
      event.target.value = ''
      return
    }

    setPreviewUrl(URL.createObjectURL(file))
    setPictureBusy(true)
    try {
      const formData = new FormData()
      formData.set('avatar', file)
      const response = await fetch('/api/profile/avatar', { method: 'PUT', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to upload your profile picture.')
      setPreviewUrl('')
      setProfile((current) => current ? { ...current, has_profile_image: true } : current)
      setPictureVersion((version) => version + 1)
      setNotice('Your profile picture has been updated.')
    } catch (reason) {
      setPreviewUrl('')
      setError(reason instanceof Error ? reason.message : 'Unable to upload your profile picture.')
    } finally {
      setPictureBusy(false)
      event.target.value = ''
    }
  }

  async function removePicture() {
    setPictureBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/profile/avatar', { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to remove your profile picture.')
      setPreviewUrl('')
      setProfile((current) => current ? { ...current, has_profile_image: false } : current)
      setPictureVersion((version) => version + 1)
      setNotice('Your profile picture has been removed.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to remove your profile picture.')
    } finally {
      setPictureBusy(false)
    }
  }

  return (
    <main className="profile-page">
      <section className="profile-heading">
        <p className="admin-eyebrow">YOUR LIBRA ACCOUNT</p>
        <h1>Your profile</h1>
        <p>Personalize your account as a reader, writer, or administrator. These details are private to your account.</p>
      </section>

      {error && <p className="admin-inline-error profile-message" role="alert">{error}</p>}
      {notice && <p className="admin-inline-success profile-message" role="status">{notice}</p>}
      {loading && <section className="profile-card">Loading your profile…</section>}
      {!loading && !profile && <section className="profile-card profile-signin">
        <p>Sign in to view and edit your profile.</p>
        <Link className="admin-save-button" href="/login?next=%2Fprofile">Sign in</Link>
      </section>}

      {profile && <div className="profile-layout">
        <section className="profile-card profile-picture-card">
          <div className="profile-avatar-preview">
            {previewUrl || (profile.has_profile_image ? `/api/profile/avatar?v=${pictureVersion}` : '')
              ? <img src={previewUrl || `/api/profile/avatar?v=${pictureVersion}`} alt="Profile picture preview" />
              : <span aria-hidden="true">{profile.name.trim().slice(0, 1).toUpperCase()}</span>}
          </div>
          <div className="profile-picture-copy">
            <h2>Profile picture</h2>
            <p>Use a JPEG, PNG, or WebP image up to 2 MB.</p>
            <label className="admin-save-button profile-upload-button">
              {pictureBusy ? 'Updating…' : 'Choose picture'}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadPicture(event)} disabled={pictureBusy} />
            </label>
            {profile.has_profile_image && <button className="admin-secondary-button" type="button" onClick={() => void removePicture()} disabled={pictureBusy}>Remove picture</button>}
          </div>
        </section>

        <form className="profile-card profile-form" onSubmit={(event) => void saveProfile(event)}>
          <div className="profile-form-heading">
            <div><p className="admin-eyebrow">ACCOUNT DETAILS</p><h2>About you</h2></div>
            <span className="admin-badge admin-badge-green">{displayRole(profile)}</span>
          </div>
          <label className="admin-settings-field"><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={100} required /></label>
          <label className="admin-settings-field"><span>Email</span><input value={profile.email} type="email" readOnly /><small>Email is used to sign in. Contact the super administrator if you are an admin and need it changed.</small></label>
          <div className="profile-field-grid">
            <label className="admin-settings-field"><span>Gender <small>(optional)</small></span>
              <select value={gender} onChange={(event) => setGender(event.target.value)}>
                  <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </label>
            <label className="admin-settings-field"><span>Age <small>(optional)</small></span><input type="number" min="1" max="120" value={age} onChange={(event) => setAge(event.target.value)} placeholder="Your age" /></label>
          </div>
          <label className="admin-settings-field"><span>Short bio <small>(optional)</small></span><textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} rows={4} placeholder="A few words about you…" /><small>{bio.length}/500 characters</small></label>
          <label className="admin-settings-field"><span>Favorite genres <small>(optional)</small></span><input value={genres} onChange={(event) => setGenres(event.target.value)} maxLength={270} placeholder="Fantasy, history, romance" /><small>Separate genres with commas; choose up to 8.</small></label>
          <div className="profile-account-meta"><span>Account type: <strong>{profile.account_type === 'writer' ? 'Writer' : 'Reader'}</strong></span>{profile.account_type === 'writer' && <span>Writer status: <strong>{profile.writer_status}</strong></span>}</div>
          <button className="admin-save-button profile-save-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
        </form>
      </div>}
    </main>
  )
}
