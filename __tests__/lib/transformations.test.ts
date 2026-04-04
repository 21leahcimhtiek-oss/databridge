import { applyFilter } from '@/lib/transformations/filter'
import { applyRename } from '@/lib/transformations/rename'
import { applySqlTransform } from '@/lib/transformations/sql'

type DataRow = Record<string, unknown>

const sampleDataset: DataRow[] = [
  { id: 1, name: 'Alice', age: 30, city: 'New York', score: 95.5, deleted_at: null },
  { id: 2, name: 'Bob', age: 25, city: 'Boston', score: 82.0, deleted_at: null },
  { id: 3, name: 'Charlie', age: 35, city: 'New York', score: 77.3, deleted_at: '2024-01-01' },
  { id: 4, name: 'Diana', age: 28, city: 'Chicago', score: 91.2, deleted_at: null },
  { id: 5, name: 'Eve', age: 22, city: 'Boston', score: 65.0, deleted_at: null },
]

// ─── applyFilter ────────────────────────────────────────────────────────────

describe('applyFilter', () => {
  test('filters with "eq" operator', () => {
    const result = applyFilter(sampleDataset, {
      logic: 'AND',
      rules: [{ field: 'city', operator: 'eq', value: 'New York' }],
    })
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.city === 'New York')).toBe(true)
  })

  test('filters with "gt" operator', () => {
    const result = applyFilter(sampleDataset, {
      logic: 'AND',
      rules: [{ field: 'age', operator: 'gt', value: 28 }],
    })
    expect(result).toHaveLength(2)
    expect(result.every((r) => (r.age as number) > 28)).toBe(true)
  })

  test('filters with "lt" operator', () => {
    const result = applyFilter(sampleDataset, {
      logic: 'AND',
      rules: [{ field: 'score', operator: 'lt', value: 80 }],
    })
    expect(result).toHaveLength(2)
    expect(result.every((r) => (r.score as number) < 80)).toBe(true)
  })

  test('filters with "contains" operator', () => {
    const result = applyFilter(sampleDataset, {
      logic: 'AND',
      rules: [{ field: 'name', operator: 'contains', value: 'li' }],
    })
    expect(result).toHaveLength(2)
    const names = result.map((r) => r.name)
    expect(names).toContain('Alice')
    expect(names).toContain('Charlie')
  })

  test('filters with "is_null" operator', () => {
    const result = applyFilter(sampleDataset, {
      logic: 'AND',
      rules: [{ field: 'deleted_at', operator: 'is_null', value: null }],
    })
    expect(result).toHaveLength(4)
    expect(result.every((r) => r.deleted_at === null)).toBe(true)
  })

  test('filters with "not_null" operator', () => {
    const result = applyFilter(sampleDataset, {
      logic: 'AND',
      rules: [{ field: 'deleted_at', operator: 'not_null', value: null }],
    })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Charlie')
  })

  test('AND logic with multiple rules', () => {
    const result = applyFilter(sampleDataset, {
      logic: 'AND',
      rules: [
        { field: 'city', operator: 'eq', value: 'Boston' },
        { field: 'age', operator: 'lt', value: 25 },
      ],
    })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Eve')
  })

  test('OR logic with multiple rules', () => {
    const result = applyFilter(sampleDataset, {
      logic: 'OR',
      rules: [
        { field: 'city', operator: 'eq', value: 'Chicago' },
        { field: 'age', operator: 'eq', value: 22 },
      ],
    })
    expect(result).toHaveLength(2)
    const names = result.map((r) => r.name)
    expect(names).toContain('Diana')
    expect(names).toContain('Eve')
  })

  test('returns empty array when no rows match', () => {
    const result = applyFilter(sampleDataset, {
      logic: 'AND',
      rules: [{ field: 'name', operator: 'eq', value: 'Nobody' }],
    })
    expect(result).toHaveLength(0)
  })

  test('returns all rows when no rules provided', () => {
    const result = applyFilter(sampleDataset, { logic: 'AND', rules: [] })
    expect(result).toHaveLength(sampleDataset.length)
  })
})

// ─── applyRename ─────────────────────────────────────────────────────────────

describe('applyRename', () => {
  test('renames specified columns', () => {
    const result = applyRename(sampleDataset, {
      mappings: { name: 'full_name', age: 'years_old' },
    })
    expect(result[0]).toHaveProperty('full_name')
    expect(result[0]).toHaveProperty('years_old')
    expect(result[0]).not.toHaveProperty('name')
    expect(result[0]).not.toHaveProperty('age')
  })

  test('leaves unmapped columns unchanged', () => {
    const result = applyRename(sampleDataset, {
      mappings: { name: 'full_name' },
    })
    expect(result[0]).toHaveProperty('id')
    expect(result[0]).toHaveProperty('city')
    expect(result[0]).toHaveProperty('score')
    expect(result[0]).toHaveProperty('deleted_at')
  })

  test('handles empty mappings (no-op)', () => {
    const result = applyRename(sampleDataset, { mappings: {} })
    expect(result).toEqual(sampleDataset)
  })

  test('preserves values after rename', () => {
    const result = applyRename(sampleDataset, { mappings: { name: 'label' } })
    const alice = result.find((r) => r.label === 'Alice')
    expect(alice).toBeDefined()
    expect(alice?.id).toBe(1)
  })

  test('renames all columns', () => {
    const tiny = [{ a: 1, b: 2 }]
    const result = applyRename(tiny, { mappings: { a: 'x', b: 'y' } })
    expect(result[0]).toEqual({ x: 1, y: 2 })
  })
})

// ─── applySqlTransform ───────────────────────────────────────────────────────

jest.mock('alasql', () => {
  const alasql = jest.fn((query: string, params: unknown[][]) => {
    const data = params?.[0] as DataRow[] | undefined
    if (!data) return []

    const upper = query.toUpperCase()

    // SELECT *
    if (upper.includes('SELECT *')) return data

    // SELECT with specific columns
    const colMatch = query.match(/SELECT\s+(.+?)\s+FROM/i)
    if (colMatch) {
      const cols = colMatch[1].split(',').map((c: string) => c.trim())
      return data.map((row) => {
        const out: DataRow = {}
        for (const col of cols) out[col] = row[col]
        return out
      })
    }

    return data
  })
  return alasql
})

describe('applySqlTransform', () => {
  test('SELECT * returns all rows and columns', async () => {
    const result = await applySqlTransform(sampleDataset, {
      query: 'SELECT * FROM ?',
    })
    expect(result).toHaveLength(sampleDataset.length)
    expect(result[0]).toHaveProperty('id')
    expect(result[0]).toHaveProperty('name')
  })

  test('SELECT specific columns returns only those columns', async () => {
    const result = await applySqlTransform(sampleDataset, {
      query: 'SELECT id, name FROM ?',
    })
    expect(result).toHaveLength(sampleDataset.length)
    expect(result[0]).toHaveProperty('id')
    expect(result[0]).toHaveProperty('name')
    expect(result[0]).not.toHaveProperty('age')
    expect(result[0]).not.toHaveProperty('city')
  })

  test('handles empty dataset gracefully', async () => {
    const result = await applySqlTransform([], { query: 'SELECT * FROM ?' })
    expect(result).toEqual([])
  })
})