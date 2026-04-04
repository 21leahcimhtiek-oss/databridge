import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Schedule } from '@/types'

interface ScheduleWithPipeline extends Schedule {
  pipelines: { name: string } | null
}

export default async function SchedulesPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  const orgId: string = userData?.org_id ?? ''

  const { data: schedules } = await supabase
    .from('schedules')
    .select('*, pipelines(name)')
    .eq('pipelines.org_id', orgId)
    .order('next_run_at', { ascending: true })

  const list = (schedules ?? []) as ScheduleWithPipeline[]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Schedules</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{list.length} schedule{list.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/pipelines" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
          + Add Schedule
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-6xl mb-4">🕐</div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">No schedules yet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">Open a pipeline and add a schedule from the pipeline detail page.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                {['Pipeline', 'Cron Expression', 'Next Run', 'Last Triggered', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {list.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                    <Link href={`/pipelines/${s.pipeline_id}`} className="hover:text-indigo-600 transition-colors">
                      {s.pipelines?.name ?? '—'}
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">{s.cron_expr}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                    {s.next_run_at ? new Date(s.next_run_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                    {s.last_triggered_at ? new Date(s.last_triggered_at).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {s.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/pipelines/${s.pipeline_id}`} className="text-indigo-600 hover:underline text-xs font-medium mr-3">Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}