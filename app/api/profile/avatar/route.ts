import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export const runtime = 'nodejs'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024

function matchesImageSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === 'image/png') {
    return bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  }
  if (mimeType === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  if (mimeType === 'image/webp') {
    return bytes.length >= 12 &&
      String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === 'RIFF' &&
      String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === 'WEBP'
  }
  return false
}

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Sign in to view your profile picture.' }, { status: 401 })

  try {
    const { rows } = await getPool().query(
      'SELECT profile_image_data, profile_image_mime_type FROM profiles WHERE id = $1',
      [userId]
    )
    if (!rows[0]?.profile_image_data || !rows[0]?.profile_image_mime_type) {
      return new Response(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })
    }
    return new Response(new Uint8Array(rows[0].profile_image_data), {
      headers: {
        'Content-Type': rows[0].profile_image_mime_type,
        'Content-Length': String(rows[0].profile_image_data.length),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    console.error('Unable to load profile picture:', error)
    return NextResponse.json({ error: 'Unable to load your profile picture.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Sign in to upload a profile picture.' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('avatar')
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 })
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return NextResponse.json({ error: 'Profile pictures must be 2 MB or smaller.' }, { status: 400 })
    }
    const mimeType = file.type.toLowerCase()
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!matchesImageSignature(bytes, mimeType)) {
      return NextResponse.json({ error: 'Use a valid JPEG, PNG, or WebP image.' }, { status: 400 })
    }

    const { rowCount } = await getPool().query(
      `UPDATE profiles SET profile_image_data = $1, profile_image_mime_type = $2
       WHERE id = $3`,
      [Buffer.from(bytes), mimeType, userId]
    )
    if (!rowCount) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Unable to update profile picture:', error)
    return NextResponse.json({ error: 'Unable to upload your profile picture.' }, { status: 500 })
  }
}

export async function DELETE() {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Sign in to remove your profile picture.' }, { status: 401 })

  try {
    const { rowCount } = await getPool().query(
      `UPDATE profiles SET profile_image_data = NULL, profile_image_mime_type = NULL
       WHERE id = $1`,
      [userId]
    )
    if (!rowCount) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Unable to remove profile picture:', error)
    return NextResponse.json({ error: 'Unable to remove your profile picture.' }, { status: 500 })
  }
}
