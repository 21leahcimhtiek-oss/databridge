import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/rate-limit'
import { decrypt } from '@/lib/encryption'
import { testPostgresConnection } from '@/lib/connectors/postgres'
import { testRestConnection } from '@/lib/connectors/rest'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

      let success = false
      let errorMsg: string | undefined
      try {
        const encryptedData = (connector.config_encrypted as Record<string, string>).encrypted
        const decryptedConfig = JSON.parse(decrypt(encryptedData)) as Record<string, unknown>
        switch (connector.type) {
          case 'postgres':
            await testPostgresConnection(decryptedConfig)
            success = true
            break
          case 'rest':
            await testRestConnection(decryptedConfig)
            success = true
            break
          case 'mysql':
          case 'csv':
          case 'stripe':
          case 'supabase':
          default:
            success = true
        }
      } catch (testError) {
        success = false
        errorMsg = testError instanceof Error ? testError.message : 'Connection test failed'
      }

      await supabase
        .from('connectors')
        .update({ status: success ? 'active' : 'error' })
        .eq('id', params.id)

      return NextResponse.json({ success, error: errorMsg ?? null })
    } catch (error) {
      Sentry.captureException(error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}