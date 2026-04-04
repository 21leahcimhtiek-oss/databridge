import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/rate-limit'
import { encrypt } from '@/lib/encryption'

const UpdateConnectorSchema = z.object({
  name: z.string().min(1).optional(),
  config: z.record(z.unknown()).optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withRateLimit(req, async () => {
    try {
      const supabase = createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { data: userData } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
      if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const { data: connector, error } = await supabase
        .from('connectors')
        .select('*')
        .eq('id', params.id)
        .eq('org_id', userData.org_id)
        .single()
      if (error || !connector) return NextResponse.json({ error: 'Connector not found' }, { status: 404 })
      return NextResponse.json({ data: connector, error: null })
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
      const parsed = UpdateConnectorSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 })
      const { name, config } = parsed.data
      const updates: Record<string, unknown> = {}
      if (name !== undefined) updates.name = name
      if (config !== undefined) updates.config_encrypted = { encrypted: encrypt(JSON.stringify(config)) }
      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
      }
      const { data: connector, error } = await supabase
        .from('connectors')
        .update(updates)
        .eq('id', params.id)
        .eq('org_id', userData.org_id)
        .select()
        .single()
      if (error || !connector) return NextResponse.json({ error: 'Connector not found' }, { status: 404 })
      return NextResponse.json({ data: connector, error: null })
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
        .from('connectors')
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