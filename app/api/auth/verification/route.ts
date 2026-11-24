import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { isGmail } from '@/lib/email-access'
import { canSendMail } from '@/lib/mailer'
import { secondsUntilResend, sendVerificationEmail } from '@/lib/verification'

export const runtime = 'nodejs'

const DONE = 'If that account is waiting to be confirmed, a new link is on its way. Check your Gmail, including Spam.'

/** Sends a fresh confirmation link. The answer is the same whether or not the account exists. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!isGmail(email)) return NextResponse.json({ error: 'Enter the Gmail address you signed up with.' }, { status: 400 })
    if (!canSendMail()) return NextResponse.json({ error: 'Email confirmation is not set up yet. Please try again later.' }, { status: 503 })

    const { rows } = await getPool().query<{ id: string; name: string; email: string }>(
      `SELECT id::text, name, email FROM profiles
       WHERE lower(email) = $1 AND email_verified_at IS NULL AND email_approved_at IS NULL AND role = 'user'`,
      [email]
    )
    const profile = rows[0]
    if (profile) {
      const wait = await secondsUntilResend(profile.id)
      if (wait > 0) {
        return NextResponse.json({ error: `A link was sent a moment ago. You can ask for another in ${wait} seconds.`, wait }, { status: 429 })
      }
      await sendVerificationEmail(profile)
    }
    return NextResponse.json({ message: DONE })
  } catch (error) {
    console.error('Unable to resend the confirmation email:', error)
    return NextResponse.json({ error: 'Unable to send a new link right now. Try again in a few minutes.' }, { status: 500 })
  }
}
