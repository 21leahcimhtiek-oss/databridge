import { Handle, Position, NodeProps } from 'reactflow'
import { Zap } from 'lucide-react'

interface TransformNodeData {
  label: string
  transformType: string
}

const TRANSFORM_LABELS: Record<string, string> = {
  sql: 'SQL',
  filter: 'Filter',
  rename: 'Rename',
  join: 'Join',
  aggregate: 'Aggregate',
}

export default function TransformNode({ data, selected }: NodeProps<TransformNodeData>) {
  const typeLabel = TRANSFORM_LABELS[data.transformType] ?? data.transformType
  return (
    <div
      className={`rounded-lg border-2 bg-purple-50 min-w-[160px] shadow-sm transition-shadow ${
        selected ? 'border-purple-600 shadow-md' : 'border-purple-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white"
      />
      <div className="flex items-center gap-2 px-3 py-2 bg-purple-100 rounded-t-lg border-b border-purple-200">
        <Zap size={14} className="text-purple-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Transform</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-medium text-gray-800 truncate">{data.label}</p>
        <p className="text-xs text-purple-500 mt-0.5">{typeLabel}</p>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white"
      />
    </div>
  )
}