export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'not_contains'
  | 'is_null'
  | 'is_not_null'

export interface FilterRule {
  column: string
  operator: FilterOperator
  value?: unknown
}

export interface FilterConfig {
  rules: FilterRule[]
  logic: 'AND' | 'OR'
}

function applyRule(row: Record<string, unknown>, rule: FilterRule): boolean {
  const cell = row[rule.column]
  switch (rule.operator) {
    case 'eq':
      return cell === rule.value
    case 'neq':
      return cell !== rule.value
    case 'gt':
      return typeof cell === 'number' && typeof rule.value === 'number' && cell > rule.value
    case 'gte':
      return typeof cell === 'number' && typeof rule.value === 'number' && cell >= rule.value
    case 'lt':
      return typeof cell === 'number' && typeof rule.value === 'number' && cell < rule.value
    case 'lte':
      return typeof cell === 'number' && typeof rule.value === 'number' && cell <= rule.value
    case 'contains':
      return typeof cell === 'string' && typeof rule.value === 'string' && cell.includes(rule.value)
    case 'not_contains':
      return (
        typeof cell === 'string' && typeof rule.value === 'string' && !cell.includes(rule.value)
      )
    case 'is_null':
      return cell === null || cell === undefined
    case 'is_not_null':
      return cell !== null && cell !== undefined
    default:
      return true
  }
}

export function applyFilter(
  dataset: Record<string, unknown>[],
  config: FilterConfig
): Record<string, unknown>[] {
  if (config.rules.length === 0) return dataset
  return dataset.filter((row) =>
    config.logic === 'AND'
      ? config.rules.every((r) => applyRule(row, r))
      : config.rules.some((r) => applyRule(row, r))
  )
}