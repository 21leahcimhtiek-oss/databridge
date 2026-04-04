export async function applySqlTransform(
  dataset: Record<string, unknown>[],
  sqlQuery: string
): Promise<Record<string, unknown>[]> {
  const alasql = (await import('alasql')).default
  alasql('DROP TABLE IF EXISTS __db_temp')
  alasql('CREATE TABLE __db_temp')
  alasql.tables['__db_temp'].data = dataset
  const normalizedQuery = sqlQuery.replace(/\bFROM\s+(\w+)/i, 'FROM __db_temp')
  const result: Record<string, unknown>[] = alasql(normalizedQuery)
  return result
}