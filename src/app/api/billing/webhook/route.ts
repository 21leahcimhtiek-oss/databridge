import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import Stripe from 'stripe'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const sig = req.headers.get('stripe-signature')
    if (!sig) return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err) {
      return NextResponse.json({ error: `Webhook verification failed: ${(err as Error).message}` }, { status: 400 })
    }
    const supabase = createSupabaseServerClient()
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id
        const priceId = subscription.items.data[0]?.price.id
        let plan: 'starter' | 'pro' | 'enterprise' = 'starter'
        if (priceId === process.env.STRIPE_PRO_PRICE_ID) plan = 'pro'
        else if (priceId === process.env.STRIPE_STARTER_PRICE_ID) plan = 'starter'
        await supabase
          .from('orgs')
          .update({ plan, stripe_subscription_id: subscription.id })
          .eq('stripe_customer_id', customerId)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id
        await supabase
          .from('orgs')
          .update({ plan: 'starter', stripe_subscription_id: null })
          .eq('stripe_customer_id', customerId)
        break
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.customer && session.metadata?.org_id) {
          const customerId = typeof session.customer === 'string'
            ? session.customer
            : session.customer.id
          await supabase
            .from('orgs')
            .update({ stripe_customer_id: customerId })
            .eq('id', session.metadata.org_id)
        }
        break
      }
      default:
        break
    }
    return NextResponse.json({ received: true })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}