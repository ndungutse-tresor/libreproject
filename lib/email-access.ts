/**
 * Who may sign in to Libra.
 *
 * New accounts need a Gmail address and must confirm it from the link we email
 * them. Any other address only gets in when an administrator approved it or
 * created the account. Administrators themselves are always let in.
 */

const GMAIL = /^[^\s@]+@(gmail|googlemail)\.com$/i

export const isGmail = (email: string) => GMAIL.test(email.trim())

export const GMAIL_ONLY_MESSAGE = 'Libra accounts use Gmail. Enter an address that ends in @gmail.com.'

export type EmailAccess = {
  role: string
  email: string
  email_verified_at: Date | string | null
  email_approved_at: Date | string | null
}

/** Why this account cannot sign in yet, or null when it can. */
export function signInBlock(profile: EmailAccess): { code: 'not_gmail' | 'unverified'; message: string } | null {
  if (profile.role === 'admin' || profile.role === 'super' || profile.email_approved_at) return null
  if (!isGmail(profile.email)) {
    return { code: 'not_gmail', message: 'This address is not a Gmail address. An administrator needs to approve it before you can sign in.' }
  }
  if (!profile.email_verified_at) {
    return { code: 'unverified', message: 'Confirm your email first: open the link we sent to your Gmail.' }
  }
  return null
}

/** The same rule as signInBlock, as SQL, for checking a session against the database. */
export const CAN_SIGN_IN_SQL = `(role IN ('admin', 'super')
  OR email_approved_at IS NOT NULL
  OR (lower(email) ~ '@(gmail|googlemail)\\.com$' AND email_verified_at IS NOT NULL))`
