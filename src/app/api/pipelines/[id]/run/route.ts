import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/rate-limit'
import { decrypt } from '@/lib/encryption'
import { executeQuery } from '@/lib/connectors/postgres'

type DataRow = Record<string, unknown>

interface FilterRule {
  column: string
  operator: string
  value: unknown
}

interface AggregateConfig {
  column: string
  fn: string
  alias: string
}

function applyFilter(data: DataRow[], rules: FilterRule[]): DataRow[] {
  return data.filter(row =>
    rules.every(rule => {
      const val = row[rule.column]
      switch (rule.operator) {
        case 'eq': return val === rule.value
        case 'neq': return val !== rule.value
        case 'gt': return Number(val) > Number(rule.value)
        case 'lt': return Number(val) < Number(rule.value)
        case 'gte': return Number(val) >= Number(rule.value)
        case 'lte': return Number(val) <= Number(rule.value)
        case 'contains': return String(val).includes(String(rule.value))
        default: return true
      }
    }),
  )
}

function applyRename(data: DataRow[], mapping: Record<string, string>): DataRow[] {
  return data.map(row => {
    const newRow: DataRow = { ...row }
    for (const [oldKey, newKey] of Object.entries(mapping)) {
      if (oldKey in newRow) {
        newRow[newKey] = newRow[oldKey]
        delete newRow[oldKey]
      }
    }
    return newRow
  })
}

function applyAggregate(data: DataRow[], groupBy: string[], aggregates: AggregateConfig[]): DataRow[] {
  const groups = new Map<string, DataRow[]>()
  for (const row of data) {
    const key = groupBy.map(col => String(row[col])).join('\x00')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }
  return Array.from(groups.values()).map(rows => {
    const result: DataRow = {}
    for (const col of groupBy) result[col] = rows[0][col]
    for (const agg of aggregates) {
      const vals = rows.map(r => Number(r[agg.column])).filter(v => !isNaN(v))
      switch (agg.fn) {
        case 'sum': result[agg.alias] = vals.reduce((a, b) => a + b, 0); break
        case 'avg': result[agg.alias] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0; break
        case 'count': result[agg.alias] = rows.length; break
        case 'min': result[agg.alias] = vals.length ? Math.min(...vals) : null; break
        case 'max': result[agg.alias] = vals.length ? Math.max(...vals) : null; break
        default: result[agg.alias] = rows.length
      }
    }
    return result
  })
}

type PipelineNode = { id: string; type: string; config: Record<string, unknown> }
type PipelineEdge = { id: string; source: string; target: string }

async function executePipeline(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  nodes: PipelineNode[],
  edges: PipelineEdge[],
): Promise<{ data: DataRow[]; error: string | null }> {
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const node of nodes) { inDegree.set(node.id, 0); adj.set(node.id, []) }
  for (const edge of edges) {
    adj.get(edge.source)?.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }
  const queue: string[] = []
  for (const [id, deg] of inDegree) { if (deg === 0) queue.push(id) }
  const order: string[] = []
  while (queue.length > 0) {
    const curr = queue.shift()!
    order.push(curr)
    for (const next of adj.get(curr) ?? []) {
      const d = (inDegree.get(next) ?? 1) - 1
      inDegree.set(next, d)
      if (d === 0) queue.push(next)
    }
  }
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  let data: DataRow[] = []
  try {
    for (const nodeId of order) {
      const node = nodeMap.get(nodeId)
      if (!node) continue
      if (node.type === 'source') {
        const connectorId = node.config.connector_id as string | undefined
        const query = node.config.query as string | undefined
        if (connectorId && query) {
          const { data: connector } = await supabase.from('connectors').select('*').eq('id', connectorId).single()
          if (connector) {
            const enc = (connector.config_encrypted as Record<string, string>).encrypted
            const cfg = JSON.parse(decrypt(enc)) as Record<string, unknown>
            data = await executeQuery(cfg, query)
          }
        }
      } else if (node.type === 'transform') {
        const t = node.config.transform_type as string
        if (t === 'filter') data = applyFilter(data, (node.config.rules as FilterRule[]) ?? [])
        else if (t === 'rename') data = applyRename(data, (node.config.mapping as Record<string, string>) ?? {})
        else if (t === 'aggregate') data = applyAggregate(data, (node.config.group_by as string[]) ?? [], (node.config.aggregates as AggregateConfig[]) ?? [])
      }
    }
    return { data, error: null }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'Execution failed' }
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withRateLimit(req, async () => {
    try {
      const supabase = createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { data: userData } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
      if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const { data: pipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('id', params.id)
        .eq('org_id', userData.org_id)
        .single()
      if (pipelineError || !pipeline) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
      const { data: run, error: runError } = await supabase
        .from('pipeline_runs')
        .insert({ pipeline_id: params.id, org_id: userData.org_id, status: 'running', started_at: new Date().toISOString() })
        .select()
        .single()
      if (runError || !run) throw runError ?? new Error('Failed to create run')
      const cfg = pipeline.config as { nodes: PipelineNode[]; edges: PipelineEdge[] }
      const { data: finalData, error: execError } = await executePipeline(supabase, cfg.nodes, cfg.edges)
      const runStatus = execError ? 'failed' : 'success'
      const endedAt = new Date().toISOString()
      const runId = (run as { id: string }).id
      await supabase.from('pipeline_runs').update({
        status: runStatus,
        rows_processed: finalData.length,
        error_msg: execError,
        ended_at: endedAt,
      }).eq('id', runId)
      await supabase.from('pipelines').update({ last_run_at: endedAt }).eq('id', params.id)
      if (runStatus === 'failed') {
        const { data: alertConfig } = await supabase
          .from('alert_configs')
          .select('*')
          .eq('pipeline_id', params.id)
          .eq('org_id', userData.org_id)
          .maybeSingle()
        if (alertConfig?.on_failure && alertConfig.webhook_url) {
          await fetch(alertConfig.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'pipeline.run.failed', pipeline_id: params.id, run_id: runId, error: execError }),
          }).catch(() => {})
        }
      }
      return NextResponse.json({ run_id: runId, status: runStatus })
    } catch (error) {
      Sentry.captureException(error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}