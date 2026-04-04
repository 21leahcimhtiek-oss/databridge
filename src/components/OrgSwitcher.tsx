'use client'

import type { Org, OrgPlan } from '@/types'

const PLAN_LABELS: Record<OrgPlan, { label: string; color: string }> = {
  starter: { label: 'Starter', color: 'bg-gray-600 text-gray-200' },
  pro: { label: 'Pro', color: 'bg-indigo-600 text-white' },
  enterprise: { label: 'Enterprise', color: 'bg-purple-600 text-white' },
}

interface OrgSwitcherProps {
  org: Org | null
}

export default function OrgSwitcher({ org }: OrgSwitcherProps) {
  if (!org) return null
  const plan = PLAN_LABELS[org.plan] ?? PLAN_LABELS.starter

  return (
    <div className="flex items-center gap-2 px-1">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate" title={org.name}>
          {org.name}
        </p>
      </div>
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${plan.color}`}
      >
        {plan.label}
      </span>
    </div>
  )
}