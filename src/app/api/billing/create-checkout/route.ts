import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import Stripe from 'stripe'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/rate-limit'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

const CheckoutSchema = z.object({
  plan: z.enum(['starter', 'pro']),
})

const PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
}

export async function POST(req: NextRequest) {
  return withRateLimit(req, async () => {
    try {
      const supabase = createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { data: userData } = await supabase
        .from('users')
        .select('org_id, role, orgs(stripe_customer_id, name)')
        .eq('id', user.id)
        .single()
      if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      if (userData.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 })
      }
      const body = await req.json()
      const parsed = CheckoutSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 })
      const { plan } = parsed.data
      const org = userData.orgs as { stripe_customer_id: string | null; name: string } | null
      let customerId = org?.stripe_customer_id ?? null
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: org?.name,
          metadata: { org_id: userData.org_id },
        })
        customerId = customer.id
        await supabase.from('orgs').update({ stripe_customer_id: customerId }).eq('id', userData.org_id)
      }
      const priceId = PRICE_IDS[plan]
      if (!priceId) return NextResponse.json({ error: 'Price not configured for this plan' }, { status: 400 })
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
        metadata: { org_id: userData.org_id, plan },
      })
      return NextResponse.json({ url: session.url })
    } catch (error) {
      Sentry.captureException(error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}