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

    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return NextResponse.json({ error: 'Enter a name, valid email, and password of at least 8 characters.' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const { rows } = await getPool().query(
      'INSERT INTO profiles (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, role',
      [name, email, passwordHash]
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
