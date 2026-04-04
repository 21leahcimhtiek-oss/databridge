'use client'

import { useState, useEffect } from 'react'
import BillingPlans from '@/components/BillingPlans'
import { createClientComponent } from '@/lib/supabase/client'
import type { AppUser, Org, OrgPlan } from '@/types'
import { PLAN_LIMITS } from '@/types'

export default function BillingPage() {
  const [userData, setUserData] = useState<(AppUser & { orgs: Org }) | null>(null)
  const [pipelineCount, setPipelineCount] = useState(0)
  const [connectorCount, setConnectorCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<OrgPlan | null>(null)

  useEffect(() => {
    const supabase = createClientComponent()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: ud } = await supabase.from('users').select('*, orgs(*)').eq('id', user.id).single<AppUser & { orgs: Org }>()
      if (!ud) return
      setUserData(ud)
      const [pRes, cRes] = await Promise.all([
        supabase.from('pipelines').select('id', { count: 'exact' }).eq('org_id', ud.org_id),
        supabase.from('connectors').select('id', { count: 'exact' }).eq('org_id', ud.org_id),
      ])
      setPipelineCount(pRes.count ?? 0)
      setConnectorCount(cRes.count ?? 0)
      setLoading(false)
    })()
  }, [])

  async function handleUpgrade(plan: OrgPlan) {
    setCheckoutLoading(plan)
    const res = await fetch('/api/billing/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
    setCheckoutLoading(null)
  }

  async function handlePortal() {
    setPortalLoading(true)
    const res = await fetch('/api/billing/portal', { method: 'POST' })
    const { url } = await res.json()
    if (url) window.location.href = url
    setPortalLoading(false)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  const plan = userData?.orgs?.plan ?? 'starter'
  const limits = PLAN_LIMITS[plan]
  const planBadgeColor = plan === 'enterprise' ? 'bg-purple-100 text-purple-700' : plan === 'pro' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">Billing & Plan</h1>

      {/* Current plan */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Current plan</p>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">{plan}</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${planBadgeColor}`}>{plan}</span>
            </div>
          </div>
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {portalLoading ? 'Loading…' : 'Manage Billing'}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pipelines</span>
              <span className="text-sm text-gray-500">
                {pipelineCount} / {limits.pipelines === -1 ? '∞' : limits.pipelines}
              </span>
            </div>
            {limits.pipelines !== -1 && (
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (pipelineCount / limits.pipelines) * 100)}%` }}
                />
              </div>
            )}
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Connectors</span>
              <span className="text-sm text-gray-500">
                {connectorCount} / {limits.connectors === -1 ? '∞' : limits.connectors}
              </span>
            </div>
            {limits.connectors !== -1 && (
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (connectorCount / limits.connectors) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <BillingPlans currentPlan={plan} onUpgrade={handleUpgrade} upgradeLoading={checkoutLoading} />
    </div>
  )
}