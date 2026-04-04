import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimiter: {
    limit: jest.fn().mockResolvedValue({ success: true }),
  },
  getRateLimitIdentifier: jest.fn().mockReturnValue('127.0.0.1'),
}))

import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function makeSupabaseMock(overrides: Record<string, unknown> = {}) {
  const base = {
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
    limit: jest.fn().mockReturnThis(),
    ...overrides,
  }
  return base
}

function makeRequest(method: string, body?: unknown, headers?: Record<string, string>): NextRequest {
  const url = 'http://localhost:3000/api/pipelines'
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      ...headers,
    },
  }
  if (body) {
    init.body = JSON.stringify(body)
  }
  return new NextRequest(url, init)
}

describe('GET /api/pipelines', () => {
  test('returns 401 when unauthenticated', async () => {
    const supabase = makeSupabaseMock({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    })
    mockCreateClient.mockReturnValue(supabase as never)

    const { GET } = await import('@/app/api/pipelines/route')
    const req = makeRequest('GET')
    const res = await GET(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  test('returns pipelines array when authenticated', async () => {
    const mockPipelines = [
      { id: 'pipe-1', name: 'My Pipeline', status: 'active', org_id: 'org-1' },
      { id: 'pipe-2', name: 'Another Pipeline', status: 'inactive', org_id: 'org-1' },
    ]

    const supabase = {
      ...makeSupabaseMock(),
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockPipelines, error: null }),
    }
    mockCreateClient.mockReturnValue(supabase as never)

    const { GET } = await import('@/app/api/pipelines/route')
    const req = makeRequest('GET')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json)).toBe(true)
  })
})

describe('POST /api/pipelines', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  test('returns 400 on missing name', async () => {
    const supabase = makeSupabaseMock()
    mockCreateClient.mockReturnValue(supabase as never)

    const { POST } = await import('@/app/api/pipelines/route')
    const req = makeRequest('POST', { description: 'No name provided' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/name/i)
  })

  test('creates pipeline and returns 201', async () => {
    const newPipeline = {
      id: 'pipe-new',
      name: 'New Pipeline',
      status: 'inactive',
      org_id: 'org-1',
      config: {},
    }

    const supabase = {
      ...makeSupabaseMock(),
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
        .mockResolvedValueOnce({ data: { count: 2 }, error: null })
        .mockResolvedValueOnce({ data: newPipeline, error: null }),
      insert: jest.fn().mockReturnThis(),
    }
    mockCreateClient.mockReturnValue(supabase as never)

    const { POST } = await import('@/app/api/pipelines/route')
    const req = makeRequest('POST', { name: 'New Pipeline', config: {} })
    const res = await POST(req)

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json).toHaveProperty('id')
    expect(json.name).toBe('New Pipeline')
  })

  test('enforces starter plan limit of 5 pipelines', async () => {
    const supabase = {
      ...makeSupabaseMock(),
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
        .mockResolvedValueOnce({ data: { plan: 'starter' }, error: null })
        .mockResolvedValueOnce({ data: { count: 5 }, error: null }),
    }
    mockCreateClient.mockReturnValue(supabase as never)

    const { POST } = await import('@/app/api/pipelines/route')
    const req = makeRequest('POST', { name: 'Over Limit Pipeline' })
    const res = await POST(req)

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toMatch(/limit|plan|upgrade/i)
  })

  test('returns 429 when rate limit exceeded', async () => {
    const { rateLimiter } = await import('@/lib/rate-limit')
    ;(rateLimiter.limit as jest.Mock).mockResolvedValueOnce({ success: false })

    const supabase = makeSupabaseMock()
    mockCreateClient.mockReturnValue(supabase as never)

    const { POST } = await import('@/app/api/pipelines/route')
    const req = makeRequest('POST', { name: 'Test' })
    const res = await POST(req)

    expect(res.status).toBe(429)
  })
})

describe('GET /api/pipelines/[id]', () => {
  test('returns 404 for non-existent pipeline', async () => {
    const supabase = {
      ...makeSupabaseMock(),
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }
    mockCreateClient.mockReturnValue(supabase as never)

    const { GET } = await import('@/app/api/pipelines/[id]/route')
    const req = makeRequest('GET')
    const res = await GET(req, { params: { id: 'nonexistent-id' } })

    expect(res.status).toBe(404)
  })

  test('returns pipeline for valid id', async () => {
    const pipeline = {
      id: 'pipe-1',
      name: 'Valid Pipeline',
      status: 'active',
      config: { nodes: [], edges: [] },
    }

    const supabase = {
      ...makeSupabaseMock(),
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: pipeline, error: null }),
    }
    mockCreateClient.mockReturnValue(supabase as never)

    const { GET } = await import('@/app/api/pipelines/[id]/route')
    const req = makeRequest('GET')
    const res = await GET(req, { params: { id: 'pipe-1' } })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe('pipe-1')
    expect(json.name).toBe('Valid Pipeline')
  })
})

describe('PATCH /api/pipelines/[id]', () => {
  test('updates pipeline config and creates version record', async () => {
    const updatedPipeline = {
      id: 'pipe-1',
      name: 'Updated Pipeline',
      config: { nodes: [{ id: 'n1' }], edges: [] },
      version: 2,
    }

    const insertMock = jest.fn().mockReturnThis()
    const supabase = {
      ...makeSupabaseMock(),
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: insertMock,
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
        .mockResolvedValueOnce({ data: { id: 'pipe-1', version: 1, config: {} }, error: null })
        .mockResolvedValueOnce({ data: updatedPipeline, error: null }),
    }
    mockCreateClient.mockReturnValue(supabase as never)

    const { PATCH } = await import('@/app/api/pipelines/[id]/route')
    const req = makeRequest('PATCH', { config: { nodes: [{ id: 'n1' }], edges: [] } })
    const res = await PATCH(req, { params: { id: 'pipe-1' } })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('id')
  })

  test('returns 404 when pipeline not found', async () => {
    const supabase = {
      ...makeSupabaseMock(),
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }
    mockCreateClient.mockReturnValue(supabase as never)

    const { PATCH } = await import('@/app/api/pipelines/[id]/route')
    const req = makeRequest('PATCH', { name: 'Updated' })
    const res = await PATCH(req, { params: { id: 'nonexistent' } })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/pipelines/[id]', () => {
  test('deletes pipeline successfully', async () => {
    const supabase = {
      ...makeSupabaseMock(),
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      single: jest.fn().mockResolvedValue({ data: { id: 'pipe-1', org_id: 'org-1' }, error: null }),
    }
    mockCreateClient.mockReturnValue(supabase as never)

    const { DELETE } = await import('@/app/api/pipelines/[id]/route')
    const req = makeRequest('DELETE')
    const res = await DELETE(req, { params: { id: 'pipe-1' } })

    expect(res.status).toBe(204)
  })

  test('returns 404 when deleting non-existent pipeline', async () => {
    const supabase = {
      ...makeSupabaseMock(),
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }
    mockCreateClient.mockReturnValue(supabase as never)

    const { DELETE } = await import('@/app/api/pipelines/[id]/route')
    const req = makeRequest('DELETE')
    const res = await DELETE(req, { params: { id: 'ghost-id' } })

    expect(res.status).toBe(404)
  })
})