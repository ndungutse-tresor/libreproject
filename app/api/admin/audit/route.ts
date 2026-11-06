import { NextResponse } from 'next/server'
import type { PoolClient } from 'pg'
import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { writeAdminAudit } from '@/lib/admin-audit'

export const runtime = 'nodejs'

const settingTables = {
  payment_methods: ['id', 'key', 'label', 'provider', 'currencies', 'enabled', 'config'],
  plans: ['id', 'kind', 'name', 'minutes', 'duration_days', 'price_usd', 'enabled'],
  coupons: ['code', 'percent_off', 'max_uses', 'used', 'expires_at', 'enabled'],
  currencies: ['code', 'symbol', 'rate_to_usd', 'enabled']
} as const

type JsonRecord = Record<string, unknown>
type AuditRecord = JsonRecord & {
  id: string
  entity_type: 'profile' | 'payment_setting' | 'submission'
  entity_id: string
  target_name: string
  can_restore: boolean
  restored_at: Date | null
  before_state: JsonRecord | null
  after_state: JsonRecord | null
}
type RestoredState = {
  beforeState: JsonRecord | null
  afterState: JsonRecord | null
  targetName: string
}

class RestoreConflict extends Error {}

async function getSuperAdmin() {
  const userId = await getSessionUserId()
  if (!userId) return null

  const { rows } = await getPool().query(
    'SELECT id, role FROM profiles WHERE id = $1',
    [userId]
  )
  return rows[0]?.role === 'super' ? { id: String(rows[0].id) } : null
}

function stableJson(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString())
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function sameState(left: unknown, right: unknown) {
  return stableJson(left) === stableJson(right)
}

function sanitizeAuditState(value: unknown, key = ''): unknown {
  if (/password|secret|token|api.?key|webhook|credential/i.test(key)) return '[redacted]'
  if (Array.isArray(value)) return value.map((item) => sanitizeAuditState(item))
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        sanitizeAuditState(childValue, childKey)
      ])
    )
  }
  return value
}

async function restoreProfile(client: PoolClient, event: JsonRecord): Promise<RestoredState> {
  const before = event.before_state as JsonRecord | null
  const after = event.after_state as JsonRecord | null
  if (!before || !after || before.role === 'super' || after.role === 'super') {
    throw new RestoreConflict('This administrator change cannot be restored through the platform.')
  }

  const { rows } = await client.query(
    `SELECT id::text, name, email, role, perms, account_type, writer_status,
            reading_seconds, premium_until, gender, age, bio, favorite_genres
     FROM profiles WHERE id = $1 FOR UPDATE`,
    [event.entity_id]
  )
  const current = rows[0]
  const stateFields = Object.keys(after).filter((field) => field !== 'password_hash')
  const currentState = current && Object.fromEntries(stateFields.map((field) => [field, current[field]]))
  if (!current || current.role === 'super' || !sameState(currentState, after)) {
    throw new RestoreConflict('This account has changed since that history entry. Refresh history and review the latest changes.')
  }

  const allowedFields = new Set([
    'name', 'email', 'role', 'perms', 'account_type', 'writer_status',
    'reading_seconds', 'premium_until', 'gender', 'age', 'bio', 'favorite_genres'
  ])
  const fields = Object.keys(before).filter((field) => field !== 'id' && allowedFields.has(field))
  const assignments = fields.map((field, index) => `${field} = $${index + 2}${field === 'perms' || field === 'favorite_genres' ? '::text[]' : ''}`)
  const values = fields.map((field) => before[field] ?? null)
  await client.query(
    `UPDATE profiles SET ${assignments.join(', ')} WHERE id = $1`,
    [event.entity_id, ...values]
  )

  const restoredState = Object.fromEntries(Object.keys(before).map((field) => [field, field === 'id' ? String(event.entity_id) : before[field]]))
  const previousState = Object.fromEntries(stateFields.map((field) => [field, current[field]]))
  return { beforeState: previousState, afterState: restoredState, targetName: String(event.target_name) }
}

async function restorePaymentSetting(client: PoolClient, event: JsonRecord): Promise<RestoredState> {
  const before = event.before_state as JsonRecord | null
  const after = event.after_state as JsonRecord | null
  const descriptor = (before ?? after) as JsonRecord | null
  const table = descriptor?.table
  const primaryKey = descriptor?.primaryKey
  const primaryValue = descriptor?.primaryValue
  if (typeof table !== 'string' || !Object.hasOwn(settingTables, table) ||
      typeof primaryKey !== 'string' || typeof primaryValue !== 'string' ||
      settingTables[table as keyof typeof settingTables][0] !== primaryKey) {
    throw new RestoreConflict('This payment setting history entry is invalid.')
  }

  const currentQuery = await client.query(
    `SELECT to_jsonb(setting) AS row
     FROM ${table} AS setting
     WHERE setting.${primaryKey} = $1
     FOR UPDATE`,
    [primaryValue]
  )
  const current = currentQuery.rows[0]?.row ?? null
  const expected = after?.row ?? null
  const previous = before?.row ?? null
  if (!sameState(current, expected)) {
    throw new RestoreConflict('This setting has changed since that history entry. Refresh history and review the latest changes.')
  }

  if (previous === null) {
    if (current) await client.query(`DELETE FROM ${table} WHERE ${primaryKey} = $1`, [primaryValue])
  } else if (current === null) {
    const row = previous as JsonRecord
    const columns = Object.keys(row).filter((column) =>
      (settingTables[table as keyof typeof settingTables] as readonly string[]).includes(column)
    )
    const placeholders = columns.map((_, index) => `$${index + 1}`)
    const override = table === 'payment_methods' || table === 'plans' ? ' OVERRIDING SYSTEM VALUE' : ''
    await client.query(
      `INSERT INTO ${table} (${columns.join(', ')})${override} VALUES (${placeholders.join(', ')})`,
      columns.map((column) => row[column])
    )
  } else {
    const row = previous as JsonRecord
    const columns = Object.keys(row).filter((column) =>
      column !== primaryKey &&
      (settingTables[table as keyof typeof settingTables] as readonly string[]).includes(column)
    )
    const values = columns.map((column) => row[column])
    await client.query(
      `UPDATE ${table} SET ${columns.map((column, index) => `${column} = $${index + 1}`).join(', ')}
       WHERE ${primaryKey} = $${values.length + 1}`,
      [...values, primaryValue]
    )
  }

  return {
    beforeState: current ? { table, primaryKey, primaryValue, row: current } : null,
    afterState: previous ? { table, primaryKey, primaryValue, row: previous } : null,
    targetName: String(event.target_name)
  }
}

async function restoreSubmission(client: PoolClient, event: JsonRecord): Promise<RestoredState> {
  const before = event.before_state as JsonRecord | null
  const after = event.after_state as JsonRecord | null
  if (!before || !after) throw new RestoreConflict('This publishing history entry cannot be restored.')

  const { rows } = await client.query(
    `SELECT submissions.title, submissions.status, submissions.reviewed_by::text,
            submissions.reviewed_at,
            COALESCE(books.is_published, posts.is_published) AS is_published
     FROM content_submissions AS submissions
     LEFT JOIN books ON books.source_submission_id = submissions.id
     LEFT JOIN content_posts AS posts ON posts.source_submission_id = submissions.id
     WHERE submissions.id = $1 FOR UPDATE OF submissions`,
    [event.entity_id]
  )
  const current = rows[0]
  if (!current || !sameState(current, after)) {
    throw new RestoreConflict('This publishing item has changed since that history entry. Refresh history and review the latest changes.')
  }

  if (before.status !== 'approved' && current.status === 'approved') {
    await client.query('UPDATE books SET is_published = false WHERE source_submission_id = $1', [event.entity_id])
    await client.query('UPDATE content_posts SET is_published = false WHERE source_submission_id = $1', [event.entity_id])
  } else if (before.status === 'approved' && current.status !== 'approved') {
    throw new RestoreConflict('An approved item cannot be recreated from history after it has been removed.')
  } else if (before.status === 'approved') {
    await client.query(
      'UPDATE content_submissions SET title = $1 WHERE id = $2',
      [before.title, event.entity_id]
    )
    await client.query(
      'UPDATE books SET title = $1, is_published = $2 WHERE source_submission_id = $3',
      [before.title, before.is_published, event.entity_id]
    )
    await client.query(
      'UPDATE content_posts SET title = $1, is_published = $2 WHERE source_submission_id = $3',
      [before.title, before.is_published, event.entity_id]
    )
  }
  await client.query(
    `UPDATE content_submissions
     SET title = $1, status = $2, reviewed_by = $3, reviewed_at = $4
     WHERE id = $5`,
    [before.title, before.status, before.reviewed_by, before.reviewed_at, event.entity_id]
  )

  return { beforeState: current as JsonRecord, afterState: before, targetName: String(event.target_name) }
}

export async function GET() {
  try {
    if (!(await getSuperAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { rows } = await getPool().query(
      `SELECT id::text, actor_name, actor_email, action, entity_type, entity_id, target_name, summary,
              before_state, after_state, can_restore, restored_at, related_event_id::text, created_at
       FROM admin_audit_log
       ORDER BY created_at DESC, id DESC
       LIMIT 250`
    )
    return NextResponse.json({
      events: rows.map((event) => ({
        ...event,
        before_state: sanitizeAuditState(event.before_state),
        after_state: sanitizeAuditState(event.after_state)
      }))
    })
  } catch (error) {
    console.error('Unable to load super-admin history:', error)
    return NextResponse.json({ error: 'Unable to load admin history.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  let client: PoolClient | undefined
  try {
    const admin = await getSuperAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const auditId = Number(body.auditId)
    if (!Number.isSafeInteger(auditId) || auditId < 1) {
      return NextResponse.json({ error: 'Choose a valid history entry.' }, { status: 400 })
    }

    client = await getPool().connect()
    await client.query('BEGIN')
    const { rows } = await client.query(
      'SELECT * FROM admin_audit_log WHERE id = $1 FOR UPDATE',
      [auditId]
    )
    const event = rows[0] as AuditRecord | undefined
    if (!event || !event.can_restore || event.restored_at) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'This history entry cannot be restored.' }, { status: 409 })
    }

    let restored
    if (event.entity_type === 'profile') restored = await restoreProfile(client, event)
    else if (event.entity_type === 'payment_setting') restored = await restorePaymentSetting(client, event)
    else if (event.entity_type === 'submission') restored = await restoreSubmission(client, event)
    else throw new RestoreConflict('This history entry cannot be restored.')

    await writeAdminAudit(client, {
      actorId: admin.id,
      action: 'history_restored',
      entityType: event.entity_type,
      entityId: event.entity_id,
      targetName: restored.targetName,
      summary: `Restored a previous change to ${restored.targetName}.`,
      beforeState: restored.beforeState,
      afterState: restored.afterState,
      canRestore: false,
      relatedEventId: String(event.id)
    })
    await client.query('UPDATE admin_audit_log SET restored_at = now() WHERE id = $1', [auditId])
    await client.query('COMMIT')
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        console.error('Unable to roll back admin history restore:', rollbackError)
      }
    }
    console.error('Unable to restore admin history:', error)
    if (error instanceof RestoreConflict) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (error && typeof error === 'object' && 'code' in error &&
        (error.code === '23503' || error.code === '23505')) {
      return NextResponse.json({ error: 'The previous state conflicts with current platform data and could not be restored.' }, { status: 409 })
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid restore request.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Unable to restore this history entry.' }, { status: 500 })
  } finally {
    client?.release()
  }
}
