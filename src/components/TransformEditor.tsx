'use client'

import { useState } from 'react'

interface FilterRule {
  column: string
  operator: string
  value: string
}

interface AggregateConfig {
  column: string
  fn: string
  alias: string
}

const OPERATORS = ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'contains']
const AGG_FNS = ['sum', 'avg', 'count', 'min', 'max']
const TABS = ['sql', 'filter', 'rename', 'aggregate'] as const
type TabType = typeof TABS[number]

interface TransformEditorProps {
  nodeId: string
  pipelineId: string
  initialConfig?: Record<string, unknown>
  transformType: string
  onSave?: (config: Record<string, unknown>) => void
}

export default function TransformEditor({
  nodeId,
  pipelineId,
  initialConfig = {},
  transformType,
  onSave,
}: TransformEditorProps) {
  const [activeTab, setActiveTab] = useState<TabType>(
    (TABS.includes(transformType as TabType) ? transformType : 'sql') as TabType,
  )
  const [sqlQuery, setSqlQuery] = useState((initialConfig.sql as string) ?? '')
  const [filterRules, setFilterRules] = useState<FilterRule[]>(
    (initialConfig.rules as FilterRule[]) ?? [],
  )
  const [renameMapping, setRenameMapping] = useState<Record<string, string>>(
    (initialConfig.mapping as Record<string, string>) ?? {},
  )
  const [groupBy, setGroupBy] = useState<string>((initialConfig.group_by as string[])?.join(', ') ?? '')
  const [aggregates, setAggregates] = useState<AggregateConfig[]>(
    (initialConfig.aggregates as AggregateConfig[]) ?? [],
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const buildConfig = (): Record<string, unknown> => {
    switch (activeTab) {
      case 'sql': return { transform_type: 'sql', sql: sqlQuery }
      case 'filter': return { transform_type: 'filter', rules: filterRules }
      case 'rename': return { transform_type: 'rename', mapping: renameMapping }
      case 'aggregate': return {
        transform_type: 'aggregate',
        group_by: groupBy.split(',').map(s => s.trim()).filter(Boolean),
        aggregates,
      }
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    const config = buildConfig()
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { nodes: [{ id: nodeId, config }], edges: [], version: 1 } }),
      })
      if (res.ok) {
        setSaved(true)
        onSave?.(config)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  const addFilterRule = () => setFilterRules(r => [...r, { column: '', operator: 'eq', value: '' }])
  const updateFilterRule = (i: number, field: keyof FilterRule, val: string) =>
    setFilterRules(r => r.map((rule, idx) => idx === i ? { ...rule, [field]: val } : rule))
  const removeFilterRule = (i: number) => setFilterRules(r => r.filter((_, idx) => idx !== i))

  const addAggregate = () => setAggregates(a => [...a, { column: '', fn: 'sum', alias: '' }])
  const updateAggregate = (i: number, field: keyof AggregateConfig, val: string) =>
    setAggregates(a => a.map((ag, idx) => idx === i ? { ...ag, [field]: val } : ag))
  const removeAggregate = (i: number) => setAggregates(a => a.filter((_, idx) => idx !== i))

  const inputCls = 'border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500'

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {activeTab === 'sql' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">SQL Query</label>
            <textarea
              value={sqlQuery}
              onChange={e => setSqlQuery(e.target.value)}
              rows={8}
              placeholder="SELECT * FROM source WHERE ..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
          </div>
        )}

        {activeTab === 'filter' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Filter Rules</span>
              <button onClick={addFilterRule} className="text-xs text-indigo-600 hover:underline">+ Add Rule</button>
            </div>
            {filterRules.map((rule, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={rule.column} onChange={e => updateFilterRule(i, 'column', e.target.value)}
                  placeholder="Column" className={`${inputCls} flex-1`} />
                <select value={rule.operator} onChange={e => updateFilterRule(i, 'operator', e.target.value)}
                  className={inputCls}>
                  {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                </select>
                <input value={rule.value} onChange={e => updateFilterRule(i, 'value', e.target.value)}
                  placeholder="Value" className={`${inputCls} flex-1`} />
                <button onClick={() => removeFilterRule(i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'rename' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Column Mapping (old → new)</span>
              <button
                onClick={() => setRenameMapping(m => ({ ...m, '': '' }))}
                className="text-xs text-indigo-600 hover:underline"
              >
                + Add Mapping
              </button>
            </div>
            {Object.entries(renameMapping).map(([oldKey, newKey], i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={oldKey}
                  onChange={e => {
                    const entries = Object.entries(renameMapping)
                    entries[i] = [e.target.value, newKey]
                    setRenameMapping(Object.fromEntries(entries))
                  }}
                  placeholder="Old name"
                  className={`${inputCls} flex-1`}
                />
                <span className="text-gray-400">→</span>
                <input
                  value={newKey}
                  onChange={e => setRenameMapping(m => ({ ...m, [oldKey]: e.target.value }))}
                  placeholder="New name"
                  className={`${inputCls} flex-1`}
                />
                <button
                  onClick={() => setRenameMapping(m => { const n = { ...m }; delete n[oldKey]; return n })}
                  className="text-red-400 hover:text-red-600 text-sm"
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'aggregate' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Group By (comma-separated columns)</label>
              <input value={groupBy} onChange={e => setGroupBy(e.target.value)}
                placeholder="col1, col2" className={`${inputCls} w-full`} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Aggregates</span>
                <button onClick={addAggregate} className="text-xs text-indigo-600 hover:underline">+ Add</button>
              </div>
              {aggregates.map((agg, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={agg.column} onChange={e => updateAggregate(i, 'column', e.target.value)}
                    placeholder="Column" className={`${inputCls} flex-1`} />
                  <select value={agg.fn} onChange={e => updateAggregate(i, 'fn', e.target.value)} className={inputCls}>
                    {AGG_FNS.map(fn => <option key={fn} value={fn}>{fn}</option>)}
                  </select>
                  <span className="text-gray-400 text-sm">as</span>
                  <input value={agg.alias} onChange={e => updateAggregate(i, 'alias', e.target.value)}
                    placeholder="Alias" className={`${inputCls} flex-1`} />
                  <button onClick={() => removeAggregate(i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Transform'}
        </button>
      </div>
    </div>
  )
}