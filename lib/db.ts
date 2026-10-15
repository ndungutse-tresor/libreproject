import { Pool } from 'pg'

const globalForPg = globalThis as typeof globalThis & { libraPool?: Pool }

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured')
  }

  if (!globalForPg.libraPool) {
    globalForPg.libraPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true },
      max: 5
    })
  }

  return globalForPg.libraPool
}
