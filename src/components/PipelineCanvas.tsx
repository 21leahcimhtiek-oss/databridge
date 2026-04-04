'use client'

import { useCallback, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  Node,
  Edge,
  ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import SourceNode from './SourceNode'
import TransformNode from './TransformNode'
import DestinationNode from './DestinationNode'

const nodeTypes: NodeTypes = {
  source: SourceNode,
  transform: TransformNode,
  destination: DestinationNode,
}

let nodeIdCounter = 1
function nextId() { return `node_${nodeIdCounter++}` }

interface PipelineCanvasProps {
  initialNodes?: Node[]
  initialEdges?: Edge[]
  onSave?: (nodes: Node[], edges: Edge[]) => void
  readonly?: boolean
}

export default function PipelineCanvas({
  initialNodes = [],
  initialEdges = [],
  onSave,
  readonly = false,
}: PipelineCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null)

  const onConnect = useCallback(
    (connection: Connection) => setEdges(eds => addEdge(connection, eds)),
    [setEdges],
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      if (!rfInstanceRef.current || readonly) return
      const type = event.dataTransfer.getData('application/reactflow/type')
      const label = event.dataTransfer.getData('application/reactflow/label')
      if (!type) return
      const position = rfInstanceRef.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      const newNode: Node = {
        id: nextId(),
        type,
        position,
        data: { label: label || type, transformType: type, connectorType: type },
      }
      setNodes(nds => nds.concat(newNode))
    },
    [readonly, setNodes],
  )

  const handleSave = () => {
    if (onSave) onSave(nodes, edges)
  }

  return (
    <div className="w-full h-full flex flex-col" data-testid="pipeline-canvas">
      {!readonly && onSave && (
        <div className="flex justify-end px-4 py-2 bg-gray-50 border-b">
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          >
            Save Pipeline
          </button>
        </div>
      )}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readonly ? undefined : onNodesChange}
          onEdgesChange={readonly ? undefined : onEdgesChange}
          onConnect={readonly ? undefined : onConnect}
          onDrop={readonly ? undefined : onDrop}
          onDragOver={readonly ? undefined : onDragOver}
          onInit={instance => { rfInstanceRef.current = instance }}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={!readonly}
          nodesConnectable={!readonly}
          elementsSelectable={!readonly}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  )
}