import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export const runtime = 'nodejs'

const MAX_BOOK_SIZE = 15 * 1024 * 1024
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

type SubmissionKind = 'book' | 'meme' | 'quote'

function isSubmissionKind(value: unknown): value is SubmissionKind {
  return value === 'book' || value === 'meme' || value === 'quote'
}

function isAllowedBookFile(name: string) {
  return /\.(pdf|epub|txt)$/i.test(name)
}

function imageMimeType(fileName: string) {
  const extension = fileName.toLowerCase().split('.').pop()
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'png') return 'image/png'
  if (extension === 'webp') return 'image/webp'
  if (extension === 'gif') return 'image/gif'
  return null
}

function hasExpectedSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === 'application/pdf') return new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-'
  if (mimeType === 'application/epub+zip') return bytes[0] === 0x50 && bytes[1] === 0x4b
  if (mimeType === 'image/png') return bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
  if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mimeType === 'image/gif') {
    const signature = new TextDecoder().decode(bytes.slice(0, 6))
    return signature === 'GIF87a' || signature === 'GIF89a'
  }
  if (mimeType === 'image/webp') {
    return new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
      new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
  }
  return true
}

async function getWriterProfile() {
  const userId = await getSessionUserId()
  if (!userId) return null
  const { rows } = await getPool().query(
    'SELECT id, name, account_type, writer_status FROM profiles WHERE id = $1',
    [userId]
  )
  return rows[0] ?? null
}

export async function GET() {
  try {
    const profile = await getWriterProfile()
    if (!profile || profile.account_type !== 'writer') {
      return NextResponse.json({ error: 'Choose a Writer account to view submissions.' }, { status: 403 })
    }

    const { rows } = await getPool().query(
      `SELECT id, kind, title, author, attribution, body, file_name, mime_type,
              status, reviewed_at, created_at
       FROM content_submissions
       WHERE creator_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [profile.id]
    )
    return NextResponse.json({
      writer: { name: profile.name, status: profile.writer_status },
      submissions: rows
    })
  } catch (error) {
    console.error('Unable to load writer submissions:', error)
    return NextResponse.json({ error: 'Unable to load submissions.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getWriterProfile()
    if (!profile || profile.account_type !== 'writer') {
      return NextResponse.json({ error: 'Choose a Writer account to submit work.' }, { status: 403 })
    }
    if (profile.writer_status !== 'approved') {
      return NextResponse.json({ error: 'A Libra administrator must approve your writer account before you can submit work.' }, { status: 403 })
    }

    const contentLength = Number(request.headers.get('content-length') ?? '0')
    if (contentLength > MAX_BOOK_SIZE + 1024 * 1024) {
      return NextResponse.json({ error: 'Uploads must be smaller than 15 MB.' }, { status: 413 })
    }

    const form = await request.formData()
    const kind = form.get('kind')
    const title = typeof form.get('title') === 'string' ? String(form.get('title')).trim() : ''
    const author = typeof form.get('author') === 'string' ? String(form.get('author')).trim() : ''
    const attribution = typeof form.get('attribution') === 'string' ? String(form.get('attribution')).trim() : ''
    const body = typeof form.get('body') === 'string' ? String(form.get('body')).trim() : ''
    const uploaded = form.get('file')

    if (!isSubmissionKind(kind)) {
      return NextResponse.json({ error: 'Choose a book, meme, or quote submission.' }, { status: 400 })
    }
    if (!title || title.length > 200) {
      return NextResponse.json({ error: 'Enter a title of 1–200 characters.' }, { status: 400 })
    }
    if (author.length > 160 || attribution.length > 200 || body.length > 20_000) {
      return NextResponse.json({ error: 'The author, attribution, or text is too long.' }, { status: 400 })
    }

    let fileName: string | null = null
    let mimeType: string | null = null
    let fileData: Buffer | null = null

    if (kind === 'book') {
      if (!(uploaded instanceof File) || uploaded.size === 0) {
        return NextResponse.json({ error: 'Choose a PDF, EPUB, or plain-text book file.' }, { status: 400 })
      }
      if (!isAllowedBookFile(uploaded.name)) {
        return NextResponse.json({ error: 'Book files must be PDF, EPUB, or plain text (.txt).' }, { status: 400 })
      }
      if (uploaded.size > MAX_BOOK_SIZE) {
        return NextResponse.json({ error: 'Book files must be smaller than 15 MB.' }, { status: 413 })
      }
      fileName = uploaded.name.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f]/g, '').slice(0, 255) || 'book'
      const extension = fileName.toLowerCase().split('.').pop()
      mimeType = extension === 'pdf' ? 'application/pdf' : extension === 'epub' ? 'application/epub+zip' : 'text/plain'
      const bytes = new Uint8Array(await uploaded.arrayBuffer())
      if (!hasExpectedSignature(bytes, mimeType)) {
        return NextResponse.json({ error: 'The uploaded file does not match its file type.' }, { status: 400 })
      }
      if (mimeType === 'text/plain') {
        try {
          new TextDecoder('utf-8', { fatal: true }).decode(bytes)
        } catch {
          return NextResponse.json({ error: 'Plain-text books must use UTF-8 encoding.' }, { status: 400 })
        }
      }
      fileData = Buffer.from(bytes)
    } else if (uploaded instanceof File && uploaded.size > 0) {
      if (kind !== 'meme') {
        return NextResponse.json({ error: 'Only meme submissions can include an image.' }, { status: 400 })
      }
      if (uploaded.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: 'Meme images must be smaller than 5 MB.' }, { status: 413 })
      }
      fileName = uploaded.name.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f]/g, '').slice(0, 255) || 'meme-image'
      mimeType = imageMimeType(fileName)
      if (!mimeType) {
        return NextResponse.json({ error: 'Meme images must be JPEG, PNG, GIF, or WebP.' }, { status: 400 })
      }
      const bytes = new Uint8Array(await uploaded.arrayBuffer())
      if (!hasExpectedSignature(bytes, mimeType)) {
        return NextResponse.json({ error: 'The uploaded image does not match its file type.' }, { status: 400 })
      }
      fileData = Buffer.from(bytes)
    }

    if (kind === 'meme' && !body && !fileData) {
      return NextResponse.json({ error: 'Add meme text or attach an image.' }, { status: 400 })
    }
    if (kind === 'quote' && !body) {
      return NextResponse.json({ error: 'Enter the quote text.' }, { status: 400 })
    }

    const { rows } = await getPool().query(
      `INSERT INTO content_submissions
         (creator_id, kind, title, author, attribution, body, file_name, mime_type, file_data)
       VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), $7, $8, $9)
       RETURNING id, kind, title, status, created_at`,
      [profile.id, kind, title, author, attribution, body, fileName, mimeType, fileData]
    )
    return NextResponse.json({ submission: rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Unable to create writer submission:', error)
    return NextResponse.json({ error: 'Unable to submit your work.' }, { status: 500 })
  }
}
