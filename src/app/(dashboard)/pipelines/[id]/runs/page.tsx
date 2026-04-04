import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import RunHistoryTable from '@/components/RunHistoryTable'
import type { Pipeline, PipelineRun } from '@/types'

export default async function PipelineRunsPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [pipelineRes, runsRes] = await Promise.all([
    supabase.from('pipelines').select('*').eq('id', params.id).single<Pipeline>(),
    supabase.from('pipeline_runs').select('*').eq('pipeline_id', params.id).order('started_at', { ascending: false }),
  ])

  if (!pipelineRes.data) notFound()
  const pipeline = pipelineRes.data
  const runs = (runsRes.data ?? []) as PipelineRun[]

  const totalRuns = runs.length
  const successRuns = runs.filter((r) => r.status === 'success').length
  const successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0
  const totalRows = runs.reduce((sum, r) => sum + (r.rows_processed ?? 0), 0)
  const avgDurationMs = runs
    .filter((r) => r.ended_at)
    .reduce((sum, r) => sum + (new Date(r.ended_at!).getTime() - new Date(r.started_at).getTime()), 0) /
    (runs.filter((r) => r.ended_at).length || 1)

  const stats = [
    { label: 'Total Runs', value: totalRuns },
    { label: 'Success Rate', value: `${successRate}%` },
    { label: 'Avg Duration', value: `${Math.round(avgDurationMs / 1000)}s` },
    { label: 'Total Rows Processed', value: totalRows.toLocaleString() },
  ]

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex items-center gap-2">
        <Link href="/pipelines" className="hover:text-indigo-600 transition-colors">Pipelines</Link>
        <span>/</span>
        <Link href={`/pipelines/${pipeline.id}`} className="hover:text-indigo-600 transition-colors">{pipeline.name}</Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">Runs</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">Run History</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700">
        <RunHistoryTable runs={runs} />
      </div>
    </div>
  )
}