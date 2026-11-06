import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const pool = getPool()
    const [books, posts] = await Promise.all([
      pool.query(
        `SELECT books.id::text AS id, books.title, books.author, books.description,
                submissions.mime_type, submissions.file_name
         FROM books
         JOIN content_submissions AS submissions ON submissions.id = books.source_submission_id
         WHERE books.is_published = true
         ORDER BY books.created_at DESC`
      ),
      pool.query(
        `SELECT posts.id::text AS id, posts.kind, posts.title, posts.body, posts.attribution,
                submissions.file_name, submissions.mime_type
         FROM content_posts AS posts
         JOIN content_submissions AS submissions ON submissions.id = posts.source_submission_id
         WHERE posts.is_published = true
         ORDER BY posts.created_at DESC`
      )
    ])

    return NextResponse.json({
      books: books.rows.map((book) => ({
        ...book,
        fileUrl: `/api/content/files?id=${encodeURIComponent(book.id)}&kind=book`
      })),
      posts: posts.rows.map((post) => ({
        ...post,
        imageUrl: post.file_name ? `/api/content/files?id=${encodeURIComponent(post.id)}&kind=post` : null
      }))
    })
  } catch (error) {
    console.error('Unable to load published library content:', error)
    return NextResponse.json({ error: 'Unable to load published books and posts.' }, { status: 500 })
  }
}
