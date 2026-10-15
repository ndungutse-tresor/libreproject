import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function hasPaymentAdminAccess() {
  const userId = await getSessionUserId()
  if (!userId) return false

  const { rows } = await getPool().query(
    `SELECT role, perms FROM profiles WHERE id = $1`,
    [userId]
  )
  const profile = rows[0]
  return Boolean(profile && (profile.role === 'super' || (profile.role === 'admin' && profile.perms.includes('payments'))))
}
