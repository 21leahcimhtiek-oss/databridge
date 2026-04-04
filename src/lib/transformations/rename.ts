export interface RenameConfig {
  mappings: Record<string, string>
}

export function applyRename(
  dataset: Record<string, unknown>[],
  config: RenameConfig
): Record<string, unknown>[] {
  return dataset.map((row) => {
    const newRow: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      newRow[config.mappings[key] ?? key] = value
    }
    return newRow
  })
}