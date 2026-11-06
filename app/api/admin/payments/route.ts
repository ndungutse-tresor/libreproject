import type { PoolClient } from 'pg'
import { NextResponse } from 'next/server'
import { writeAdminAudit } from '@/lib/admin-audit'
import { hasPaymentAdminAccess } from '@/lib/admin'
import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export const runtime = 'nodejs'

const tables = {
  payment_methods: { primaryKey: 'id', columns: ['key', 'label', 'provider', 'currencies', 'enabled', 'config'] },
  plans: { primaryKey: 'id', columns: ['kind', 'name', 'minutes', 'duration_days', 'price_usd', 'enabled'] },
  coupons: { primaryKey: 'code', columns: ['code', 'percent_off', 'max_uses', 'expires_at', 'enabled'] },
  currencies: { primaryKey: 'code', columns: ['code', 'symbol', 'rate_to_usd', 'enabled'] }
} as const

type TableName = keyof typeof tables

async function rollbackTransaction(client: PoolClient, context: string) {
  try {
    await client.query('ROLLBACK')
  } catch (error) {
    console.error(`Unable to roll back ${context}:`, error)
  }
}

function validTable(value: unknown): value is TableName {
  return typeof value === 'string' && Object.hasOwn(tables, value)
}

export async function GET(request: Request) {
  try {
    if (!(await hasPaymentAdminAccess())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const table = new URL(request.url).searchParams.get('table')
    if (!validTable(table)) return NextResponse.json({ error: 'Invalid table.' }, { status: 400 })

    const { rows } = await getPool().query(`SELECT * FROM ${table} ORDER BY ${tables[table].primaryKey}`)
    return NextResponse.json({ rows })
  } catch (error) {
    console.error('Unable to list payment settings:', error)
    return NextResponse.json({ error: 'Unable to load payment settings.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  let client: PoolClient | undefined
  let transactionOpen = false
  try {
    const actorId = await getSessionUserId()
    if (!actorId || !(await hasPaymentAdminAccess())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await request.json()
    if (!validTable(body.table) || !body.values || typeof body.values !== 'object' || Array.isArray(body.values)) {
      return NextResponse.json({ error: 'Invalid payment setting.' }, { status: 400 })
    }

    const { table, values } = body as { table: TableName; values: Record<string, unknown> }
    const allowed = tables[table].columns as readonly string[]
    const entries = Object.entries(values).filter(([column, value]) => allowed.includes(column) && value !== undefined && value !== '')
    if (!entries.length) return NextResponse.json({ error: 'No valid fields provided.' }, { status: 400 })

    const columns = entries.map(([column]) => column)
    const params = entries.map(([, value]) => value)
    const placeholders = params.map((_, index) => `$${index + 1}`)
    client = await getPool().connect()
    await client.query('BEGIN')
    transactionOpen = true
    const { rows } = await client.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      params
    )
    const primaryKey = tables[table].primaryKey
    const primaryValue = String(rows[0][primaryKey])
    const { rows: snapshotRows } = await client.query(
      `SELECT to_jsonb(setting) AS row FROM ${table} AS setting WHERE ${primaryKey} = $1`,
      [primaryValue]
    )
    await writeAdminAudit(client, {
      actorId,
      action: 'payment_setting_created',
      entityType: 'payment_setting',
      entityId: `${table}:${primaryValue}`,
      targetName: `${table} ${primaryValue}`,
      summary: `Created a ${table.replace('_', ' ')} setting.`,
      beforeState: null,
      afterState: { table, primaryKey, primaryValue, row: snapshotRows[0].row },
      canRestore: true
    })
    await client.query('COMMIT')
    transactionOpen = false
    return NextResponse.json({ row: rows[0] }, { status: 201 })
  } catch (error) {
    if (transactionOpen && client) {
      await rollbackTransaction(client, 'payment setting creation')
      transactionOpen = false
    }
    console.error('Unable to create payment setting:', error)
    const duplicate = error && typeof error === 'object' && 'code' in error && error.code === '23505'
    return NextResponse.json({ error: duplicate ? 'That key already exists.' : 'Unable to create payment setting.' }, { status: duplicate ? 409 : 500 })
  } finally {
    if (transactionOpen && client) await rollbackTransaction(client, 'payment setting creation')
    client?.release()
  }
}

export async function PATCH(request: Request) {
  let client: PoolClient | undefined
  let transactionOpen = false
  try {
    const actorId = await getSessionUserId()
    if (!actorId || !(await hasPaymentAdminAccess())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await request.json()
    if (!validTable(body.table) || typeof body.primaryKey !== 'string' || typeof body.primaryValue !== 'string') {
      return NextResponse.json({ error: 'Invalid update.' }, { status: 400 })
    }
    const table = body.table as TableName
    if (tables[table].primaryKey !== body.primaryKey) return NextResponse.json({ error: 'Invalid key.' }, { status: 400 })

    const updates: string[] = []
    const values: unknown[] = []
    const allowed = tables[table].columns as readonly string[]
    const addValue = (column: string, value: unknown) => {
      if (!allowed.includes(column)) return
      values.push(value)
      updates.push(`${column} = $${values.length}`)
    }

    if (typeof body.enabled === 'boolean') addValue('enabled', body.enabled)
    if (body.values && typeof body.values === 'object' && !Array.isArray(body.values)) {
      for (const [column, value] of Object.entries(body.values as Record<string, unknown>)) {
        addValue(column, value)
      }
    }
    if (!updates.length) return NextResponse.json({ error: 'No valid changes provided.' }, { status: 400 })

    client = await getPool().connect()
    await client.query('BEGIN')
    transactionOpen = true
    const { rows: previousRows } = await client.query(
      `SELECT to_jsonb(setting) AS row
       FROM ${table} AS setting WHERE setting.${body.primaryKey} = $1 FOR UPDATE`,
      [body.primaryValue]
    )
    const previous = previousRows[0]?.row
    if (!previous) return NextResponse.json({ error: 'Setting not found.' }, { status: 404 })

    values.push(body.primaryValue)
    const { rows } = await client.query(
      `UPDATE ${table} SET ${updates.join(', ')} WHERE ${body.primaryKey} = $${values.length} RETURNING *`,
      values
    )
    if (!rows[0]) return NextResponse.json({ error: 'Setting not found.' }, { status: 404 })
    const primaryValue = String(rows[0][body.primaryKey])
    const { rows: snapshotRows } = await client.query(
      `SELECT to_jsonb(setting) AS row FROM ${table} AS setting WHERE ${body.primaryKey} = $1`,
      [primaryValue]
    )
    await writeAdminAudit(client, {
      actorId,
      action: 'payment_setting_updated',
      entityType: 'payment_setting',
      entityId: `${table}:${primaryValue}`,
      targetName: `${table} ${primaryValue}`,
      summary: `Updated a ${table.replace('_', ' ')} setting.`,
      beforeState: { table, primaryKey: body.primaryKey, primaryValue, row: previous },
      afterState: { table, primaryKey: body.primaryKey, primaryValue, row: snapshotRows[0].row },
      canRestore: true
    })
    await client.query('COMMIT')
    transactionOpen = false
    return NextResponse.json({ row: rows[0] })
  } catch (error) {
    if (transactionOpen && client) {
      await rollbackTransaction(client, 'payment setting update')
      transactionOpen = false
    }
    console.error('Unable to update payment setting:', error)
    return NextResponse.json({ error: 'Unable to update payment setting.' }, { status: 500 })
  } finally {
    if (transactionOpen && client) await rollbackTransaction(client, 'payment setting update')
    client?.release()
  }
}

export async function DELETE(request: Request) {
  let client: PoolClient | undefined
  let transactionOpen = false
  try {
    const actorId = await getSessionUserId()
    if (!actorId || !(await hasPaymentAdminAccess())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await request.json()
    if (!validTable(body.table) || typeof body.primaryKey !== 'string' || typeof body.primaryValue !== 'string') {
      return NextResponse.json({ error: 'Invalid delete request.' }, { status: 400 })
    }
    const table = body.table as TableName
    if (tables[table].primaryKey !== body.primaryKey) return NextResponse.json({ error: 'Invalid key.' }, { status: 400 })

    client = await getPool().connect()
    await client.query('BEGIN')
    transactionOpen = true
    const { rows: previousRows } = await client.query(
      `SELECT to_jsonb(setting) AS row
       FROM ${table} AS setting WHERE setting.${body.primaryKey} = $1 FOR UPDATE`,
      [body.primaryValue]
    )
    const previous = previousRows[0]?.row
    if (!previous) return NextResponse.json({ error: 'Setting not found.' }, { status: 404 })
    const { rowCount } = await client.query(
      `DELETE FROM ${table} WHERE ${body.primaryKey} = $1 RETURNING *`,
      [body.primaryValue]
    )
    if (!rowCount) return NextResponse.json({ error: 'Setting not found.' }, { status: 404 })
    const primaryValue = String(previous[body.primaryKey])
    await writeAdminAudit(client, {
      actorId,
      action: 'payment_setting_deleted',
      entityType: 'payment_setting',
      entityId: `${table}:${primaryValue}`,
      targetName: `${table} ${primaryValue}`,
      summary: `Deleted a ${table.replace('_', ' ')} setting.`,
      beforeState: { table, primaryKey: body.primaryKey, primaryValue, row: previous },
      afterState: null,
      canRestore: true
    })
    await client.query('COMMIT')
    transactionOpen = false
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (transactionOpen && client) {
      await rollbackTransaction(client, 'payment setting deletion')
      transactionOpen = false
    }
    console.error('Unable to delete payment setting:', error)
    const referenced = error && typeof error === 'object' && 'code' in error && error.code === '23503'
    return NextResponse.json(
      { error: referenced ? 'This setting is in use and cannot be removed. Disable it instead.' : 'Unable to delete payment setting.' },
      { status: referenced ? 409 : 500 }
    )
  } finally {
    if (transactionOpen && client) await rollbackTransaction(client, 'payment setting deletion')
    client?.release()
  }
}
