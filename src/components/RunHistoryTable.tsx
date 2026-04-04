'use client'

import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { ChevronUp, ChevronDown, Loader2 } from 'lucide-react'
import type { PipelineRun, RunStatus } from '@/types'

const STATUS_STYLES: Record<RunStatus, string> = {
  running: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

type SortField = 'started_at' | 'status' | 'rows_processed'

interface RunHistoryTableProps {
  runs: PipelineRun[]
  loading?: boolean
}

export default function RunHistoryTable({ runs, loading = false }: RunHistoryTableProps) {
  const [sortField, setSortField] = useState<SortField>('started_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
    setPage(1)
  }

  const sorted = [...runs].sort((a, b) => {
    const av = a[sortField] ?? ''
    const bv = b[sortField] ?? ''
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronUp size={12} className="text-gray-300" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-gray-600" />
      : <ChevronDown size={12} className="text-gray-600" />
  }

  function duration(run: PipelineRun): string {
    if (!run.ended_at) return '—'
    const ms = new Date(run.ended_at).getTime() - new Date(run.started_at).getTime()
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={18} />
        Loading run history…
      </div>
    )
  }

  if (runs.length === 0) {
    return <p className="text-center text-gray-400 py-12 text-sm">No runs yet.</p>
  }

  const thClass = 'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide'
  const tdClass = 'px-4 py-3 text-sm'

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full bg-white">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className={thClass}>
              <button className="flex items-center gap-1 hover:text-gray-700" onClick={() => handleSort('status')}>
                Status <SortIcon field="status" />
              </button>
            </th>
            <th className={thClass}>
              <button className="flex items-center gap-1 hover:text-gray-700" onClick={() => handleSort('started_at')}>
                Started <SortIcon field="started_at" />
              </button>
            </th>
            <th className={thClass}>Duration</th>
            <th className={thClass}>
              <button className="flex items-center gap-1 hover:text-gray-700" onClick={() => handleSort('rows_processed')}>
                Rows <SortIcon field="rows_processed" />
              </button>
            </th>
            <th className={thClass}>Error</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginated.map(run => (
            <tr key={run.id} className="hover:bg-gray-50">
              <td className={tdClass}>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[run.status]}`}>
                  {run.status}
                </span>
              </td>
              <td className={`${tdClass} text-gray-600`}>
                <span title={format(new Date(run.started_at), 'PPpp')}>
                  {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                </span>
              </td>
              <td className={`${tdClass} text-gray-600`}>{duration(run)}</td>
              <td className={`${tdClass} text-gray-600`}>
                {run.rows_processed != null ? run.rows_processed.toLocaleString() : '—'}
              </td>
              <td className={`${tdClass} text-red-500 max-w-xs truncate`} title={run.error_msg ?? ''}>
                {run.error_msg ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Page {page} of {totalPages} — {runs.length} total runs
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-xs rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-xs rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}