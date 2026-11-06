import type { PoolClient } from 'pg'
import { NextResponse } from 'next/server'
import { writeAdminAudit } from '@/lib/admin-audit'
import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export const runtime = 'nodejs'

const allowedGenders = new Set(['male', 'female', 'prefer_not_to_say'])

type ProfileState = {
  id: string
  name: string
  gender: string | null
  age: number | null
  bio: string
  favorite_genres: string[]
}

function parseGenres(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 8 ||
      value.some((genre) => typeof genre !== 'string' || genre.trim().length > 32)) {
    return null
  }
  const genres = value.map((genre: string) => genre.trim()).filter(Boolean)
  return genres.filter((genre, index) => genres.indexOf(genre) === index)
}

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Sign in to view your profile.' }, { status: 401 })

  try {
    const { rows } = await getPool().query(
      `SELECT id::text, name, email, role, account_type, writer_status, gender, age,
              bio, favorite_genres, profile_image_data IS NOT NULL AS has_profile_image
       FROM profiles WHERE id = $1`,
      [userId]
    )
    if (!rows[0]) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
    return NextResponse.json({ profile: rows[0] }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Unable to load account profile:', error)
    return NextResponse.json({ error: 'Unable to load your profile.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Sign in to update your profile.' }, { status: 401 })

  let client: PoolClient | undefined
  let transactionOpen = false
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid profile update request.' }, { status: 400 })
    }
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const gender = body.gender === '' || body.gender === null ? null : body.gender
    const age = body.age === '' || body.age === null ? null : Number(body.age)
    const bio = typeof body.bio === 'string' ? body.bio.trim() : null
    const favoriteGenres = parseGenres(body.favoriteGenres)

    if (!name || name.length > 100) {
      return NextResponse.json({ error: 'Enter a name between 1 and 100 characters.' }, { status: 400 })
    }
    if (gender !== null && (typeof gender !== 'string' || !allowedGenders.has(gender))) {
      return NextResponse.json({ error: 'Choose a valid gender option.' }, { status: 400 })
    }
    if (age !== null && (!Number.isInteger(age) || age < 1 || age > 120)) {
      return NextResponse.json({ error: 'Enter an age between 1 and 120, or leave it blank.' }, { status: 400 })
    }
    if (bio === null || bio.length > 500) {
      return NextResponse.json({ error: 'Your bio must be 500 characters or fewer.' }, { status: 400 })
    }
    if (favoriteGenres === null) {
      return NextResponse.json({ error: 'Choose up to 8 favorite genres, each no longer than 32 characters.' }, { status: 400 })
    }

    client = await getPool().connect()
    await client.query('BEGIN')
    transactionOpen = true
    const { rows: previousRows } = await client.query(
      `SELECT id::text, name, gender, age, bio, favorite_genres, role
       FROM profiles WHERE id = $1 FOR UPDATE`,
      [userId]
    )
    const previous = previousRows[0]
    if (!previous) {
      await client.query('ROLLBACK')
      transactionOpen = false
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
    }

    const { rows } = await client.query(
      `UPDATE profiles
       SET name = $1, gender = $2, age = $3, bio = $4, favorite_genres = $5::text[]
       WHERE id = $6
       RETURNING id::text, name, email, role, account_type, writer_status, gender, age,
                 bio, favorite_genres, profile_image_data IS NOT NULL AS has_profile_image`,
      [name, gender, age, bio, favoriteGenres, userId]
    )

    if (previous.role === 'admin' || previous.role === 'super') {
      const beforeState: ProfileState = {
        id: previous.id,
        name: previous.name,
        gender: previous.gender,
        age: previous.age,
        bio: previous.bio,
        favorite_genres: previous.favorite_genres
      }
      const updated = rows[0]
      const afterState: ProfileState = {
        id: updated.id,
        name: updated.name,
        gender: updated.gender,
        age: updated.age,
        bio: updated.bio,
        favorite_genres: updated.favorite_genres
      }
      await writeAdminAudit(client, {
        actorId: userId,
        action: 'administrator_profile_updated',
        entityType: 'profile',
        entityId: userId,
        targetName: `${updated.name} (${updated.email})`,
        summary: `Updated profile details for administrator ${updated.name}.`,
        beforeState,
        afterState,
        canRestore: true
      })
    }

    await client.query('COMMIT')
    transactionOpen = false
    return NextResponse.json({ profile: rows[0] }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (transactionOpen && client) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        console.error('Unable to roll back profile update:', rollbackError)
      }
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid profile update request.' }, { status: 400 })
    }
    console.error('Unable to update account profile:', error)
    return NextResponse.json({ error: 'Unable to update your profile.' }, { status: 500 })
  } finally {
    client?.release()
  }
}
