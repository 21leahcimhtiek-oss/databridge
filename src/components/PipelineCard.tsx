'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Play, Eye, Clock, Loader2 } from 'lucide-react'
import type { Pipeline, PipelineStatus } from '@/types'

const STATUS_STYLES: Record<PipelineStatus, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  draft: 'bg-gray-100 text-gray-600',
}

interface PipelineCardProps {
  pipeline: Pipeline
  runCount?: number
}

export default function PipelineCard({ pipeline, runCount = 0 }: PipelineCardProps) {
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<{ status: string } | null>(null)

  const handleRun = async () => {
    setRunning(true)
    setRunResult(null)
    try {
      const res = await fetch(`/api/pipelines/${pipeline.id}/run`, { method: 'POST' })
      const json = await res.json() as { status: string }
      setRunResult(json)
    } catch {
      setRunResult({ status: 'failed' })
    } finally {
      setRunning(false)
    }
  }

  const lastRunLabel = pipeline.last_run_at
    ? formatDistanceToNow(new Date(pipeline.last_run_at), { addSuffix: true })
    : 'Never run'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{pipeline.name}</h3>
          {pipeline.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{pipeline.description}</p>
          )}
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 capitalize ${STATUS_STYLES[pipeline.status]}`}>
          {pipeline.status}
        </span>
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {lastRunLabel}
        </span>
        <span>{runCount} run{runCount !== 1 ? 's' : ''}</span>
      </div>

      {runResult && (
        <p className={`text-xs mt-2 font-medium ${runResult.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          Run {runResult.status}
        </p>
      )}

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          {running ? 'Running…' : 'Run Now'}
        </button>
        <Link
          href={`/pipelines/${pipeline.id}`}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Eye size={12} />
          View
        </Link>
        <Link
          href={`/pipelines/${pipeline.id}/runs`}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Clock size={12} />
          History
        </Link>
      </div>
    </div>
  )
}