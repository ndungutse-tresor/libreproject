import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export const runtime = 'nodejs'

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ user: null })

  try {
    const { rows } = await getPool().query(
      'SELECT id, name, email, role, perms, reading_seconds, premium_until, account_type, writer_status FROM profiles WHERE id = $1',
      [userId]
    )
    return NextResponse.json({ user: rows[0] ?? null })
  } catch (error) {
    console.error('Unable to load session user:', error)
    return NextResponse.json({ error: 'Unable to load account.' }, { status: 500 })
  }
}
