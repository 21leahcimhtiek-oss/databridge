import { Handle, Position, NodeProps } from 'reactflow'
import { Database } from 'lucide-react'

interface SourceNodeData {
  label: string
  connectorType: string
  connectorId?: string
}

export default function SourceNode({ data, selected }: NodeProps<SourceNodeData>) {
  return (
    <div
      className={`rounded-lg border-2 bg-indigo-50 min-w-[160px] shadow-sm transition-shadow ${
        selected ? 'border-indigo-600 shadow-md' : 'border-indigo-300'
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-100 rounded-t-lg border-b border-indigo-200">
        <Database size={14} className="text-indigo-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Source</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-medium text-gray-800 truncate">{data.label}</p>
        {data.connectorType && (
          <p className="text-xs text-indigo-500 mt-0.5 capitalize">{data.connectorType}</p>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white"
      />
    </div>
  )
}