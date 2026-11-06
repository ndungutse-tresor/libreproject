import type { ReactNode } from 'react'
import AdminPermissionGate from '../AdminPermissionGate'

export default function AdminOrdersLayout({ children }: { children: ReactNode }) {
  return <AdminPermissionGate permission="payments">{children}</AdminPermissionGate>
}
