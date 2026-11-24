import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { GMAIL_ONLY_MESSAGE, isGmail } from '@/lib/email-access'
import { canSendMail } from '@/lib/mailer'
import { sendVerificationEmail } from '@/lib/verification'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const accountType = body.accountType === 'writer' ? 'writer' : body.accountType === 'reader' ? 'reader' : ''

    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 8 || !accountType) {
      return NextResponse.json({ error: 'Enter a name, valid email, password of at least 8 characters, and choose Reader or Writer.' }, { status: 400 })
    }
    if (!isGmail(email)) {
      return NextResponse.json({ error: GMAIL_ONLY_MESSAGE, code: 'not_gmail' }, { status: 400 })
    }
    if (email === process.env.ADMIN_EMAIL?.trim().toLowerCase()) {
      return NextResponse.json({ error: 'This email is reserved for the administrator account.' }, { status: 409 })
    }
    if (!canSendMail()) {
      console.error('Sign-up refused: GMAIL_USER and GMAIL_APP_PASSWORD are not configured, so no confirmation email can be sent.')
      return NextResponse.json({ error: 'Sign-up is paused while email confirmation is being set up. Please try again later.' }, { status: 503 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const { rows } = await getPool().query(
      `INSERT INTO profiles (name, email, password_hash, account_type, writer_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id::text, name, email`,
      [name, email, passwordHash, accountType, accountType === 'writer' ? 'pending' : 'disabled']
    )

    // No session yet: the account opens once the emailed link is followed.
    let sent = true
    try {
      await sendVerificationEmail(rows[0])
    } catch (error) {
      sent = false
      console.error('Unable to send the confirmation email:', error)
    }
    return NextResponse.json({ verify: true, email: rows[0].email, sent }, { status: 201 })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'An account with that email already exists. Log in, or ask for a new confirmation link there.' }, { status: 409 })
    }
    console.error('Registration failed:', error)
    return NextResponse.json({ error: 'Unable to create account.' }, { status: 500 })
  }
}
