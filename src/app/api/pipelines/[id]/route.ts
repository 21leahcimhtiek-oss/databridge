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
  version: z.number(),
})

const UpdatePipelineSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  config: PipelineConfigSchema.optional(),
  status: z.enum(['active', 'paused', 'draft']).optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withRateLimit(req, async () => {
    try {
      const supabase = createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { data: userData } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
      if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const { data: pipeline, error } = await supabase
        .from('pipelines')
        .select('*, pipeline_nodes(*), pipeline_edges(*), transformations(*)')
        .eq('id', params.id)
        .eq('org_id', userData.org_id)
        .single()
      if (error || !pipeline) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
      return NextResponse.json({ data: pipeline, error: null })
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
      const parsed = UpdatePipelineSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 })
      const { name, description, config, status } = parsed.data
      const updates: Record<string, unknown> = {}
      if (name !== undefined) updates.name = name
      if (description !== undefined) updates.description = description
      if (status !== undefined) updates.status = status
      if (config !== undefined) {
        const { data: existing } = await supabase
          .from('pipelines')
          .select('config')
          .eq('id', params.id)
          .eq('org_id', userData.org_id)
          .single()
        if (existing) {
          const existingConfig = existing.config as { version?: number } | null
          const versionNumber = (existingConfig?.version ?? 0) + 1
          await supabase.from('pipeline_versions').insert({
            pipeline_id: params.id,
            version_number: versionNumber,
            config: existing.config,
          })
          updates.config = { ...config, version: versionNumber }
        } else {
          updates.config = config
        }
      }
      const { data: pipeline, error } = await supabase
        .from('pipelines')
        .update(updates)
        .eq('id', params.id)
        .eq('org_id', userData.org_id)
        .select()
        .single()
      if (error || !pipeline) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
      return NextResponse.json({ data: pipeline, error: null })
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
      const { error } = await supabase
        .from('pipelines')
        .delete()
        .eq('id', params.id)
        .eq('org_id', userData.org_id)
      if (error) throw error
      return NextResponse.json({ data: { deleted: true }, error: null })
    } catch (error) {
      Sentry.captureException(error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}