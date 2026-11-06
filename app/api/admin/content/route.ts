import { NextResponse } from 'next/server'
import type { PoolClient } from 'pg'
import { writeAdminAudit } from '@/lib/admin-audit'
import { hasContentAdminAccess } from '@/lib/admin'
import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export const runtime = 'nodejs'

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const actions = ['approve', 'reject', 'enable', 'disable', 'edit-title'] as const
type ModerationAction = (typeof actions)[number]

export async function GET(request: Request) {
  try {
    if (!(await hasContentAdminAccess())) {
      return NextResponse.json({ error: 'You do not have permission to manage publishing.' }, { status: 403 })
    }

    const requestedStatus = new URL(request.url).searchParams.get('status') ?? 'all'
    const status = ['all', 'pending', 'approved', 'rejected'].includes(requestedStatus) ? requestedStatus : 'all'
    const { rows } = await getPool().query(
      `SELECT submissions.id, submissions.kind, submissions.title, submissions.author,
              submissions.attribution, submissions.body, submissions.file_name, submissions.mime_type,
              submissions.status, submissions.created_at, submissions.reviewed_at,
              profiles.name AS writer_name, profiles.email AS writer_email,
              books.id::text AS book_id, books.is_published AS book_enabled,
              posts.id::text AS post_id, posts.is_published AS post_enabled
       FROM content_submissions AS submissions
       JOIN profiles ON profiles.id = submissions.creator_id
       LEFT JOIN books ON books.source_submission_id = submissions.id
       LEFT JOIN content_posts AS posts ON posts.source_submission_id = submissions.id
       WHERE ($1 = 'all' OR submissions.status = $1)
       ORDER BY CASE submissions.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
                submissions.created_at DESC
       LIMIT 500`,
      [status]
    )
    const { rows: summaryRows } = await getPool().query(
      `SELECT count(*)::text AS total,
              count(*) FILTER (WHERE status = 'pending')::text AS pending,
              count(*) FILTER (WHERE status = 'approved')::text AS approved,
              count(*) FILTER (WHERE status = 'rejected')::text AS rejected
       FROM content_submissions`
    )

    return NextResponse.json({
      submissions: rows,
      summary: {
        total: Number(summaryRows[0].total),
        pending: Number(summaryRows[0].pending),
        approved: Number(summaryRows[0].approved),
        rejected: Number(summaryRows[0].rejected)
      }
    })
  } catch (error) {
    console.error('Unable to load publishing submissions:', error)
    return NextResponse.json({ error: 'Unable to load publishing submissions.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!(await hasContentAdminAccess())) {
    return NextResponse.json({ error: 'You do not have permission to manage publishing.' }, { status: 403 })
  }

  const reviewerId = await getSessionUserId()
  if (!reviewerId) return NextResponse.json({ error: 'Sign in to manage publishing.' }, { status: 401 })

  let client: PoolClient | undefined
  try {
    const body = await request.json()
    if (typeof body.submissionId !== 'string' || !idPattern.test(body.submissionId) ||
        typeof body.action !== 'string' || !actions.includes(body.action as ModerationAction)) {
      return NextResponse.json({ error: 'Choose a valid submission and moderation action.' }, { status: 400 })
    }
    const action = body.action as ModerationAction
    const pool = getPool()
    client = await pool.connect()
    const transaction = client
    await client.query('BEGIN')

    const { rows } = await client.query(
      `SELECT submissions.*, profiles.name AS writer_name,
              books.is_published AS book_enabled, posts.is_published AS post_enabled
       FROM content_submissions AS submissions
       JOIN profiles ON profiles.id = submissions.creator_id
       LEFT JOIN books ON books.source_submission_id = submissions.id
       LEFT JOIN content_posts AS posts ON posts.source_submission_id = submissions.id
       WHERE submissions.id = $1
       FOR UPDATE OF submissions`,
      [body.submissionId]
    )
    const submission = rows[0]
    if (!submission) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Submission not found.' }, { status: 404 })
    }
    const beforeState = {
      title: submission.title,
      status: submission.status,
      reviewed_by: submission.reviewed_by ? String(submission.reviewed_by) : null,
      reviewed_at: submission.reviewed_at,
      is_published: submission.book_enabled ?? submission.post_enabled ?? null
    }

    const recordChange = async (changedAction: ModerationAction, summary: string) => {
      const { rows: stateRows } = await transaction.query(
        `SELECT submissions.title, submissions.status, submissions.reviewed_by::text AS reviewed_by,
                submissions.reviewed_at,
                COALESCE(books.is_published, posts.is_published) AS is_published
         FROM content_submissions AS submissions
         LEFT JOIN books ON books.source_submission_id = submissions.id
         LEFT JOIN content_posts AS posts ON posts.source_submission_id = submissions.id
         WHERE submissions.id = $1`,
        [submission.id]
      )
      const current = stateRows[0]
      await writeAdminAudit(transaction, {
        actorId: reviewerId,
        action: `publishing_${changedAction.replace('-', '_')}`,
        entityType: 'submission',
        entityId: String(submission.id),
        targetName: submission.title,
        summary,
        beforeState,
        afterState: current,
        canRestore: true
      })
    }

    if (action === 'edit-title') {
      const title = typeof body.title === 'string' ? body.title.trim() : ''
      if (submission.kind !== 'book' || submission.status !== 'approved' || title.length < 1 || title.length > 160) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Enter a book title between 1 and 160 characters for an approved book.' }, { status: 400 })
      }

      await client.query(
        'UPDATE content_submissions SET title = $1 WHERE id = $2',
        [title, submission.id]
      )
      const { rowCount } = await client.query(
        'UPDATE books SET title = $1 WHERE source_submission_id = $2',
        [title, submission.id]
      )
      if (!rowCount) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Published book could not be found.' }, { status: 404 })
      }
      await recordChange('edit-title', `Changed the title of "${submission.title}" to "${title}".`)
      await client.query('COMMIT')
      return NextResponse.json({ submission: { id: submission.id, title } })
    }

    if (action === 'approve' || action === 'reject') {
      if (submission.status !== 'pending') {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'This submission has already been reviewed.' }, { status: 409 })
      }

      if (action === 'approve' && submission.kind === 'book') {
        const { rows: existingBooks } = await client.query(
          'SELECT id FROM books WHERE source_submission_id = $1 FOR UPDATE',
          [submission.id]
        )
        if (existingBooks[0]) {
          await client.query(
            `UPDATE books
             SET title = $1, author = COALESCE(NULLIF($2, ''), $3),
                 description = COALESCE($4, ''), is_published = true
             WHERE source_submission_id = $5`,
            [submission.title, submission.author, submission.writer_name, submission.body, submission.id]
          )
        } else {
          await client.query(
            `INSERT INTO books (title, author, description, created_by, source_submission_id, is_published)
             VALUES ($1, COALESCE(NULLIF($2, ''), $3), COALESCE($4, ''), $5, $6, true)`,
            [submission.title, submission.author, submission.writer_name, submission.body, submission.creator_id, submission.id]
          )
        }
      } else if (action === 'approve') {
        const { rows: existingPosts } = await client.query(
          'SELECT id FROM content_posts WHERE source_submission_id = $1 FOR UPDATE',
          [submission.id]
        )
        if (existingPosts[0]) {
          await client.query(
            `UPDATE content_posts
             SET kind = $1, title = $2, body = COALESCE(NULLIF($3, ''), $2),
                 attribution = NULLIF($4, ''), is_published = true
             WHERE source_submission_id = $5`,
            [submission.kind, submission.title, submission.body, submission.attribution, submission.id]
          )
        } else {
          await client.query(
            `INSERT INTO content_posts (kind, title, body, attribution, source_submission_id, created_by)
             VALUES ($1, $2, COALESCE(NULLIF($3, ''), $2), NULLIF($4, ''), $5, $6)`,
            [submission.kind, submission.title, submission.body, submission.attribution, submission.id, submission.creator_id]
          )
        }
      }

      const { rows: updated } = await client.query(
        `UPDATE content_submissions
         SET status = $1, reviewed_by = $2, reviewed_at = now()
         WHERE id = $3
         RETURNING id, kind, title, status, reviewed_at`,
        [action === 'approve' ? 'approved' : 'rejected', reviewerId, submission.id]
      )
      await recordChange(
        action,
        `${action === 'approve' ? 'Approved' : 'Rejected'} the ${submission.kind} submission "${submission.title}".`
      )
      await client.query('COMMIT')
      return NextResponse.json({ submission: updated[0] })
    }

    if (submission.status !== 'approved') {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Only approved work can be enabled or disabled.' }, { status: 409 })
    }

    const enabled = action === 'enable'
    const targetTable = submission.kind === 'book' ? 'books' : 'content_posts'
    const { rowCount } = await client.query(
      `UPDATE ${targetTable} SET is_published = $1 WHERE source_submission_id = $2`,
      [enabled, submission.id]
    )
    if (!rowCount) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Published content could not be found.' }, { status: 404 })
    }
    await recordChange(
      action,
      `${enabled ? 'Published' : 'Unpublished'} "${submission.title}".`
    )
    await client.query('COMMIT')
    return NextResponse.json({ submission: { id: submission.id, status: submission.status, enabled } })
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        console.error('Unable to roll back publishing change:', rollbackError)
      }
    }
    console.error('Unable to update publishing submission:', error)
    return NextResponse.json({ error: 'Unable to update the submission.' }, { status: 500 })
  } finally {
    client?.release()
  }
}
