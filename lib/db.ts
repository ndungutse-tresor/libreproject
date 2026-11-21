import { Pool } from 'pg'

const globalForPg = globalThis as typeof globalThis & { libraPool?: Pool }

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured')
  }

  if (!globalForPg.libraPool) {
    globalForPg.libraPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Neon and other hosted databases need TLS. DATABASE_SSL=false is only for a local Postgres.
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: true },
      max: 5
    })
  }

  return globalForPg.libraPool
}
