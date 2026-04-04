'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import PipelineCanvas from '@/components/PipelineCanvas'
import type { PipelineConfig } from '@/types'

const NODE_PALETTE = [
  { type: 'source', label: 'Source', icon: '📥', color: 'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700' },
  { type: 'transform', label: 'Transform', icon: '⚙️', color: 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700' },
  { type: 'filter', label: 'Filter', icon: '🔍', color: 'bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700' },
  { type: 'destination', label: 'Destination', icon: '📤', color: 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700' },
  { type: 'join', label: 'Join', icon: '🔗', color: 'bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700' },
  { type: 'aggregate', label: 'Aggregate', icon: '📊', color: 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700' },
]

const emptyConfig: PipelineConfig = { nodes: [], edges: [], version: 1 }

export default function NewPipelinePage() {
  const router = useRouter()
  const [pipelineName, setPipelineName] = useState('')
  const [config, setConfig] = useState<PipelineConfig>(emptyConfig)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedNode = config.nodes.find((n) => n.id === selectedNodeId)

  const handleCanvasChange = useCallback((newConfig: PipelineConfig) => {
    setConfig(newConfig)
  }, [])

  function addNode(type: string) {
    const id = `${type}-${Date.now()}`
    const newNode = {
      id,
      type,
      config: {},
      position: { x: 200 + Math.random() * 200, y: 100 + Math.random() * 200 },
    }
    setConfig((prev) => ({ ...prev, nodes: [...prev.nodes, newNode] }))
    setSelectedNodeId(id)
  }

  function updateNodeConfig(key: string, value: string) {
    if (!selectedNodeId) return
    setConfig((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === selectedNodeId ? { ...n, config: { ...n.config, [key]: value } } : n
      ),
    }))
  }

  async function handleSave() {
    if (!pipelineName.trim()) { setError('Pipeline name is required.'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pipelineName, config, status: 'draft' }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Failed to save pipeline.')
        setSaving(false)
        return
      }
      const { id } = await res.json()
      router.push(`/pipelines/${id}`)
    } catch {
      setError('Network error.')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-3">
        <input
          type="text"
          value={pipelineName}
          onChange={(e) => setPipelineName(e.target.value)}
          placeholder="Untitled Pipeline"
          className="text-lg font-semibold bg-transparent border-none outline-none focus:ring-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 flex-1"
        />
        {error && <span className="text-sm text-red-500">{error}</span>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Pipeline'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Node palette */}
        <aside className="w-52 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Nodes</p>
          <div className="space-y-2">
            {NODE_PALETTE.map((node) => (
              <button
                key={node.type}
                onClick={() => addNode(node.type)}
                className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all hover:shadow-sm ${node.color}`}
              >
                <span>{node.icon}</span>
                <span>{node.label}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Center: Canvas */}
        <div className="flex-1 relative">
          <PipelineCanvas
            config={config}
            onChange={handleCanvasChange}
            onSelectNode={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
          />
        </div>

        {/* Right: Node config */}
        <aside className="w-64 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 overflow-y-auto">
          {selectedNode ? (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Node Config</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4 capitalize">{selectedNode.type} Node</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Label</label>
                  <input
                    type="text"
                    value={(selectedNode.config.label as string) ?? ''}
                    onChange={(e) => updateNodeConfig('label', e.target.value)}
                    placeholder={`My ${selectedNode.type}`}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {selectedNode.type === 'source' || selectedNode.type === 'destination' ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Connector</label>
                    <input
                      type="text"
                      value={(selectedNode.config.connector_id as string) ?? ''}
                      onChange={(e) => updateNodeConfig('connector_id', e.target.value)}
                      placeholder="connector-id"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                ) : null}
                {selectedNode.type === 'transform' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">SQL / JS Expression</label>
                    <textarea
                      value={(selectedNode.config.expression as string) ?? ''}
                      onChange={(e) => updateNodeConfig('expression', e.target.value)}
                      placeholder="SELECT * FROM input WHERE amount > 100"
                      rows={5}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                )}
                {selectedNode.type === 'filter' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Filter Condition</label>
                    <input
                      type="text"
                      value={(selectedNode.config.condition as string) ?? ''}
                      onChange={(e) => updateNodeConfig('condition', e.target.value)}
                      placeholder="field == 'value'"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 dark:text-gray-600 py-12">
              <p className="text-3xl mb-3">👆</p>
              <p className="text-sm">Select a node to configure it</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}