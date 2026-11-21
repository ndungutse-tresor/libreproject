'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useCurrency, usePricing } from './pricing'
import { ThemeToggle } from './theme'

type Props = {
  search?: string
  onSearch?: (value: string) => void
}

const NAV = [
  { href: '/library', label: 'Library' },
  { href: '/pricing', label: 'Plans' },
  { href: '/writer', label: 'Write' }
]

export default function LibraHeader({ search, onSearch }: Props) {
  const pathname = usePathname()
  const { pricing } = usePricing()
  const [currency, setCurrency] = useCurrency()
  const [profile, setProfile] = useState<{ name: string } | null | undefined>(undefined)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    fetch('/api/profile')
      .then(async (response) => {
        const data = response.ok ? await response.json() : null
        if (active) setProfile(data?.profile ?? null)
      })
      .catch(() => { if (active) setProfile(null) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!onSearch) return
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSearch])

  const currencies = pricing?.currencies ?? []

  return (
    <header className="gs-header">
      <div className="gs-header-left">
        <Link href="/" className="gs-mark" aria-label="Libra home">
          <svg width="22" height="16" viewBox="0 0 22 16" aria-hidden="true">
            <path d="M1 2.5c3.4-1.6 6.6-1.6 9.5 0V15C7.6 13.4 4.4 13.4 1 15Z" fill="currentColor" />
            <path d="M21 2.5c-3.4-1.6-6.6-1.6-9.5 0V15c2.9-1.6 6.1-1.6 9.5 0Z" fill="currentColor" />
          </svg>
          libra.
        </Link>
        <nav className="gs-nav" aria-label="Main navigation">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>
          ))}
        </nav>
      </div>
      <div className="gs-header-right">
        {onSearch && <label className="gs-search">
          <span className="gs-sr">Search books</span>
          <input ref={searchRef} type="search" placeholder="Search…" value={search ?? ''} onChange={(event) => onSearch(event.target.value)} />
          <kbd>⌘K</kbd>
        </label>}
        {currencies.length > 1 && <select className="gs-select" aria-label="Currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
          {currencies.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}
        </select>}
        <ThemeToggle storageKey="libra.theme" />
        {profile
          ? <Link className="gs-icon-link" href="/profile" aria-label="Your profile">
            <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5" r="3" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M2 15c.6-3.2 3-5 6-5s5.4 1.8 6 5" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
            <span>{profile.name.split(' ')[0]}</span>
          </Link>
          : profile === null && <Link className="gs-icon-link" href="/login">Log in</Link>}
      </div>
    </header>
  )
}
