import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/rate-limit'

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'engineer', 'viewer']).default('viewer'),
  org_name: z.string().optional(),
})

function makeAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function POST(req: NextRequest) {
  return withRateLimit(req, async () => {
    try {
      const body = await req.json()
      const parsed = InviteSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 })
      const { email, role, org_name } = parsed.data
      const supabase = createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      const adminClient = makeAdminClient()

      if (!user && org_name) {
        // New signup: create org + invite admin
        const slug = org_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        const { data: org, error: orgError } = await adminClient
          .from('orgs')
          .insert({ name: org_name, slug, plan: 'starter' })
          .select()
          .single()
        if (orgError) throw orgError
        const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
          data: { org_id: org.id, role: 'admin' },
        })
        if (inviteError) throw inviteError
        return NextResponse.json({ success: true })
      }

      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { data: userData } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
      if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      if (userData.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 })
      }
      const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { org_id: userData.org_id, role },
      })
      if (inviteError) throw inviteError
      return NextResponse.json({ success: true })
    } catch (error) {
      Sentry.captureException(error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}