import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import PipelineCard from '@/components/PipelineCard'
import type { Pipeline } from '@/types'

export default async function PipelinesPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  const orgId: string = userData?.org_id ?? ''

  const { data: pipelines } = await supabase
    .from('pipelines')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  const list = (pipelines ?? []) as Pipeline[]

  const activeCt = list.filter((p) => p.status === 'active').length
  const draftCt = list.filter((p) => p.status === 'draft').length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Pipelines</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {list.length} total &middot; {activeCt} active &middot; {draftCt} draft
          </p>
        </div>
        <Link href="/pipelines/new" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
          + New Pipeline
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">No pipelines yet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">Build your first data pipeline visually in minutes.</p>
          <Link href="/pipelines/new" className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
            Create pipeline
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {list.map((pipeline) => (
            <PipelineCard key={pipeline.id} pipeline={pipeline} />
          ))}
        </div>
      )}
    </div>
  )
}