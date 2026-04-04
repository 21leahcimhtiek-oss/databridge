'use client'

import { useState, useEffect } from 'react'
import cronParser from 'cron-parser'
import { format, addMinutes } from 'date-fns'
import type { Schedule } from '@/types'

interface Pipeline { id: string; name: string }

interface ScheduleFormProps {
  pipelineId?: string
  schedule?: Schedule
  onSuccess?: () => void
}

function humanReadableCron(expr: string): string {
  const p = expr.trim().split(/\s+/)
  if (p.length !== 5) return expr
  const [min, hour, dom, month, dow] = p
  if (min === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') return 'Every minute'
  if (min === '0' && hour === '*' && dom === '*' && month === '*' && dow === '*') return 'Every hour'
  if (min === '0' && hour === '0' && dom === '*' && month === '*' && dow === '*') return 'Daily at midnight'
  if (min === '0' && dom === '*' && month === '*' && dow === '*') return `Daily at ${hour.padStart(2, '0')}:00`
  if (min === '0' && hour === '0' && dom === '*' && month === '*' && dow === '1') return 'Every Monday at midnight'
  if (min === '0' && hour === '0' && dom === '1' && month === '*' && dow === '*') return 'Monthly on the 1st at midnight'
  return expr
}

function getNextRuns(expr: string, count = 3): Date[] {
  try {
    const interval = cronParser.parseExpression(expr)
    const runs: Date[] = []
    for (let i = 0; i < count; i++) runs.push(interval.next().toDate())
    return runs
  } catch {
    return []
  }
}

export default function ScheduleForm({ pipelineId, schedule, onSuccess }: ScheduleFormProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState(pipelineId ?? schedule?.pipeline_id ?? '')
  const [cronExpr, setCronExpr] = useState(schedule?.cron_expr ?? '0 * * * *')
  const [enabled, setEnabled] = useState(schedule?.enabled ?? true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cronError, setCronError] = useState<string | null>(null)

  useEffect(() => {
    if (!pipelineId) {
      fetch('/api/pipelines')
        .then(r => r.json())
        .then((json: { data: Pipeline[] }) => setPipelines(json.data ?? []))
        .catch(() => {})
    }
  }, [pipelineId])

  const nextRuns = getNextRuns(cronExpr)
  const isValidCron = nextRuns.length > 0

  const handleCronChange = (val: string) => {
    setCronExpr(val)
    try {
      cronParser.parseExpression(val)
      setCronError(null)
    } catch (e) {
      setCronError((e as Error).message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidCron) return
    setSubmitting(true)
    setError(null)
    try {
      const url = schedule ? `/api/schedules/${schedule.id}` : '/api/schedules'
      const method = schedule ? 'PATCH' : 'POST'
      const body = schedule
        ? { cron_expr: cronExpr, enabled }
        : { pipeline_id: selectedPipeline, cron_expr: cronExpr, enabled }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) { setError(json.error ?? 'Failed to save schedule'); return }
      onSuccess?.()
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!pipelineId && !schedule && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pipeline</label>
          <select
            value={selectedPipeline}
            onChange={e => setSelectedPipeline(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select a pipeline…</option>
            {pipelines.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cron Expression</label>
        <input
          type="text"
          value={cronExpr}
          onChange={e => handleCronChange(e.target.value)}
          placeholder="0 * * * *"
          className={`w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            cronError ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {cronError ? (
          <p className="text-xs text-red-500 mt-1">{cronError}</p>
        ) : (
          <p className="text-xs text-gray-500 mt-1">{humanReadableCron(cronExpr)}</p>
        )}
      </div>

      {nextRuns.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Next 3 runs:</p>
          <ul className="space-y-0.5">
            {nextRuns.map((d, i) => (
              <li key={i} className="text-xs text-gray-600 font-mono">
                {format(d, 'PPpp')}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled(v => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-indigo-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-gray-700">{enabled ? 'Enabled' : 'Disabled'}</span>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !isValidCron}
        className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
      >
        {submitting ? 'Saving…' : schedule ? 'Update Schedule' : 'Create Schedule'}
      </button>
    </form>
  )
}