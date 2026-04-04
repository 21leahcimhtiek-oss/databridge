'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Database, GitBranch, Clock,
  CreditCard, Settings, ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react'
import type { AppUser, Org } from '@/types'
import OrgSwitcher from './OrgSwitcher'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/connectors', label: 'Connectors', icon: Database },
  { href: '/pipelines', label: 'Pipelines', icon: GitBranch },
  { href: '/schedules', label: 'Schedules', icon: Clock },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  user: AppUser | null
  org: Org | null
}

export default function Sidebar({ user, org }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside
      className={`flex flex-col h-screen bg-gray-900 text-white transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && (
          <span className="text-xl font-bold text-indigo-400">DataBridge</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded hover:bg-gray-700 transition-colors ml-auto"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-700 p-3 space-y-2">
        {!collapsed && <OrgSwitcher org={org} />}
        {user && (
          <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed && (
              <span className="text-xs text-gray-400 truncate max-w-[140px]" title={user.email}>
                {user.email}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors flex-shrink-0"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}