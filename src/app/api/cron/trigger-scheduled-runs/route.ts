import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import cronParser from 'cron-parser'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'
import { executeQuery } from '@/lib/connectors/postgres'

type DataRow = Record<string, unknown>
type PipelineNode = { id: string; type: string; config: Record<string, unknown> }
type PipelineEdge = { id: string; source: string; target: string }

function topoSort(nodes: PipelineNode[], edges: PipelineEdge[]): string[] {
  const inDeg = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const n of nodes) { inDeg.set(n.id, 0); adj.set(n.id, []) }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target)
    inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1)
  }
  const q: string[] = []
  for (const [id, d] of inDeg) { if (d === 0) q.push(id) }
  const order: string[] = []
  while (q.length) {
    const curr = q.shift()!
    order.push(curr)
    for (const next of adj.get(curr) ?? []) {
      const d = (inDeg.get(next) ?? 1) - 1
      inDeg.set(next, d)
      if (d === 0) q.push(next)
    }
  }
  return order
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createSupabaseServerClient()
    const now = new Date().toISOString()
    const { data: dueSchedules, error } = await supabase
      .from('schedules')
      .select('*, pipelines(*)')
      .eq('enabled', true)
      .lte('next_run_at', now)
    if (error) throw error
    const triggered: string[] = []
    for (const schedule of dueSchedules ?? []) {
      const pipeline = schedule.pipelines as {
        id: string
        org_id: string
        config: { nodes: PipelineNode[]; edges: PipelineEdge[] }
      } | null
      if (!pipeline) continue
      const { data: run } = await supabase
        .from('pipeline_runs')
        .insert({ pipeline_id: pipeline.id, org_id: pipeline.org_id, status: 'running', started_at: new Date().toISOString() })
        .select()
        .single()
      if (!run) continue
      const runId = (run as { id: string }).id
      let finalData: DataRow[] = []
      let runStatus: 'success' | 'failed' = 'success'
      let errorMsg: string | null = null
      try {
        const { nodes, edges } = pipeline.config
        const nodeMap = new Map(nodes.map(n => [n.id, n]))
        for (const nodeId of topoSort(nodes, edges)) {
          const node = nodeMap.get(nodeId)
          if (!node) continue
          if (node.type === 'source') {
            const connId = node.config.connector_id as string | undefined
            const query = node.config.query as string | undefined
            if (connId && query) {
              const { data: conn } = await supabase.from('connectors').select('*').eq('id', connId).single()
              if (conn) {
                const enc = (conn.config_encrypted as Record<string, string>).encrypted
                finalData = await executeQuery(JSON.parse(decrypt(enc)) as Record<string, unknown>, query)
              }
            }
          } else if (node.type === 'transform') {
            const t = node.config.transform_type as string
            if (t === 'filter') {
              const rules = (node.config.rules as Array<{ column: string; operator: string; value: unknown }>) ?? []
              finalData = finalData.filter(row => rules.every(r => {
                const v = row[r.column]
                if (r.operator === 'eq') return v === r.value
                if (r.operator === 'neq') return v !== r.value
                if (r.operator === 'gt') return Number(v) > Number(r.value)
                if (r.operator === 'lt') return Number(v) < Number(r.value)
                return true
              }))
            } else if (t === 'rename') {
              const mapping = (node.config.mapping as Record<string, string>) ?? {}
              finalData = finalData.map(row => {
                const nr = { ...row }
                for (const [ok, nk] of Object.entries(mapping)) {
                  if (ok in nr) { nr[nk] = nr[ok]; delete nr[ok] }
                }
                return nr
              })
            }
          }
        }
      } catch (e) {
        runStatus = 'failed'
        errorMsg = e instanceof Error ? e.message : 'Execution failed'
      }
      const endedAt = new Date().toISOString()
      await supabase.from('pipeline_runs').update({
        status: runStatus,
        rows_processed: finalData.length,
        error_msg: errorMsg,
        ended_at: endedAt,
      }).eq('id', runId)
      await supabase.from('pipelines').update({ last_run_at: endedAt }).eq('id', pipeline.id)
      let nextRunAt: string | null = null
      try {
        nextRunAt = cronParser.parseExpression(schedule.cron_expr as string).next().toDate().toISOString()
      } catch { nextRunAt = null }
      await supabase.from('schedules').update({
        last_triggered_at: new Date().toISOString(),
        next_run_at: nextRunAt,
      }).eq('id', schedule.id)
      triggered.push(schedule.id as string)
    }
    return NextResponse.json({ triggered: triggered.length, schedules: triggered })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}