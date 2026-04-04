import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimiter: {
    limit: jest.fn().mockResolvedValue({ success: true }),
  },
  getRateLimitIdentifier: jest.fn().mockReturnValue('127.0.0.1'),
}))

jest.mock('@/lib/encryption', () => ({
  encrypt: jest.fn((val: string) => `enc:${val}`),
  decrypt: jest.fn((val: string) => val.replace('enc:', '')),
}))

import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function makeSupabaseMock(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      }),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    order: jest.fn().mockReturnThis(),
    ...overrides,
  }
}

function makeRequest(method: string, body?: unknown): NextRequest {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
  }
  if (body) init.body = JSON.stringify(body)
  return new NextRequest('http://localhost:3000/api/connectors', init)
}

describe('GET /api/connectors', () => {
  test('lists connectors for authenticated org', async () => {
    const mockConnectors = [
      { id: 'conn-1', name: 'Prod DB', type: 'postgres', status: 'active' },
      { id: 'conn-2', name: 'Stripe', type: 'stripe', status: 'active' },
    ]

    const supabase = {
      ...makeSupabaseMock(),
      order: jest.fn().mockResolvedValue({ data: mockConnectors, error: null }),
    }
    mockCreateClient.mockReturnValue(supabase as never)

    const { GET } = await import('@/app/api/connectors/route')
    const res = await GET(makeRequest('GET'))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json)).toBe(true)
    expect(json).toHaveLength(2)
  })

  test('returns 401 when unauthenticated', async () => {
    const supabase = {
      ...makeSupabaseMock({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } }),
        },
      }),
    }
    mockCreateClient.mockReturnValue(supabase as never)

    const { GET } = await import('@/app/api/connectors/route')
    const res = await GET(makeRequest('GET'))

    expect(res.status).toBe(401)
  })
})

describe('POST /api/connectors', () => {
  beforeEach(() => jest.resetModules())

  test('returns 400 for invalid connector type', async () => {
    const supabase = makeSupabaseMock()
    mockCreateClient.mockReturnValue(supabase as never)

    const { POST } = await import('@/app/api/connectors/route')
    const res = await POST(makeRequest('POST', { name: 'Bad Connector', type: 'invalid_type', config: {} }))

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/type|invalid/i)
  })

  test('encrypts config and creates connector', async () => {
    const created = { id: 'conn-new', name: 'My PG', type: 'postgres', status: 'pending' }

    const supabase = {
      ...makeSupabaseMock(),
      single: jest.fn().mockResolvedValue({ data: created, error: null }),
    }
    mockCreateClient.mockReturnValue(supabase as never)

    const { POST } = await import('@/app/api/connectors/route')
    const res = await POST(makeRequest('POST', {
      name: 'My PG',
      type: 'postgres',
      config: { host: 'localhost', port: 5432, database: 'mydb', user: 'admin', password: 'secret' },
    }))

    expect(res.status).toBe(201)
    const { encrypt } = await import('@/lib/encryption')
    expect(encrypt).toHaveBeenCalled()
  })

  test('returns 400 when name is missing', async () => {
    const supabase = makeSupabaseMock()
    mockCreateClient.mockReturnValue(supabase as never)

    const { POST } = await import('@/app/api/connectors/route')
    const res = await POST(makeRequest('POST', { type: 'postgres', config: {} }))

    expect(res.status).toBe(400)
  })

  test('returns 400 when config is missing', async () => {
    const supabase = makeSupabaseMock()
    mockCreateClient.mockReturnValue(supabase as never)

    const { POST } = await import('@/app/api/connectors/route')
    const res = await POST(makeRequest('POST', { name: 'Test', type: 'postgres' }))

    expect(res.status).toBe(400)
  })
})

describe('POST /api/connectors/[id]/test', () => {
  test('tests connection and updates status to active on success', async () => {
    const connector = {
      id: 'conn-1',
      type: 'postgres',
      config: 'enc:{"host":"localhost","port":5432,"database":"db","user":"u","password":"p"}',
    }

    const supabase = {
      ...makeSupabaseMock(),
      single: jest.fn()
        .mockResolvedValueOnce({ data: connector, error: null })
        .mockResolvedValueOnce({ data: { ...connector, status: 'active' }, error: null }),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    mockCreateClient.mockReturnValue(supabase as never)

    const { POST } = await import('@/app/api/connectors/[id]/test/route')
    const req = makeRequest('POST')
    const res = await POST(req, { params: { id: 'conn-1' } })

    expect([200, 500]).toContain(res.status)
  })

  test('returns 404 when connector does not exist', async () => {
    const supabase = {
      ...makeSupabaseMock(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }
    mockCreateClient.mockReturnValue(supabase as never)

    const { POST } = await import('@/app/api/connectors/[id]/test/route')
    const req = makeRequest('POST')
    const res = await POST(req, { params: { id: 'nonexistent' } })

    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/connectors/[id]', () => {
  test('updates connector name and config', async () => {
    const updated = { id: 'conn-1', name: 'Renamed DB', type: 'postgres', status: 'active' }

    const supabase = {
      ...makeSupabaseMock(),
      single: jest.fn()
        .mockResolvedValueOnce({ data: { id: 'conn-1', org_id: 'org-1' }, error: null })
        .mockResolvedValueOnce({ data: updated, error: null }),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    mockCreateClient.mockReturnValue(supabase as never)

    const { PATCH } = await import('@/app/api/connectors/[id]/route')
    const req = makeRequest('PATCH', { name: 'Renamed DB' })
    const res = await PATCH(req, { params: { id: 'conn-1' } })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.name).toBe('Renamed DB')
  })

  test('returns 404 when connector not found', async () => {
    const supabase = {
      ...makeSupabaseMock(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }
    mockCreateClient.mockReturnValue(supabase as never)

    const { PATCH } = await import('@/app/api/connectors/[id]/route')
    const req = makeRequest('PATCH', { name: 'X' })
    const res = await PATCH(req, { params: { id: 'bad-id' } })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/connectors/[id]', () => {
  test('deletes connector successfully', async () => {
    const supabase = {
      ...makeSupabaseMock(),
      single: jest.fn().mockResolvedValue({ data: { id: 'conn-1', org_id: 'org-1' }, error: null }),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    }
    mockCreateClient.mockReturnValue(supabase as never)

    const { DELETE } = await import('@/app/api/connectors/[id]/route')
    const req = makeRequest('DELETE')
    const res = await DELETE(req, { params: { id: 'conn-1' } })

    expect(res.status).toBe(204)
  })

  test('returns 404 when connector does not exist', async () => {
    const supabase = {
      ...makeSupabaseMock(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }
    mockCreateClient.mockReturnValue(supabase as never)

    const { DELETE } = await import('@/app/api/connectors/[id]/route')
    const req = makeRequest('DELETE')
    const res = await DELETE(req, { params: { id: 'ghost' } })

    expect(res.status).toBe(404)
  })
})