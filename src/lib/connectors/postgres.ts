import { Pool } from 'pg'
import { decrypt } from '@/lib/encryption'

export interface PostgresConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean
}

export async function testPostgresConnection(
  encryptedConfig: string
): Promise<{ success: boolean; error?: string }> {
  let pool: Pool | null = null
  try {
    const config: PostgresConfig = JSON.parse(decrypt(encryptedConfig))
    pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
    await pool.query('SELECT 1')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  } finally {
    await pool?.end()
  }
}

export async function executeQuery(
  encryptedConfig: string,
  query: string,
  params?: unknown[]
): Promise<Record<string, unknown>[]> {
  let pool: Pool | null = null
  try {
    const config: PostgresConfig = JSON.parse(decrypt(encryptedConfig))
    pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
    const result = await pool.query(query, params as unknown[])
    return result.rows as Record<string, unknown>[]
  } finally {
    await pool?.end()
  }
}