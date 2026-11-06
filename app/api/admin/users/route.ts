import bcrypt from 'bcryptjs'
import type { PoolClient } from 'pg'
import { NextResponse } from 'next/server'
import { writeAdminAudit } from '@/lib/admin-audit'
import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export const runtime = 'nodejs'

const permissions = new Set(['users', 'payments', 'content'])
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function rollbackTransaction(client: PoolClient, context: string) {
  try {
    await client.query('ROLLBACK')
  } catch (error) {
    console.error(`Unable to roll back ${context}:`, error)
  }
}

async function getAdmin() {
  const userId = await getSessionUserId()
  if (!userId) return null

  const { rows } = await getPool().query(
    'SELECT id, role, perms, name, email FROM profiles WHERE id = $1',
    [userId]
  )
  const admin = rows[0]
  if (!admin || !(admin.role === 'super' || (admin.role === 'admin' && admin.perms.includes('users')))) return null
  return admin
}

export async function GET(request: Request) {
  try {
    const admin = await getAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const searchParams = new URL(request.url).searchParams
    const search = (searchParams.get('q') ?? '').trim().slice(0, 120)
    const requestedPage = Number(searchParams.get('page') ?? '1')
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const pageSize = 25
    const offset = (page - 1) * pageSize
    const pool = getPool()
    const [users, count, summary] = await Promise.all([
      pool.query(
        `SELECT id, name, email, role, perms, account_type, writer_status, reading_seconds, premium_until, created_at
         FROM profiles
         WHERE ($1 = '' OR id::text = $1 OR name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%')
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [search, pageSize, offset]
      ),
      pool.query(
        `SELECT count(*)::text AS total
         FROM profiles
         WHERE ($1 = '' OR id::text = $1 OR name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%')`,
        [search]
      ),
      pool.query(
        `SELECT count(*)::text AS total,
                count(*) FILTER (WHERE premium_until > now())::text AS premium,
                count(*) FILTER (WHERE role IN ('admin', 'super'))::text AS administrators,
                count(*) FILTER (WHERE account_type = 'writer')::text AS writers,
                count(*) FILTER (WHERE account_type = 'writer' AND writer_status = 'pending')::text AS pending_writers
         FROM profiles`
      )
    ])

    return NextResponse.json({
      users: users.rows,
      total: Number(count.rows[0].total),
      summary: {
        total: Number(summary.rows[0].total),
        premium: Number(summary.rows[0].premium),
        administrators: Number(summary.rows[0].administrators),
        writers: Number(summary.rows[0].writers),
        pendingWriters: Number(summary.rows[0].pending_writers)
      },
      page,
      pageSize,
      canManageRoles: admin.role === 'super'
    })
  } catch (error) {
    console.error('Unable to list admin users:', error)
    return NextResponse.json({ error: 'Unable to load members.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  let client: PoolClient | undefined
  let transactionOpen = false
  try {
    const admin = await getAdmin()
    if (!admin || admin.role !== 'super') return NextResponse.json({ error: 'Only the super administrator can create administrator accounts.' }, { status: 403 })

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!name || name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      return NextResponse.json({ error: 'Enter a name, valid email, and a password of at least 12 characters (maximum 72 bytes).' }, { status: 400 })
    }
    if (email === process.env.ADMIN_EMAIL?.trim().toLowerCase()) {
      return NextResponse.json({ error: 'This email is reserved for the super administrator account.' }, { status: 409 })
    }
    if (!Array.isArray(body.perms) || body.perms.length < 1 ||
        body.perms.some((permission: unknown) => typeof permission !== 'string' || !permissions.has(permission))) {
      return NextResponse.json({ error: 'Select at least one valid administrator permission.' }, { status: 400 })
    }

    const userPermissions = body.perms.filter(
      (permission: string, index: number, values: string[]) => values.indexOf(permission) === index
    )
    const passwordHash = await bcrypt.hash(password, 12)
    client = await getPool().connect()
    await client.query('BEGIN')
    transactionOpen = true
    const { rows } = await client.query(
      `INSERT INTO profiles (name, email, password_hash, role, perms, account_type, writer_status)
       VALUES ($1, $2, $3, 'admin', $4::text[], 'reader', 'disabled')
       RETURNING id, name, email, role, perms, account_type, writer_status, reading_seconds, premium_until, created_at`,
      [name, email, passwordHash, userPermissions]
    )
    await writeAdminAudit(client, {
      actorId: String(admin.id),
      action: 'administrator_created',
      entityType: 'profile',
      entityId: String(rows[0].id),
      targetName: `${rows[0].name} (${rows[0].email})`,
      summary: `Created an administrator account for ${rows[0].name}.`,
      beforeState: null,
      afterState: {
        id: String(rows[0].id),
        name: rows[0].name,
        email: rows[0].email,
        role: rows[0].role,
        perms: rows[0].perms,
        account_type: rows[0].account_type,
        writer_status: rows[0].writer_status,
        reading_seconds: rows[0].reading_seconds,
        premium_until: rows[0].premium_until
      },
      canRestore: false
    })
    await client.query('COMMIT')
    transactionOpen = false
    return NextResponse.json({ user: rows[0] }, { status: 201 })
  } catch (error) {
    if (transactionOpen && client) {
      await rollbackTransaction(client, 'administrator creation')
      transactionOpen = false
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 })
    }
    console.error('Unable to create administrator account:', error)
    return NextResponse.json({ error: 'Unable to create administrator account.' }, { status: 500 })
  } finally {
    if (transactionOpen && client) await rollbackTransaction(client, 'administrator creation')
    client?.release()
  }
}

export async function PATCH(request: Request) {
  let client: PoolClient | undefined
  let transactionOpen = false
  try {
    const admin = await getAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    if (typeof body.userId !== 'string' || !idPattern.test(body.userId)) {
      return NextResponse.json({ error: 'Invalid member.' }, { status: 400 })
    }

    client = await getPool().connect()
    await client.query('BEGIN')
    transactionOpen = true
    const { rows: targetRows } = await client.query(
      `SELECT id::text, name, email, role, perms, account_type, writer_status,
              reading_seconds, premium_until
       FROM profiles WHERE id = $1 FOR UPDATE`,
      [body.userId]
    )
    const target = targetRows[0]
    if (!target) return NextResponse.json({ error: 'Member not found.' }, { status: 404 })
    if (target.role === 'super') return NextResponse.json({ error: 'Super administrator accounts cannot be changed here.' }, { status: 403 })
    if (admin.role !== 'super' && target.role !== 'user') {
      return NextResponse.json({ error: 'You can only manage regular member accounts.' }, { status: 403 })
    }
    if (admin.id === body.userId && body.role !== undefined) {
      return NextResponse.json({ error: 'You cannot change your own administrator role.' }, { status: 403 })
    }

    const updates: string[] = []
    const values: Array<string | number | null | string[]> = [body.userId]
    const addUpdate = (column: string, value: string | number | null | string[], cast = '') => {
      values.push(value)
      updates.push(`${column} = $${values.length}${cast}`)
    }

    if (body.readingSeconds !== undefined) {
      if (!Number.isInteger(body.readingSeconds) || body.readingSeconds < 0 || body.readingSeconds > 1_000_000) {
        return NextResponse.json({ error: 'Reading time must be between 0 and 1,000,000 seconds.' }, { status: 400 })
      }
      addUpdate('reading_seconds', body.readingSeconds)
    }

    if (body.premiumUntil !== undefined) {
      if (body.premiumUntil !== null && (typeof body.premiumUntil !== 'string' || !Number.isFinite(Date.parse(body.premiumUntil)))) {
        return NextResponse.json({ error: 'Enter a valid Premium expiry date.' }, { status: 400 })
      }
      addUpdate('premium_until', body.premiumUntil, '::timestamptz')
    }

    if (body.email !== undefined) {
      if (admin.role !== 'super' || target.role !== 'admin') {
        return NextResponse.json({ error: 'Only the super administrator can change an administrator email.' }, { status: 403 })
      }
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
      }
      if (email === process.env.ADMIN_EMAIL?.trim().toLowerCase()) {
        return NextResponse.json({ error: 'This email is reserved for the super administrator account.' }, { status: 409 })
      }
      addUpdate('email', email)
    }

    if (body.newPassword !== undefined) {
      if (admin.role !== 'super') {
        return NextResponse.json({ error: 'Only the super administrator can reset member passwords.' }, { status: 403 })
      }
      const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
      if (newPassword.length < 12 || Buffer.byteLength(newPassword, 'utf8') > 72) {
        return NextResponse.json({ error: 'The new password must be at least 12 characters and no more than 72 bytes.' }, { status: 400 })
      }
      addUpdate('password_hash', await bcrypt.hash(newPassword, 12))
    }

    if (body.role !== undefined) {
      if (admin.role !== 'super') return NextResponse.json({ error: 'Only the super administrator can change administrator roles.' }, { status: 403 })
      if (body.role !== 'user' && body.role !== 'admin' && body.role !== 'super') {
        return NextResponse.json({ error: 'Choose a valid account role.' }, { status: 400 })
      }
      if (body.role === 'super' && target.role !== 'admin') {
        return NextResponse.json({ error: 'Only an existing administrator can be promoted to super administrator.' }, { status: 400 })
      }
      let userPermissions: string[] = []
      if (body.role === 'admin') {
        if (!Array.isArray(body.perms) || body.perms.length < 1 || body.perms.some((permission: unknown) => typeof permission !== 'string' || !permissions.has(permission))) {
          return NextResponse.json({ error: 'Select at least one valid administrator permission.' }, { status: 400 })
        }
        userPermissions = body.perms.filter(
          (permission: string, index: number, values: string[]) => values.indexOf(permission) === index
        )
      }
      addUpdate('role', body.role)
      addUpdate('perms', userPermissions, '::text[]')
    }

    if (body.accountType !== undefined || body.writerStatus !== undefined) {
      if (admin.role !== 'super') return NextResponse.json({ error: 'Only the super administrator can manage writer accounts.' }, { status: 403 })
      const accountType = body.accountType ?? target.account_type
      const writerStatus = body.writerStatus ?? (accountType === 'reader' ? 'disabled' : target.writer_status === 'disabled' ? 'pending' : target.writer_status)
      if (accountType !== 'reader' && accountType !== 'writer') {
        return NextResponse.json({ error: 'Choose Reader or Writer for this account.' }, { status: 400 })
      }
      if (!['disabled', 'pending', 'approved'].includes(writerStatus) || (accountType === 'reader' && writerStatus !== 'disabled')) {
        return NextResponse.json({ error: 'Choose a valid writer approval status.' }, { status: 400 })
      }
      addUpdate('account_type', accountType)
      addUpdate('writer_status', accountType === 'reader' ? 'disabled' : writerStatus)
    }

    if (!updates.length) return NextResponse.json({ error: 'No changes provided.' }, { status: 400 })

    const { rows } = await client.query(
      `UPDATE profiles SET ${updates.join(', ')} WHERE id = $1
       RETURNING id, name, email, role, perms, account_type, writer_status, reading_seconds, premium_until, created_at`,
      values
    )
    const auditFields = [
      'id', 'name', 'email', 'role', 'perms', 'account_type', 'writer_status',
      'reading_seconds', 'premium_until'
    ] as const
    const toAuditState = (profile: Record<string, unknown>) =>
      Object.fromEntries(auditFields.map((field) => [
        field,
        field === 'id' ? String(profile[field]) : profile[field]
      ]))
    const beforeState = toAuditState(target)
    const afterState = toAuditState(rows[0])
    const passwordReset = body.newPassword !== undefined
    const changedProfileFields = updates.filter((update) => !update.startsWith('password_hash ='))
    const promotedToSuper = target.role !== 'super' && rows[0].role === 'super'
    await writeAdminAudit(client, {
      actorId: String(admin.id),
      action: passwordReset
        ? changedProfileFields.length ? 'member_updated_password_reset' : 'password_reset'
        : rows[0].role !== target.role ? 'administrator_role_changed' : 'member_updated',
      entityType: 'profile',
      entityId: String(rows[0].id),
      targetName: `${rows[0].name} (${rows[0].email})`,
      summary: passwordReset
        ? `Updated ${rows[0].name}'s account${changedProfileFields.length ? ' and reset their password' : ' password'}.`
        : rows[0].role !== target.role
          ? `Changed ${rows[0].name}'s role from ${target.role} to ${rows[0].role}.`
          : `Updated account access or details for ${rows[0].name}.`,
      beforeState,
      afterState,
      canRestore: changedProfileFields.length > 0 && !promotedToSuper
    })
    await client.query('COMMIT')
    transactionOpen = false
    return NextResponse.json({ user: rows[0] })
  } catch (error) {
    if (transactionOpen && client) {
      await rollbackTransaction(client, 'member update')
      transactionOpen = false
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 })
    }
    console.error('Unable to update admin user:', error)
    return NextResponse.json({ error: 'Unable to update member.' }, { status: 500 })
  } finally {
    if (transactionOpen && client) await rollbackTransaction(client, 'member update')
    client?.release()
  }
}
