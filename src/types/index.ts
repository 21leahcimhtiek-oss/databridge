export type OrgPlan = 'starter' | 'pro' | 'enterprise'
export type UserRole = 'admin' | 'engineer' | 'viewer'
export type ConnectorType = 'postgres' | 'mysql' | 'csv' | 'rest' | 'stripe' | 'supabase'
export type ConnectorStatus = 'active' | 'error' | 'untested'
export type PipelineStatus = 'active' | 'paused' | 'draft'
export type RunStatus = 'running' | 'success' | 'failed'
export type TransformType = 'sql' | 'filter' | 'rename' | 'join' | 'aggregate'
export type NodeType = 'source' | 'transform' | 'destination'

export interface Org {
  id: string
  name: string
  slug: string
  plan: OrgPlan
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
}

export interface AppUser {
  id: string
  org_id: string
  email: string
  role: UserRole
  created_at: string
  orgs?: Org
}

export interface Connector {
  id: string
  org_id: string
  name: string
  type: ConnectorType
  config_encrypted: Record<string, unknown>
  status: ConnectorStatus
  created_at: string
}

export interface PipelineConfig {
  nodes: Array<{
    id: string
    type: NodeType
    config: Record<string, unknown>
    position: { x: number; y: number }
  }>
  edges: Array<{ id: string; source: string; target: string }>
  version: number
}

export interface Pipeline {
  id: string
  org_id: string
  name: string
  description: string | null
  config: PipelineConfig
  status: PipelineStatus
  last_run_at: string | null
  created_at: string
}

export interface PipelineNode {
  id: string
  pipeline_id: string
  type: NodeType
  config: Record<string, unknown>
  position_x: number
  position_y: number
}

export interface PipelineEdge {
  id: string
  pipeline_id: string
  source_node_id: string
  target_node_id: string
}

export interface PipelineRun {
  id: string
  pipeline_id: string
  org_id: string
  status: RunStatus
  rows_processed: number | null
  error_msg: string | null
  started_at: string
  ended_at: string | null
}

export interface Transformation {
  id: string
  pipeline_id: string
  node_id: string
  type: TransformType
  config: Record<string, unknown>
}

export interface Schedule {
  id: string
  pipeline_id: string
  cron_expr: string
  enabled: boolean
  last_triggered_at: string | null
  next_run_at: string | null
}

export interface AlertConfig {
  id: string
  org_id: string
  pipeline_id: string
  on_failure: boolean
  webhook_url: string | null
  email: string | null
}

export interface PipelineVersion {
  id: string
  pipeline_id: string
  version_number: number
  config: PipelineConfig
  created_by: string
  created_at: string
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PlanLimits {
  pipelines: number
  rows_per_month: number
  connectors: number
}

export const PLAN_LIMITS: Record<OrgPlan, PlanLimits> = {
  starter:    { pipelines: 5,  rows_per_month: 1_000_000, connectors: 5  },
  pro:        { pipelines: -1, rows_per_month: -1,         connectors: -1 },
  enterprise: { pipelines: -1, rows_per_month: -1,         connectors: -1 },
}