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
    const accountType = body.accountType === 'writer' ? 'writer' : body.accountType === 'reader' ? 'reader' : ''
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
    const adminPassword = process.env.ADMIN_PASSWORD

    const pool = getPool()

    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      if (adminPassword.length < 12) {
        console.error('Admin bootstrap refused: ADMIN_PASSWORD must be at least 12 characters.')
        return NextResponse.json({ error: 'Administrator account is not configured securely.' }, { status: 500 })
      }
      const passwordHash = await bcrypt.hash(adminPassword, 12)
      const { rows } = await pool.query(
        `INSERT INTO profiles (name, email, password_hash, role)
         VALUES ('Administrator', $1, $2, 'super')
         ON CONFLICT (lower(email)) DO UPDATE
         SET role = 'super', password_hash = EXCLUDED.password_hash, account_type = 'reader', writer_status = 'disabled'
         RETURNING id, name, email, role, perms, account_type, writer_status`,
        [adminEmail, passwordHash]
      )
      await createSession(rows[0].id)
      return NextResponse.json({ user: rows[0] })
    }

    if (!accountType) {
      return NextResponse.json({ error: 'Choose Reader or Writer to continue.' }, { status: 400 })
    }

    const { rows } = await pool.query(
      'SELECT id, name, email, role, perms, password_hash, account_type, writer_status FROM profiles WHERE lower(email) = $1',
      [email]
    )
    if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }
    if (rows[0].role === 'user' && rows[0].account_type !== accountType) {
      return NextResponse.json({
        error: `This account is set up as a ${rows[0].account_type}. Choose ${rows[0].account_type} to continue.`
      }, { status: 403 })
    }

    await createSession(rows[0].id)
    const { password_hash: _passwordHash, ...user } = rows[0]
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Login failed:', error)
    return NextResponse.json({ error: 'Unable to log in.' }, { status: 500 })
  }
}
