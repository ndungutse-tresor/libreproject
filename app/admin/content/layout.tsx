import type { ReactNode } from 'react'
import AdminPermissionGate from '../AdminPermissionGate'

export default function AdminContentLayout({ children }: { children: ReactNode }) {
  return <AdminPermissionGate permission="content">{children}</AdminPermissionGate>
}
