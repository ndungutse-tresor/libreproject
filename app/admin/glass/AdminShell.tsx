'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { GaIcon, initials, type IconName } from './GlassKit'

export type ShellNavItem = { href: string; label: string; icon: IconName; count?: number; external?: boolean }
export type ShellNavGroup = { label: string; items: ShellNavItem[] }
export type ShellSearch = { label: string; href: (query: string) => string; icon: IconName }

type Props = {
  brand: { mark: string; title: string; subtitle: string; href: string }
  groups: ShellNavGroup[]
  user: { name: string; role: string; avatar?: string | null; href?: string }
  meter?: { label: string; value: number; total: number; caption: string }
  alerts?: { count: number; href: string; label: string }
  site: { href: string; label: string }
  searches: ShellSearch[]
  searchPlaceholder?: string
  onSignOut: () => Promise<void> | void
  children: ReactNode
}

type Result = { key: string; label: string; href: string; icon: IconName; hint?: string }

/**
 * The glass admin frame: backdrop, grouped navigation rail, search bar with a
 * ⌘K shortcut, and the light glass sheet that every admin page sits on.
 */
export default function AdminShell({ brand, groups, user, meter, alerts, site, searches, searchPlaceholder = 'Search pages…', onSignOut, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [signingOut, setSigningOut] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => { setMenuOpen(false); setSearchOpen(false) }, [pathname])

  // ⌘K / Ctrl+K jumps to the search bar from anywhere in the workspace.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        input.current?.focus()
        setSearchOpen(true)
      }
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const pages = useMemo<Result[]>(() => groups.flatMap((group) => group.items.map((item) => ({ key: item.href, label: item.label, href: item.href, icon: item.icon, hint: group.label }))), [groups])

  const results = useMemo<Result[]>(() => {
    const text = query.trim().toLowerCase()
    if (!text) return pages
    const matches = pages.filter((page) => page.label.toLowerCase().includes(text) || page.hint?.toLowerCase().includes(text))
    const finds = searches.map((search) => ({ key: search.label, label: `${search.label} “${query.trim()}”`, href: search.href(query.trim()), icon: search.icon, hint: 'Search' }))
    return [...matches, ...finds]
  }, [pages, query, searches])

  useEffect(() => { setActive(0) }, [query])

  const go = (result: Result | undefined) => {
    if (!result) return
    setSearchOpen(false)
    setQuery('')
    input.current?.blur()
    router.push(result.href)
  }

  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((value) => Math.min(results.length - 1, value + 1)) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((value) => Math.max(0, value - 1)) }
    if (event.key === 'Enter') { event.preventDefault(); go(results[active]) }
    if (event.key === 'Escape') { setSearchOpen(false); input.current?.blur() }
  }

  const isCurrent = (href: string) => {
    if (href === brand.href) return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const signOut = async () => {
    setSigningOut(true)
    try { await onSignOut() } catch { setSigningOut(false) }
  }

  const share = meter && meter.total > 0 ? Math.min(1, meter.value / meter.total) : 0

  return (
    <div className={`ga-shell${menuOpen ? ' is-menu-open' : ''}`}>
      <div className="ga-backdrop" aria-hidden="true"><span /><span /><span /></div>
      <div className="ga-scrim" aria-hidden="true" onClick={() => setMenuOpen(false)} />

      <aside className="ga-sidebar" aria-label="Admin navigation">
        <Link className="ga-brand" href={brand.href}>
          <span className="ga-brand-mark" aria-hidden="true">{brand.mark}</span>
          <span><strong>{brand.title}</strong><small>{brand.subtitle}</small></span>
        </Link>
        <nav className="ga-nav">
          {groups.map((group) => (
            <div className="ga-nav-group" key={group.label}>
              <p className="ga-nav-label">{group.label}</p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="ga-nav-link"
                  aria-current={!item.external && isCurrent(item.href) ? 'page' : undefined}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noreferrer' : undefined}
                >
                  <GaIcon name={item.icon} />
                  <span>{item.label}</span>
                  {item.count ? <span className="ga-nav-count" aria-label={`${item.count} waiting`}>{item.count}</span> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        {meter && (
          <div className="ga-plan">
            <div><strong>{meter.label}</strong><span>{meter.caption}</span></div>
            <i role="progressbar" aria-valuemin={0} aria-valuemax={meter.total} aria-valuenow={meter.value} aria-label={meter.label}><b style={{ width: `${Math.max(2, share * 100)}%` }} /></i>
          </div>
        )}
        <Link className="ga-rail-link" href={site.href}><GaIcon name="external" /> {site.label}</Link>
      </aside>

      <div className="ga-workspace">
        <header className="ga-topbar">
          <button type="button" className="ga-icon-button ga-menu-button" aria-label="Open the admin menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <GaIcon name="menu" />
          </button>
          <div className="ga-search" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setSearchOpen(false) }}>
            <GaIcon name="search" />
            <input
              ref={input}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setSearchOpen(true) }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={onSearchKey}
              placeholder={searchPlaceholder}
              aria-label="Search the admin workspace"
              role="combobox"
              aria-expanded={searchOpen}
              aria-controls="ga-search-results"
              aria-autocomplete="list"
            />
            <kbd aria-hidden="true">⌘K</kbd>
            {searchOpen && (
              <div className="ga-search-results" id="ga-search-results" role="listbox">
                {results.length === 0 && <p className="ga-search-empty">Nothing matches “{query}”.</p>}
                {results.map((result, index) => (
                  <Link
                    key={result.key}
                    href={result.href}
                    role="option"
                    aria-selected={index === active}
                    data-active={index === active}
                    onMouseEnter={() => setActive(index)}
                    onClick={(event) => { event.preventDefault(); go(result) }}
                  >
                    <GaIcon name={result.icon} />
                    <span>{result.label}</span>
                    {result.hint && <small>{result.hint}</small>}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="ga-topbar-actions">
            <Link className="ga-icon-button is-hide-small" href={site.href} aria-label={site.label} title={site.label}><GaIcon name="globe" /></Link>
            {alerts && (
              <Link className="ga-icon-button is-light" href={alerts.href} aria-label={alerts.label} title={alerts.label}>
                <GaIcon name="bell" />
                {alerts.count > 0 && <span className="ga-dot">{alerts.count > 99 ? '99+' : alerts.count}</span>}
              </Link>
            )}
            <Link className="ga-user" href={user.href ?? '#'} aria-label={`${user.name}, ${user.role}. Edit profile`}>
              <span className="ga-avatar">{user.avatar ? <img src={user.avatar} alt="" /> : initials(user.name)}</span>
              <div><strong>{user.name}</strong><small>{user.role}</small></div>
            </Link>
            <button type="button" className="ga-icon-button" onClick={() => void signOut()} disabled={signingOut} aria-label="Sign out" title="Sign out">
              <GaIcon name="logout" />
            </button>
          </div>
        </header>
        <main className="ga-panel" id="admin-main">{children}</main>
      </div>
    </div>
  )
}
