import type { ReactNode } from 'react'
import AdminPermissionGate from '../AdminPermissionGate'

export default function AdminUsersLayout({ children }: { children: ReactNode }) {
  return <AdminPermissionGate permission="users">{children}</AdminPermissionGate>
}
