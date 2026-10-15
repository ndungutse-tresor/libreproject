import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { createSession } from '@/lib/session'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const { rows } = await getPool().query(
      'SELECT id, name, email, role, password_hash FROM profiles WHERE email = $1',
      [email]
    )
    if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    await createSession(rows[0].id)
    const { password_hash: _passwordHash, ...user } = rows[0]
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Login failed:', error)
    return NextResponse.json({ error: 'Unable to log in.' }, { status: 500 })
  }
}
