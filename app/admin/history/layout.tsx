import type { ReactNode } from 'react'
import { isSuperAdmin } from '@/lib/admin'
import AdminAccessDenied from '../AdminAccessDenied'

export default async function AdminHistoryLayout({ children }: { children: ReactNode }) {
  if (!(await isSuperAdmin())) return <AdminAccessDenied />
  return children
}
