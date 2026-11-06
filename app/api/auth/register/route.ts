import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { createSession } from '@/lib/session'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const accountType = body.accountType === 'writer' ? 'writer' : body.accountType === 'reader' ? 'reader' : ''

    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || !accountType) {
      return NextResponse.json({ error: 'Enter a name, valid email, password of at least 8 characters, and choose Reader or Writer.' }, { status: 400 })
    }

    if (email === process.env.ADMIN_EMAIL?.trim().toLowerCase()) {
      return NextResponse.json({ error: 'This email is reserved for the administrator account.' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const { rows } = await getPool().query(
      `INSERT INTO profiles (name, email, password_hash, account_type, writer_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, perms, account_type, writer_status`,
      [name, email, passwordHash, accountType, accountType === 'writer' ? 'pending' : 'disabled']
    )
    await createSession(rows[0].id)
    return NextResponse.json({ user: rows[0] }, { status: 201 })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 })
    }
    console.error('Registration failed:', error)
    return NextResponse.json({ error: 'Unable to create account.' }, { status: 500 })
  }
}
