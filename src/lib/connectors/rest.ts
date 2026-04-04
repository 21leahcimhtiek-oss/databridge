import { decrypt } from '@/lib/encryption'

export interface RestConfig {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  auth?: {
    type: 'bearer' | 'basic' | 'api-key'
    token?: string
    username?: string
    password?: string
    key?: string
    header?: string
  }
  dataPath?: string
}

function buildHeaders(config: RestConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.headers,
  }
  if (config.auth) {
    const { auth } = config
    if (auth.type === 'bearer' && auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`
    } else if (auth.type === 'basic' && auth.username && auth.password) {
      const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString('base64')
      headers['Authorization'] = `Basic ${encoded}`
    } else if (auth.type === 'api-key' && auth.key) {
      const headerName = auth.header ?? 'X-API-Key'
      headers[headerName] = auth.key
    }
  }
  return headers
}

function extractData(data: unknown, dataPath?: string): Record<string, unknown>[] {
  if (!dataPath) {
    return Array.isArray(data)
      ? (data as Record<string, unknown>[])
      : [data as Record<string, unknown>]
  }
  const keys = dataPath.split('.')
  let current: unknown = data
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return []
    }
  }
  return Array.isArray(current)
    ? (current as Record<string, unknown>[])
    : [current as Record<string, unknown>]
}

export async function fetchFromRest(
  encryptedConfig: string,
  body?: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const config: RestConfig = JSON.parse(decrypt(encryptedConfig))
  const headers = buildHeaders(config)
  const fetchOptions: RequestInit = { method: config.method, headers }
  if (body && config.method !== 'GET' && config.method !== 'DELETE') {
    fetchOptions.body = JSON.stringify(body)
  }
  const response = await fetch(config.url, fetchOptions)
  if (!response.ok) {
    throw new Error(
      `REST request failed with status ${response.status}: ${await response.text()}`
    )
  }
  const data = await response.json()
  return extractData(data, config.dataPath)
}

export async function testRestConnection(
  encryptedConfig: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await fetchFromRest(encryptedConfig)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}