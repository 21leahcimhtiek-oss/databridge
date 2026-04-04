'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ConnectorType } from '@/types'

const CONNECTOR_TYPES: { type: ConnectorType; label: string; icon: string; fields: Array<{ key: string; label: string; type: string; placeholder: string }> }[] = [
  {
    type: 'postgres',
    label: 'PostgreSQL',
    icon: '🐘',
    fields: [
      { key: 'host', label: 'Host', type: 'text', placeholder: 'localhost' },
      { key: 'port', label: 'Port', type: 'number', placeholder: '5432' },
      { key: 'database', label: 'Database', type: 'text', placeholder: 'mydb' },
      { key: 'user', label: 'Username', type: 'text', placeholder: 'postgres' },
      { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
    ],
  },
  {
    type: 'mysql',
    label: 'MySQL',
    icon: '🐬',
    fields: [
      { key: 'host', label: 'Host', type: 'text', placeholder: 'localhost' },
      { key: 'port', label: 'Port', type: 'number', placeholder: '3306' },
      { key: 'database', label: 'Database', type: 'text', placeholder: 'mydb' },
      { key: 'user', label: 'Username', type: 'text', placeholder: 'root' },
      { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
    ],
  },
  {
    type: 'csv',
    label: 'CSV / S3',
    icon: '📄',
    fields: [
      { key: 'bucket', label: 'S3 Bucket', type: 'text', placeholder: 'my-bucket' },
      { key: 'path', label: 'File Path', type: 'text', placeholder: 'data/export.csv' },
      { key: 'access_key', label: 'Access Key ID', type: 'text', placeholder: 'AKIA...' },
      { key: 'secret_key', label: 'Secret Access Key', type: 'password', placeholder: '••••••••' },
    ],
  },
  {
    type: 'rest',
    label: 'REST API',
    icon: '🌐',
    fields: [
      { key: 'base_url', label: 'Base URL', type: 'url', placeholder: 'https://api.example.com' },
      { key: 'auth_header', label: 'Auth Header', type: 'text', placeholder: 'Authorization' },
      { key: 'auth_value', label: 'Auth Value', type: 'password', placeholder: 'Bearer token...' },
    ],
  },
  {
    type: 'stripe',
    label: 'Stripe',
    icon: '💳',
    fields: [
      { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...' },
    ],
  },
  {
    type: 'supabase',
    label: 'Supabase',
    icon: '⚡',
    fields: [
      { key: 'url', label: 'Project URL', type: 'url', placeholder: 'https://xyz.supabase.co' },
      { key: 'service_role_key', label: 'Service Role Key', type: 'password', placeholder: 'eyJ...' },
    ],
  },
]

export default function NewConnectorPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedType, setSelectedType] = useState<ConnectorType | null>(null)
  const [name, setName] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedDef = CONNECTOR_TYPES.find((c) => c.type === selectedType)

  function updateField(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  async function testConnection() {
    setTestStatus('testing')
    setTestMessage('')
    try {
      const res = await fetch('/api/connectors/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, config: fields }),
      })
      const json = await res.json()
      if (res.ok) {
        setTestStatus('success')
        setTestMessage(json.message ?? 'Connection successful!')
      } else {
        setTestStatus('failed')
        setTestMessage(json.error ?? 'Connection failed.')
      }
    } catch {
      setTestStatus('failed')
      setTestMessage('Network error.')
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: selectedType, config: fields }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Failed to save connector.')
        setSaving(false)
        return
      }
      router.push('/connectors')
    } catch {
      setError('Network error.')
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add Connector</h1>
        <div className="flex items-center gap-2 mt-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                {s}
              </div>
              {s < 3 && <div className={`h-0.5 w-16 ${step > s ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`} />}
            </div>
          ))}
          <span className="ml-4 text-sm text-gray-500">
            {step === 1 ? 'Choose type' : step === 2 ? 'Configure' : 'Test & Save'}
          </span>
        </div>
      </div>

      {step === 1 && (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Select the type of data source you want to connect.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CONNECTOR_TYPES.map((c) => (
              <button
                key={c.type}
                onClick={() => { setSelectedType(c.type); setFields({}) }}
                className={`rounded-xl border-2 p-5 text-left transition-all ${selectedType === c.type ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'}`}
              >
                <div className="text-3xl mb-2">{c.icon}</div>
                <div className="font-medium text-sm">{c.label}</div>
              </button>
            ))}
          </div>
          <button
            disabled={!selectedType}
            onClick={() => setStep(2)}
            className="mt-8 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Continue →
          </button>
        </div>
      )}

      {step === 2 && selectedDef && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Connector name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`My ${selectedDef.label}`}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {selectedDef.fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{f.label}</label>
              <input
                type={f.type}
                value={fields[f.key] ?? ''}
                onChange={(e) => updateField(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(1)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              ← Back
            </button>
            <button
              disabled={!name}
              onClick={() => setStep(3)}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold mb-1">{name}</h3>
            <p className="text-sm text-gray-500">{selectedDef?.label} connector</p>
          </div>

          <div>
            <button
              onClick={testConnection}
              disabled={testStatus === 'testing'}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {testStatus === 'testing' ? '⏳ Testing…' : '🔌 Test Connection'}
            </button>
            {testStatus === 'success' && <p className="mt-2 text-sm text-green-600">✓ {testMessage}</p>}
            {testStatus === 'failed' && <p className="mt-2 text-sm text-red-600">✗ {testMessage}</p>}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              ← Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Connector'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}