import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { rows } = await getPool().query(
      `SELECT title, author
       FROM books
       WHERE is_published = true
       ORDER BY created_at DESC
       LIMIT 20`
    )
    return NextResponse.json({ books: rows })
  } catch (error) {
    console.error('Unable to load book titles for auth page artwork:', error)
    return NextResponse.json({ error: 'Unable to load published book titles.' }, { status: 500 })
  }
}
