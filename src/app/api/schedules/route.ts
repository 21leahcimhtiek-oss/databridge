import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import cronParser from 'cron-parser'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/rate-limit'

const CreateScheduleSchema = z.object({
  pipeline_id: z.string().uuid(),
  cron_expr: z.string(),
  enabled: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  return withRateLimit(req, async () => {
    try {
      const supabase = createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { data: userData } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
      if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const { data: orgPipelines } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('org_id', userData.org_id)
      const pipelineIds = (orgPipelines ?? []).map((p: { id: string }) => p.id)
      const pipelineNames: Record<string, string> = Object.fromEntries(
        (orgPipelines ?? []).map((p: { id: string; name: string }) => [p.id, p.name]),
      )
      const { data: schedules, error } = await supabase
        .from('schedules')
        .select('*')
        .in('pipeline_id', pipelineIds.length > 0 ? pipelineIds : [''])
        .order('created_at', { ascending: false })
      if (error) throw error
      const result = (schedules ?? []).map((s: Record<string, unknown>) => ({
        ...s,
        pipeline_name: pipelineNames[s.pipeline_id as string] ?? null,
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
      const { data: userData } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
      if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      if (!(['admin', 'engineer'] as string[]).includes(userData.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const body = await req.json()
      const parsed = CreateScheduleSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 })
      const { pipeline_id, cron_expr, enabled } = parsed.data
      let nextRunAt: string
      try {
        const interval = cronParser.parseExpression(cron_expr)
        nextRunAt = interval.next().toDate().toISOString()
      } catch {
        return NextResponse.json({ error: 'Invalid cron expression' }, { status: 400 })
      }
      const { data: pipeline } = await supabase
        .from('pipelines')
        .select('id')
        .eq('id', pipeline_id)
        .eq('org_id', userData.org_id)
        .single()
      if (!pipeline) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
      const { data: schedule, error } = await supabase
        .from('schedules')
        .insert({ pipeline_id, cron_expr, enabled, next_run_at: nextRunAt })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ data: schedule, error: null }, { status: 201 })
    } catch (error) {
      Sentry.captureException(error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}