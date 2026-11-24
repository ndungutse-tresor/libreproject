import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { getPool } from './db'
import { CAN_SIGN_IN_SQL } from './email-access'

const COOKIE_NAME = 'libra_session'
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7

function signingKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be configured with at least 32 characters')
  }
  return new TextEncoder().encode(secret)
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(signingKey())

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS
  })
}

export async function getSessionUserId() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  let userId: string | null = null
  try {
    const { payload } = await jwtVerify(token, signingKey())
    userId = typeof payload.userId === 'string' ? payload.userId : null
  } catch {
    return null
  }
  return userId && (await mayStillSignIn(userId)) ? userId : null
}

/**
 * A session only counts while its account may still sign in: an administrator
 * can withdraw approval for an address that is not Gmail, and that takes effect
 * at once. Checked once per request.
 */
const mayStillSignIn = cache(async (userId: string) => {
  try {
    const { rows } = await getPool().query(`SELECT 1 FROM profiles WHERE id = $1 AND ${CAN_SIGN_IN_SQL}`, [userId])
    return rows.length > 0
  } catch (error) {
    console.error('Unable to check the session account:', error)
    return false
  }
})

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  })
}
