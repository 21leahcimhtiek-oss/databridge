import { Handle, Position, NodeProps } from 'reactflow'
import { Download } from 'lucide-react'

interface DestinationNodeData {
  label: string
  connectorType: string
  connectorId?: string
}

export default function DestinationNode({ data, selected }: NodeProps<DestinationNodeData>) {
  return (
    <div
      className={`rounded-lg border-2 bg-green-50 min-w-[160px] shadow-sm transition-shadow ${
        selected ? 'border-green-600 shadow-md' : 'border-green-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
      />
      <div className="flex items-center gap-2 px-3 py-2 bg-green-100 rounded-t-lg border-b border-green-200">
        <Download size={14} className="text-green-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Destination</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-medium text-gray-800 truncate">{data.label}</p>
        {data.connectorType && (
          <p className="text-xs text-green-600 mt-0.5 capitalize">{data.connectorType}</p>
        )}
      </div>
    </div>
  )
}