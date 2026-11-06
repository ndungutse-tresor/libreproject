import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export const runtime = 'nodejs'

function safeFileName(value: string) {
  return value.replace(/[\r\n"\\]/g, '_').slice(0, 180) || 'download'
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const id = searchParams.get('id')
  const kind = searchParams.get('kind')
  if (!id || (kind !== 'book' && kind !== 'post')) {
    return NextResponse.json({ error: 'Choose a published file.' }, { status: 400 })
  }

  try {
    const query = kind === 'book'
      ? `SELECT submissions.file_data, submissions.file_name, submissions.mime_type
         FROM books
         JOIN content_submissions AS submissions ON submissions.id = books.source_submission_id
         WHERE books.id = $1 AND books.is_published = true`
      : `SELECT submissions.file_data, submissions.file_name, submissions.mime_type
         FROM content_posts AS posts
         JOIN content_submissions AS submissions ON submissions.id = posts.source_submission_id
         WHERE posts.id = $1 AND posts.is_published = true`
    const { rows } = await getPool().query(query, [id])
    const file = rows[0]
    if (!file) return NextResponse.json({ error: 'Published file not found.' }, { status: 404 })

    const disposition = file.mime_type === 'application/epub+zip' ? 'attachment' : 'inline'
    return new Response(new Uint8Array(file.file_data), {
      headers: {
        'Content-Type': file.mime_type,
        'Content-Length': String(file.file_data.length),
        'Content-Disposition': `${disposition}; filename="${safeFileName(file.file_name)}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    console.error('Unable to serve published content file:', error)
    return NextResponse.json({ error: 'Unable to load this file.' }, { status: 500 })
  }
}
