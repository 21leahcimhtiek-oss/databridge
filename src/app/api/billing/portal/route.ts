import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import Stripe from 'stripe'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/rate-limit'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

export async function POST(req: NextRequest) {
  return withRateLimit(req, async () => {
    try {
      const supabase = createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { data: userData } = await supabase
        .from('users')
        .select('org_id, role, orgs(stripe_customer_id)')
        .eq('id', user.id)
        .single()
      if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      if (userData.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 })
      }
      const org = userData.orgs as { stripe_customer_id: string | null } | null
      if (!org?.stripe_customer_id) {
        return NextResponse.json({ error: 'No billing account found for this org' }, { status: 400 })
      }
      const session = await stripe.billingPortal.sessions.create({
        customer: org.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
      })
      return NextResponse.json({ url: session.url })
    } catch (error) {
      Sentry.captureException(error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}