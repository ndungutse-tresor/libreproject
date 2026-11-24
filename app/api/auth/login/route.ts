import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { createSession } from '@/lib/session'
import { signInBlock } from '@/lib/email-access'

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
        `INSERT INTO profiles (name, email, password_hash, role, email_verified_at)
         VALUES ('Administrator', $1, $2, 'super', now())
         ON CONFLICT (lower(email)) DO UPDATE
         SET role = 'super', password_hash = EXCLUDED.password_hash, account_type = 'reader', writer_status = 'disabled',
             email_verified_at = coalesce(profiles.email_verified_at, now())
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
      `SELECT id, name, email, role, perms, password_hash, account_type, writer_status, email_verified_at, email_approved_at
       FROM profiles WHERE lower(email) = $1`,
      [email]
    )
    if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }
    // Only checked after the password, so nobody can probe which addresses have accounts.
    const blocked = signInBlock(rows[0])
    if (blocked) return NextResponse.json({ error: blocked.message, code: blocked.code }, { status: 403 })
    if (rows[0].role === 'user' && rows[0].account_type !== accountType) {
      return NextResponse.json({
        error: `This account is set up as a ${rows[0].account_type}. Choose ${rows[0].account_type} to continue.`
      }, { status: 403 })
    }

    await createSession(rows[0].id)
    const { password_hash: _passwordHash, email_verified_at: _verified, email_approved_at: _approved, ...user } = rows[0]
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Login failed:', error)
    return NextResponse.json({ error: 'Unable to log in.' }, { status: 500 })
  }
}
