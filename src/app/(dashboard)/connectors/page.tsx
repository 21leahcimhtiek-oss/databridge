import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ConnectorCard from '@/components/ConnectorCard'
import type { Connector } from '@/types'

export default async function ConnectorsPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  const orgId: string = userData?.org_id ?? ''

  const { data: connectors } = await supabase
    .from('connectors')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  const list = (connectors ?? []) as Connector[]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Connectors</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{list.length} connector{list.length !== 1 ? 's' : ''} configured</p>
        </div>
        <Link href="/connectors/new" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
          + Add Connector
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-6xl mb-4">🔌</div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">No connectors yet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">Connect your data sources to start building pipelines.</p>
          <Link href="/connectors/new" className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
            Add your first connector
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {list.map((connector) => (
            <ConnectorCard key={connector.id} connector={connector} />
          ))}
        </div>
      )}
    </div>
  )
}