import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import PipelineCanvas from '@/components/PipelineCanvas'
import ScheduleForm from '@/components/ScheduleForm'
import PipelineRunButton from '@/components/PipelineRunButton'
import type { Pipeline, Schedule } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

export default async function PipelineDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [pipelineRes, scheduleRes] = await Promise.all([
    supabase.from('pipelines').select('*').eq('id', params.id).single<Pipeline>(),
    supabase.from('schedules').select('*').eq('pipeline_id', params.id).maybeSingle<Schedule>(),
  ])

  if (!pipelineRes.data) notFound()
  const pipeline = pipelineRes.data
  const schedule = scheduleRes.data

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pipeline.name}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[pipeline.status]}`}>
              {pipeline.status}
            </span>
          </div>
          {pipeline.description && <p className="text-sm text-gray-500 dark:text-gray-400">{pipeline.description}</p>}
          {pipeline.last_run_at && (
            <p className="text-xs text-gray-400 mt-1">Last run: {new Date(pipeline.last_run_at).toLocaleString()}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a href={`/pipelines/${pipeline.id}/runs`} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            View Runs
          </a>
          <PipelineRunButton pipelineId={pipeline.id} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="flex gap-6 text-sm font-medium">
          {['Overview', 'Transform Config', 'Schedule', 'Alerts'].map((tab) => (
            <button key={tab} className="pb-3 border-b-2 border-indigo-600 text-indigo-600 first-of-type:block hidden first:block">
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Canvas */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 mb-8" style={{ height: '400px' }}>
        <PipelineCanvas
          config={pipeline.config}
          onChange={() => {}}
          onSelectNode={() => {}}
          selectedNodeId={null}
          readonly
        />
      </div>

      {/* Schedule section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Schedule</h2>
        <ScheduleForm pipelineId={pipeline.id} existingSchedule={schedule ?? undefined} />
      </div>
    </div>
  )
}