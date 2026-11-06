import type { ReactNode } from 'react'
import {
  hasContentAdminAccess,
  hasPaymentAdminAccess,
  hasUserAdminAccess
} from '@/lib/admin'
import AdminAccessDenied from './AdminAccessDenied'

type AdminPermission = 'users' | 'payments' | 'content'

const accessChecks: Record<AdminPermission, () => Promise<boolean>> = {
  users: hasUserAdminAccess,
  payments: hasPaymentAdminAccess,
  content: hasContentAdminAccess
}

export default async function AdminPermissionGate({
  permission,
  children
}: {
  permission: AdminPermission
  children: ReactNode
}) {
  if (!(await accessChecks[permission]())) {
    return <AdminAccessDenied />
  }

  return children
}
