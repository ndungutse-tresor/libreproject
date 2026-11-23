'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import AdminShell, { type ShellNavGroup, type ShellSearch } from './AdminShell'

type Props = {
  isSuper: boolean
  can: { users: boolean; payments: boolean; content: boolean }
  counts: { pendingWriters: number; pendingOrders: number; pendingSubmissions: number }
  meter: { premium: number; members: number }
  user: { name: string; role: string; hasImage: boolean }
  children: ReactNode
}

/** Libra's admin frame: which pages this administrator may open, and what is waiting on each. */
export default function LibraAdminShell({ isSuper, can, counts, meter, user, children }: Props) {
  const router = useRouter()

  const groups: ShellNavGroup[] = [
    { label: 'Dashboard', items: [isSuper ? { href: '/admin', label: 'Overview', icon: 'home' } : { href: '/admin/home', label: 'My overview', icon: 'home' }] },
    {
      label: 'People',
      items: can.users ? [{ href: '/admin/users', label: 'Members', icon: 'users', count: counts.pendingWriters }] : []
    },
    {
      label: 'Business',
      items: [
        ...(can.payments ? [{ href: '/admin/orders', label: 'Orders', icon: 'receipt' as const, count: counts.pendingOrders }] : []),
        ...(can.content ? [{ href: '/admin/content', label: 'Publishing', icon: 'review' as const, count: counts.pendingSubmissions }] : []),
        ...(can.payments ? [{ href: '/admin/payments', label: 'Platform settings', icon: 'card' as const }] : [])
      ]
    },
    {
      label: 'System',
      items: [
        ...(isSuper ? [{ href: '/admin/history', label: 'Admin history', icon: 'history' as const }] : []),
        { href: '/profile', label: 'My profile', icon: 'user' as const }
      ]
    }
  ].filter((group) => group.items.length > 0)

  const searches: ShellSearch[] = [
    ...(can.users ? [{ label: 'Find members matching', icon: 'users' as const, href: (q: string) => `/admin/users?q=${encodeURIComponent(q)}` }] : []),
    ...(can.payments ? [{ label: 'Find orders matching', icon: 'receipt' as const, href: (q: string) => `/admin/orders?q=${encodeURIComponent(q)}` }] : [])
  ]

  const waiting = (can.content ? counts.pendingSubmissions : 0) + (can.users ? counts.pendingWriters : 0)

  return (
    <AdminShell
      brand={{ mark: 'L', title: 'Libra Admin', subtitle: 'Control center', href: isSuper ? '/admin' : '/admin/home' }}
      groups={groups}
      user={{ name: user.name, role: user.role, avatar: user.hasImage ? '/api/profile/avatar' : null, href: '/profile' }}
      meter={{ label: 'Premium readers', value: meter.premium, total: Math.max(meter.members, 1), caption: `${meter.premium} of ${meter.members}` }}
      alerts={{
        count: waiting,
        href: can.content && counts.pendingSubmissions ? '/admin/content' : can.users && counts.pendingWriters ? '/admin/users' : isSuper ? '/admin' : '/admin/home',
        label: waiting ? `${waiting} ${waiting === 1 ? 'thing needs' : 'things need'} your review` : 'Nothing waiting for review'
      }}
      site={{ href: '/', label: 'Open the Libra site' }}
      searches={searches}
      searchPlaceholder="Search pages, members, orders…"
      onSignOut={async () => {
        const response = await fetch('/api/auth/logout', { method: 'POST' })
        if (!response.ok) throw new Error('Unable to sign out.')
        router.push('/login')
        router.refresh()
      }}
    >
      {children}
    </AdminShell>
  )
}
