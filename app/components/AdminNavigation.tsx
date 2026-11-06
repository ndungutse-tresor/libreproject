'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type AdminNavigationProps = {
  canManageUsers: boolean
  canManagePayments: boolean
  canManageContent: boolean
  isSuperAdmin: boolean
}

const links = [
  { href: '/admin', label: 'Super overview', icon: '▦', permission: 'super' },
  { href: '/admin/home', label: 'My overview', icon: '▦', permission: 'delegated' },
  { href: '/admin/users', label: 'Members', icon: '♙', permission: 'users' },
  { href: '/admin/orders', label: 'Orders', icon: '▤', permission: 'payments' },
  { href: '/admin/content', label: 'Publishing', icon: '✎', permission: 'content' },
  { href: '/admin/payments', label: 'Platform settings', icon: '◇', permission: 'payments' },
  { href: '/admin/history', label: 'Admin history', icon: '◷', permission: 'super' }
] as const

export default function AdminNavigation({
  canManageUsers,
  canManagePayments,
  canManageContent,
  isSuperAdmin
}: AdminNavigationProps) {
  const pathname = usePathname()
  const permissions = {
    users: canManageUsers,
    payments: canManagePayments,
    content: canManageContent,
    super: isSuperAdmin,
    delegated: !isSuperAdmin
  }

  return (
    <nav className="admin-nav" aria-label="Admin navigation">
      {links.map((link) => {
        if (link.permission && !permissions[link.permission]) return null

        const isCurrent = pathname === link.href

        return (
          <Link
            key={link.href}
            href={link.href}
            className="admin-nav-link"
            aria-current={isCurrent ? 'page' : undefined}
          >
            <span className="admin-nav-icon" aria-hidden="true">{link.icon}</span>
            <span>{link.label}</span>
            {isCurrent && <span className="admin-nav-indicator" aria-hidden="true" />}
          </Link>
        )
      })}
    </nav>
  )
}
