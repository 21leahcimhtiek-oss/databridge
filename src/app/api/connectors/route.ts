import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/rate-limit'
import { encrypt } from '@/lib/encryption'

const ConnectorSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['postgres', 'mysql', 'csv', 'rest', 'stripe', 'supabase']),
  config: z.record(z.unknown()),
})

export async function GET(req: NextRequest) {
  return withRateLimit(req, async () => {
    try {
      const supabase = createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { data: userData } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
      if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const { data: connectors, error } = await supabase
        .from('connectors')
        .select('*')
        .eq('org_id', userData.org_id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return NextResponse.json({ data: connectors, error: null })
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
      const parsed = ConnectorSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 })
      const { name, type, config } = parsed.data
      const encryptedConfig = encrypt(JSON.stringify(config))
      const { data: connector, error } = await supabase
        .from('connectors')
        .insert({
          org_id: userData.org_id,
          name,
          type,
          config_encrypted: { encrypted: encryptedConfig },
          status: 'untested',
        })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ data: connector, error: null }, { status: 201 })
    } catch (error) {
      Sentry.captureException(error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}