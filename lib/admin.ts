import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function hasUserAdminAccess() {
  const userId = await getSessionUserId()
  if (!userId) return false

  const { rows } = await getPool().query(
    'SELECT role, perms FROM profiles WHERE id = $1',
    [userId]
  )
  const profile = rows[0]
  return Boolean(profile && (profile.role === 'super' || (profile.role === 'admin' && profile.perms.includes('users'))))
}

export async function isSuperAdmin() {
  const userId = await getSessionUserId()
  if (!userId) return false

  const { rows } = await getPool().query(
    'SELECT role FROM profiles WHERE id = $1',
    [userId]
  )
  return rows[0]?.role === 'super'
}

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

export async function hasContentAdminAccess() {
  const userId = await getSessionUserId()
  if (!userId) return false

  const { rows } = await getPool().query(
    'SELECT role, perms FROM profiles WHERE id = $1',
    [userId]
  )
  const profile = rows[0]
  return Boolean(profile && (profile.role === 'super' || (profile.role === 'admin' && profile.perms.includes('content'))))
}
