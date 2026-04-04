import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withRateLimit(req, async () => {
    try {
      const supabase = createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { data: userData } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
      if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const { searchParams } = new URL(req.url)
      const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
      const from = (page - 1) * limit
      const to = from + limit - 1
      const { data: pipeline } = await supabase
        .from('pipelines')
        .select('id')
        .eq('id', params.id)
        .eq('org_id', userData.org_id)
        .single()
      if (!pipeline) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
      const { data: runs, error, count } = await supabase
        .from('pipeline_runs')
        .select('*', { count: 'exact' })
        .eq('pipeline_id', params.id)
        .order('started_at', { ascending: false })
        .range(from, to)
      if (error) throw error
      return NextResponse.json({
        data: runs,
        pagination: { page, limit, total: count ?? 0, total_pages: Math.ceil((count ?? 0) / limit) },
        error: null,
      })
    } catch (error) {
      Sentry.captureException(error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}