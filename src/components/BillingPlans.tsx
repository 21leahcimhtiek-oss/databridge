'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import type { OrgPlan } from '@/types'

interface Plan {
  id: OrgPlan
  name: string
  price: string
  period: string
  features: string[]
  cta: string
  highlight: boolean
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$99',
    period: '/month',
    features: [
      'Up to 5 pipelines',
      '1M rows / month',
      '5 connectors',
      'CSV, REST, Postgres',
      'Email support',
      'Run history (30 days)',
    ],
    cta: 'Get Started',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$299',
    period: '/month',
    features: [
      'Unlimited pipelines',
      '50M rows / month',
      'All connectors',
      'API access',
      'Schedules & alerts',
      'Priority support',
      'Run history (1 year)',
    ],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: [
      'Everything in Pro',
      'Unlimited rows',
      'SSO / SAML',
      'Dedicated infrastructure',
      'SLA guarantee',
      'Dedicated support',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
]

interface BillingPlansProps {
  currentPlan: OrgPlan
  orgId: string
}

export default function BillingPlans({ currentPlan, orgId }: BillingPlansProps) {
  const [loading, setLoading] = useState<OrgPlan | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async (plan: OrgPlan) => {
    if (plan === 'enterprise') {
      window.open('mailto:sales@databridge.io?subject=Enterprise%20Inquiry', '_blank')
      return
    }
    setLoading(plan)
    setError(null)
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const json = await res.json() as { url?: string; error?: string }
      if (json.url) {
        window.location.href = json.url
      } else {
        setError(json.error ?? 'Failed to start checkout')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(null)
    }
  }

  const handleManage = async () => {
    setLoading('pro')
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const json = await res.json() as { url?: string; error?: string }
      if (json.url) window.location.href = json.url
      else setError(json.error ?? 'Failed to open portal')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map(plan => {
          const isCurrent = plan.id === currentPlan
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border-2 p-6 ${
                plan.highlight
                  ? 'border-indigo-500 shadow-lg shadow-indigo-100'
                  : 'border-gray-200'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              {isCurrent && (
                <div className="absolute top-4 right-4">
                  <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-extrabold text-gray-900">{plan.price}</span>
                  {plan.period && (
                    <span className="text-sm text-gray-500">{plan.period}</span>
                  )}
                </div>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  onClick={handleManage}
                  disabled={loading !== null}
                  className="w-full py-2.5 border-2 border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  Manage Billing
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading !== null}
                  className={`w-full py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 ${
                    plan.highlight
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {loading === plan.id ? 'Loading…' : plan.cta}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}