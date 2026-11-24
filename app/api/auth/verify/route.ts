import { NextResponse } from 'next/server'
import { siteUrl } from '@/lib/mailer'
import { confirmEmail } from '@/lib/verification'

export const runtime = 'nodejs'

/** The link in the confirmation email: confirms the address, then sends the visitor to log in. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  try {
    const account = await confirmEmail(token)
    return NextResponse.redirect(`${siteUrl()}/login?verified=${account ? '1' : 'expired'}`, 303)
  } catch (error) {
    console.error('Unable to confirm an email address:', error)
    return NextResponse.redirect(`${siteUrl()}/login?verified=error`, 303)
  }
}
