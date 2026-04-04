import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/rate-limit'

const NodeTypeEnum = z.enum(['source', 'transform', 'destination'])

const PipelineConfigSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    type: NodeTypeEnum,
    config: z.record(z.unknown()),
    position: z.object({ x: z.number(), y: z.number() }),
  })),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
  })),
  version: z.number().default(1),
})

const CreatePipelineSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  config: PipelineConfigSchema,
})

const PLAN_LIMITS: Record<string, number> = {
  starter: 5,
  pro: Infinity,
  enterprise: Infinity,
}

export async function GET(req: NextRequest) {
  return withRateLimit(req, async () => {
    try {
      const supabase = createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { data: userData } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
      if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const { data: pipelines, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('org_id', userData.org_id)
        .order('created_at', { ascending: false })
      if (error) throw error
      const pipelineIds = (pipelines ?? []).map((p: { id: string }) => p.id)
      const runCounts: Record<string, number> = {}
      if (pipelineIds.length > 0) {
        const { data: runs } = await supabase
          .from('pipeline_runs')
          .select('pipeline_id')
          .in('pipeline_id', pipelineIds)
        for (const run of runs ?? []) {
          const r = run as { pipeline_id: string }
          runCounts[r.pipeline_id] = (runCounts[r.pipeline_id] ?? 0) + 1
        }
      }
      const result = (pipelines ?? []).map((p: Record<string, unknown>) => ({
        ...p,
        run_count: runCounts[p.id as string] ?? 0,
      }))
      return NextResponse.json({ data: result, error: null })
    } catch (error) {
      Sentry.captureException(error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}

export async function POST(req: NextRequest) {
  return withRateLimit(req, async () => {
    try {
      const supabase = createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { data: userData } = await supabase
        .from('users')
        .select('org_id, role, orgs(plan)')
        .eq('id', user.id)
        .single()
      if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      if (!(['admin', 'engineer'] as string[]).includes(userData.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const org = userData.orgs as { plan: string } | null
      const plan = org?.plan ?? 'starter'
      const limit = PLAN_LIMITS[plan] ?? 5
      if (isFinite(limit)) {
        const { count } = await supabase
          .from('pipelines')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', userData.org_id)
        if ((count ?? 0) >= limit) {
          return NextResponse.json(
            { error: `Plan limit reached: ${plan} allows up to ${limit} pipelines` },
            { status: 403 },
          )
        }
      }
      const body = await req.json()
      const parsed = CreatePipelineSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 })
      const { name, description, config } = parsed.data
      const { data: pipeline, error } = await supabase
        .from('pipelines')
        .insert({
          org_id: userData.org_id,
          name,
          description: description ?? null,
          config,
          status: 'draft',
        })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ data: pipeline, error: null }, { status: 201 })
    } catch (error) {
      Sentry.captureException(error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}