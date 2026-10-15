import { NextResponse } from 'next/server'
import { hasPaymentAdminAccess } from '@/lib/admin'
import { getPool } from '@/lib/db'

export const runtime = 'nodejs'

const tables = {
  payment_methods: { primaryKey: 'id', columns: ['key', 'label', 'provider', 'currencies', 'enabled', 'config'] },
  plans: { primaryKey: 'id', columns: ['kind', 'name', 'minutes', 'duration_days', 'price_usd', 'enabled'] },
  coupons: { primaryKey: 'code', columns: ['code', 'percent_off', 'max_uses', 'expires_at', 'enabled'] },
  currencies: { primaryKey: 'code', columns: ['code', 'symbol', 'rate_to_usd', 'enabled'] }
} as const

type TableName = keyof typeof tables

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
  try {
    if (!(await hasPaymentAdminAccess())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    const { rows } = await getPool().query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      params
    )
    return NextResponse.json({ row: rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Unable to create payment setting:', error)
    const duplicate = error && typeof error === 'object' && 'code' in error && error.code === '23505'
    return NextResponse.json({ error: duplicate ? 'That key already exists.' : 'Unable to create payment setting.' }, { status: duplicate ? 409 : 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await hasPaymentAdminAccess())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await request.json()
    if (!validTable(body.table) || typeof body.primaryKey !== 'string' || typeof body.primaryValue !== 'string' || typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid update.' }, { status: 400 })
    }
    const table = body.table as TableName
    if (tables[table].primaryKey !== body.primaryKey) return NextResponse.json({ error: 'Invalid key.' }, { status: 400 })

    const { rows } = await getPool().query(
      `UPDATE ${table} SET enabled = $1 WHERE ${body.primaryKey} = $2 RETURNING *`,
      [body.enabled, body.primaryValue]
    )
    if (!rows[0]) return NextResponse.json({ error: 'Setting not found.' }, { status: 404 })
    return NextResponse.json({ row: rows[0] })
  } catch (error) {
    console.error('Unable to update payment setting:', error)
    return NextResponse.json({ error: 'Unable to update payment setting.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await hasPaymentAdminAccess())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await request.json()
    if (!validTable(body.table) || typeof body.primaryKey !== 'string' || typeof body.primaryValue !== 'string') {
      return NextResponse.json({ error: 'Invalid delete request.' }, { status: 400 })
    }
    const table = body.table as TableName
    if (tables[table].primaryKey !== body.primaryKey) return NextResponse.json({ error: 'Invalid key.' }, { status: 400 })

    const { rowCount } = await getPool().query(
      `DELETE FROM ${table} WHERE ${body.primaryKey} = $1`,
      [body.primaryValue]
    )
    if (!rowCount) return NextResponse.json({ error: 'Setting not found.' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Unable to delete payment setting:', error)
    return NextResponse.json({ error: 'Unable to delete payment setting.' }, { status: 500 })
  }
}
