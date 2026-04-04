'use client'

import { useState } from 'react'
import { Database, Globe, FileText, CreditCard, Layers, Edit2, Trash2, Wifi } from 'lucide-react'
import type { Connector, ConnectorType } from '@/types'

const TYPE_ICONS: Record<ConnectorType, React.ReactNode> = {
  postgres: <Database size={20} />,
  mysql: <Database size={20} />,
  csv: <FileText size={20} />,
  rest: <Globe size={20} />,
  stripe: <CreditCard size={20} />,
  supabase: <Layers size={20} />,
}

const STATUS_DOT: Record<string, string> = {
  active: 'bg-green-500',
  error: 'bg-red-500',
  untested: 'bg-gray-400',
}

interface ConnectorCardProps {
  connector: Connector
  userRole?: string
  onDelete: (id: string) => void
  onTest: (id: string) => void
}

export default function ConnectorCard({ connector, userRole, onDelete, onTest }: ConnectorCardProps) {
  const [testing, setTesting] = useState(false)
  const canEdit = userRole === 'admin' || userRole === 'engineer'

  const handleTest = async () => {
    setTesting(true)
    try {
      await onTest(connector.id)
    } finally {
      setTesting(false)
    }
  }

  const createdDate = new Date(connector.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-gray-500 flex-shrink-0">{TYPE_ICONS[connector.type]}</div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{connector.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                {connector.type}
              </span>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[connector.status] ?? STATUS_DOT.untested}`} />
              <span className="text-xs text-gray-500 capitalize">{connector.status}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3">Created {createdDate}</p>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={handleTest}
          disabled={testing}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-60"
        >
          <Wifi size={12} />
          {testing ? 'Testing…' : 'Test Connection'}
        </button>
        {canEdit && (
          <>
            <button
              onClick={() => onDelete(connector.id)}
              className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              aria-label="Delete connector"
            >
              <Trash2 size={12} />
              Delete
            </button>
            <button
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Edit connector"
            >
              <Edit2 size={12} />
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  )
}