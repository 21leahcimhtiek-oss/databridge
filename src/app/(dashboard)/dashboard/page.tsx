import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { PipelineRun } from '@/types'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase.from('users').select('*, orgs(*)').eq('id', user.id).single()
  const orgId: string = userData?.org_id ?? ''

  const [pipelinesRes, runsRes] = await Promise.all([
    supabase.from('pipelines').select('id, status').eq('org_id', orgId),
    supabase.from('pipeline_runs').select('*').eq('org_id', orgId).order('started_at', { ascending: false }).limit(5),
  ])

  const pipelines = pipelinesRes.data ?? []
  const recentRuns = (runsRes.data ?? []) as PipelineRun[]

  const totalPipelines = pipelines.length
  const activePipelines = pipelines.filter((p) => p.status === 'active').length
  const failedRuns = recentRuns.filter((r) => r.status === 'failed').length

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const { data: monthRuns } = await supabase
    .from('pipeline_runs')
    .select('rows_processed')
    .eq('org_id', orgId)
    .gte('started_at', startOfMonth.toISOString())
  const rowsProcessed = (monthRuns ?? []).reduce((sum, r) => sum + (r.rows_processed ?? 0), 0)

  const stats = [
    { label: 'Total Pipelines', value: totalPipelines, icon: '🔗', color: 'text-indigo-600' },
    { label: 'Active Pipelines', value: activePipelines, icon: '✅', color: 'text-green-600' },
    { label: 'Recent Failed Runs', value: failedRuns, icon: '❌', color: 'text-red-600' },
    { label: 'Rows This Month', value: rowsProcessed.toLocaleString(), icon: '📦', color: 'text-blue-600' },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Welcome back, {userData?.email}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/pipelines/new" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
            + New Pipeline
          </Link>
          <Link href="/connectors/new" className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            + Add Connector
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{s.icon}</span>
              <span className={`text-3xl font-bold ${s.color}`}>{s.value}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Recent Pipeline Runs</h2>
          <Link href="/pipelines" className="text-sm text-indigo-600 hover:underline">View all pipelines →</Link>
        </div>
        {recentRuns.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-gray-600">
            <p className="text-4xl mb-3">🚀</p>
            <p>No runs yet. Create your first pipeline to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  {['Pipeline ID', 'Status', 'Rows Processed', 'Started', 'Duration'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentRuns.map((run) => {
                  const duration = run.ended_at
                    ? `${Math.round((new Date(run.ended_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
                    : '—'
                  return (
                    <tr key={run.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{run.pipeline_id.slice(0, 8)}…</td>
                      <td className="px-6 py-4"><StatusBadge status={run.status} /></td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{run.rows_processed?.toLocaleString() ?? '—'}</td>
                      <td className="px-6 py-4 text-gray-500">{new Date(run.started_at).toLocaleString()}</td>
                      <td className="px-6 py-4 text-gray-500">{duration}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}