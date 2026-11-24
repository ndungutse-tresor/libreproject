import { createHash, randomBytes } from 'node:crypto'
import { getPool } from './db'
import { sendMail, siteUrl } from './mailer'

/** Email confirmation links: a random token whose hash is kept for 24 hours. */

const LINK_LIFETIME_HOURS = 24
/** A new link can be asked for once a minute. */
export const RESEND_WAIT_SECONDS = 60

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] as string)

/** Makes a new confirmation link for the account and emails it. */
export async function sendVerificationEmail(profile: { id: string; name: string; email: string }) {
  const token = randomBytes(32).toString('base64url')
  await getPool().query(
    `INSERT INTO email_verifications (token_hash, profile_id, expires_at)
     VALUES ($1, $2, now() + make_interval(hours => $3))`,
    [hashToken(token), profile.id, LINK_LIFETIME_HOURS]
  )
  const link = `${siteUrl()}/api/auth/verify?token=${encodeURIComponent(token)}`
  const firstName = profile.name.trim().split(/\s+/)[0] || 'there'
  await sendMail({
    to: profile.email,
    subject: 'Confirm your email for Libra',
    text: [
      `Hi ${firstName},`,
      '',
      'Welcome to Libra. Please confirm this is your email address by opening the link below:',
      '',
      link,
      '',
      `The link works for ${LINK_LIFETIME_HOURS} hours. If you did not create a Libra account, you can ignore this email.`,
      '',
      'Libra'
    ].join('\n'),
    html: `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#f4f4f2;font-family:Georgia,serif;color:#111">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e5e5e2;border-radius:14px;padding:32px">
    <p style="margin:0 0 18px;font:700 20px/1 Georgia,serif;letter-spacing:0.02em">libra.</p>
    <h1 style="margin:0 0 12px;font:600 22px/1.3 Georgia,serif">Confirm your email</h1>
    <p style="margin:0 0 22px;font:15px/1.6 Arial,sans-serif;color:#444">Hi ${escapeHtml(firstName)}, welcome to Libra. Confirm that this is your email address to start reading.</p>
    <p style="margin:0 0 24px"><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#111;color:#fff;font:600 14px Arial,sans-serif;text-decoration:none">Confirm my email</a></p>
    <p style="margin:0 0 8px;font:13px/1.6 Arial,sans-serif;color:#777">Or paste this link into your browser:<br><a href="${escapeHtml(link)}" style="color:#555;word-break:break-all">${escapeHtml(link)}</a></p>
    <p style="margin:18px 0 0;font:13px/1.6 Arial,sans-serif;color:#777">The link works for ${LINK_LIFETIME_HOURS} hours. If you did not create a Libra account, you can ignore this email.</p>
  </div>
</body></html>`
  })
}

/** Confirms the address behind a link. Returns the account, or null if the link is unknown or expired. */
export async function confirmEmail(token: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null
  const { rows } = await getPool().query<{ id: string; email: string; account_type: string; role: string }>(
    `WITH used AS (
       DELETE FROM email_verifications
       WHERE token_hash = $1 AND expires_at > now()
       RETURNING profile_id
     )
     UPDATE profiles SET email_verified_at = coalesce(email_verified_at, now())
     FROM used WHERE profiles.id = used.profile_id
     RETURNING profiles.id::text, profiles.email, profiles.account_type, profiles.role`,
    [hashToken(token)]
  )
  if (rows[0]) {
    // Older links for the same account are no longer needed.
    await getPool().query('DELETE FROM email_verifications WHERE profile_id = $1 OR expires_at < now()', [rows[0].id])
  }
  return rows[0] ?? null
}

/** Seconds until another link may be sent for this account (0 when it may be sent now). */
export async function secondsUntilResend(profileId: string) {
  const { rows } = await getPool().query<{ wait: number }>(
    `SELECT greatest(0, ceil(extract(epoch FROM (max(created_at) + make_interval(secs => $2) - now()))))::int AS wait
     FROM email_verifications WHERE profile_id = $1`,
    [profileId, RESEND_WAIT_SECONDS]
  )
  return rows[0]?.wait ?? 0
}
