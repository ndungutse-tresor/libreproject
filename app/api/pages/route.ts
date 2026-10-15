import { NextResponse } from 'next/server'
import { books } from '../../libra-data'
import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const bookId = Number(searchParams.get('bookId'))
  const pageNo = Number(searchParams.get('page'))
  const consume = searchParams.get('consume') === 'true'
  if (!Number.isSafeInteger(bookId) || !Number.isSafeInteger(pageNo) || pageNo < 1) {
    return NextResponse.json({ error: 'Invalid book or page.' }, { status: 400 })
  }

  const book = books.find((entry) => entry.id === bookId)
  if (!book) return NextResponse.json({ error: 'Book not found.' }, { status: 404 })
  if (pageNo > book.pages.length) return NextResponse.json({ error: 'Page not found.' }, { status: 404 })

  const freePages = Math.ceil(book.pages.length / 2)
  let readingSeconds: number | null = null
  let premium = false
  if (pageNo > freePages) {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Sign in to unlock this page.' }, { status: 401 })

    try {
      const pool = getPool()
      if (consume) {
        const { rows } = await pool.query(
          `UPDATE profiles
           SET reading_seconds = GREATEST(0, reading_seconds - 15)
           WHERE id = $1 AND reading_seconds > 0
           AND (premium_until IS NULL OR premium_until <= now())
           RETURNING reading_seconds`,
          [userId]
        )
        if (rows[0]) readingSeconds = rows[0].reading_seconds
        else {
          const { rows: profileRows } = await pool.query(
            `SELECT reading_seconds, premium_until > now() AS premium
             FROM profiles WHERE id = $1`,
            [userId]
          )
          if (!profileRows[0]) return NextResponse.json({ error: 'Account not found.' }, { status: 401 })
          premium = profileRows[0].premium
          readingSeconds = profileRows[0].reading_seconds
          if (!premium && Number(readingSeconds) <= 0) return NextResponse.json({ error: 'No reading time remains.' }, { status: 403 })
        }
      } else {
        const { rows } = await pool.query(
          `SELECT reading_seconds, premium_until > now() AS premium
           FROM profiles WHERE id = $1`,
          [userId]
        )
        if (!rows[0]) return NextResponse.json({ error: 'Account not found.' }, { status: 401 })
        readingSeconds = rows[0].reading_seconds
        premium = rows[0].premium
        if (!premium && Number(readingSeconds) <= 0) return NextResponse.json({ error: 'No reading time remains.' }, { status: 403 })
      }
    } catch (error) {
      console.error('Unable to check reading access:', error)
      return NextResponse.json({ error: 'Unable to check reading access.' }, { status: 500 })
    }
  }

  return NextResponse.json({
    book: { id: book.id, title: book.title, author: book.author },
    page: { number: pageNo, content: book.pages[pageNo - 1] },
    access: { freePages, readingSeconds, premium }
  })
}
