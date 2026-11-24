import nodemailer, { type Transporter } from 'nodemailer'

/**
 * Sends Libra's emails through a Gmail account with an app password
 * (GMAIL_USER and GMAIL_APP_PASSWORD). In development without them, the message
 * is printed to the server console instead, so the links can still be followed.
 */

let transport: Transporter | null = null

export const mailConfigured = () => Boolean(process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim())

/** Production must be able to send verification emails before anyone can sign up. */
export const canSendMail = () => mailConfigured() || process.env.NODE_ENV !== 'production'

export async function sendMail(message: { to: string; subject: string; text: string; html: string }) {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV === 'production') throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD are not configured.')
    console.info(`[mail] Email is not configured; this message was not sent.\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`)
    return
  }
  const user = process.env.GMAIL_USER!.trim()
  transport ??= nodemailer.createTransport({
    service: 'gmail',
    // Google shows app passwords in groups of four; the spaces are not part of it.
    auth: { user, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, '') }
  })
  await transport.sendMail({ from: { name: process.env.MAIL_FROM_NAME?.trim() || 'Libra', address: user }, ...message })
}

export function siteUrl() {
  return (process.env.SITE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
}
