import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import type { AppUser, Org } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('*, orgs(*)')
    .eq('id', user.id)
    .single<AppUser & { orgs: Org }>()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar user={userData} org={userData?.orgs ?? null} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}