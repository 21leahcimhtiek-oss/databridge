import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import cronParser from 'cron-parser'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/rate-limit'

const UpdateScheduleSchema = z.object({
  cron_expr: z.string().optional(),
  enabled: z.boolean().optional(),
})

async function getOrgPipelineIds(supabase: ReturnType<typeof createSupabaseServerClient>, orgId: string): Promise<string[]> {
  const { data } = await supabase.from('pipelines').select('id').eq('org_id', orgId)
  return (data ?? []).map((p: { id: string }) => p.id)
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withRateLimit(req, async () => {
    try {
      const supabase = createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { data: userData } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
      if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const pipelineIds = await getOrgPipelineIds(supabase, userData.org_id)
      const { data: schedule, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('id', params.id)
        .in('pipeline_id', pipelineIds.length > 0 ? pipelineIds : [''])
        .single()
      if (error || !schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
      return NextResponse.json({ data: schedule, error: null })
    } catch (error) {
      Sentry.captureException(error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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
      const parsed = UpdateScheduleSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 })
      const { cron_expr, enabled } = parsed.data
      const updates: Record<string, unknown> = {}
      if (enabled !== undefined) updates.enabled = enabled
      if (cron_expr !== undefined) {
        try {
          const interval = cronParser.parseExpression(cron_expr)
          updates.cron_expr = cron_expr
          updates.next_run_at = interval.next().toDate().toISOString()
        } catch {
          return NextResponse.json({ error: 'Invalid cron expression' }, { status: 400 })
        }
      }
      const pipelineIds = await getOrgPipelineIds(supabase, userData.org_id)
      const { data: schedule, error } = await supabase
        .from('schedules')
        .update(updates)
        .eq('id', params.id)
        .in('pipeline_id', pipelineIds.length > 0 ? pipelineIds : [''])
        .select()
        .single()
      if (error || !schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
      return NextResponse.json({ data: schedule, error: null })
    } catch (error) {
      Sentry.captureException(error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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
      const pipelineIds = await getOrgPipelineIds(supabase, userData.org_id)
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', params.id)
        .in('pipeline_id', pipelineIds.length > 0 ? pipelineIds : [''])
      if (error) throw error
      return NextResponse.json({ data: { deleted: true }, error: null })
    } catch (error) {
      Sentry.captureException(error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}