import { NextResponse } from 'next/server'
import { hasContentAdminAccess } from '@/lib/admin'
import { getPool } from '@/lib/db'

export const runtime = 'nodejs'

function safeFileName(value: string) {
  return value.replace(/[\r\n"\\]/g, '_').slice(0, 180) || 'submission'
}

export async function GET(request: Request) {
  if (!(await hasContentAdminAccess())) {
    return NextResponse.json({ error: 'You do not have permission to review submissions.' }, { status: 403 })
  }

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Choose a submission file.' }, { status: 400 })

  try {
    const { rows } = await getPool().query(
      'SELECT file_data, file_name, mime_type FROM content_submissions WHERE id = $1 AND file_data IS NOT NULL',
      [id]
    )
    const file = rows[0]
    if (!file) return NextResponse.json({ error: 'Submission file not found.' }, { status: 404 })

    return new Response(new Uint8Array(file.file_data), {
      headers: {
        'Content-Type': file.mime_type,
        'Content-Length': String(file.file_data.length),
        'Content-Disposition': `${file.mime_type === 'application/epub+zip' ? 'attachment' : 'inline'}; filename="${safeFileName(file.file_name)}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store'
      }
    })
  } catch (error) {
    console.error('Unable to serve admin submission preview:', error)
    return NextResponse.json({ error: 'Unable to load the submission file.' }, { status: 500 })
  }
}
