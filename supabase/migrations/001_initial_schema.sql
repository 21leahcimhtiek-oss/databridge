-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE orgs (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                   text NOT NULL,
  slug                   text UNIQUE NOT NULL,
  plan                   text NOT NULL DEFAULT 'starter'
                           CHECK (plan IN ('starter', 'pro', 'enterprise')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id     uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email      text NOT NULL,
  role       text NOT NULL DEFAULT 'viewer'
               CHECK (role IN ('admin', 'engineer', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE connectors (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name             text NOT NULL,
  type             text NOT NULL
                     CHECK (type IN ('postgres', 'mysql', 'csv', 'rest', 'stripe', 'supabase')),
  config_encrypted jsonb NOT NULL DEFAULT '{}',
  status           text NOT NULL DEFAULT 'untested'
                     CHECK (status IN ('active', 'error', 'untested')),
  created_at       timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE pipelines (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  config      jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[],"version":1}',
  status      text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('active', 'paused', 'draft')),
  last_run_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE pipeline_nodes (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('source', 'transform', 'destination')),
  config      jsonb NOT NULL DEFAULT '{}',
  position_x  double precision NOT NULL DEFAULT 0,
  position_y  double precision NOT NULL DEFAULT 0
);

CREATE TABLE pipeline_edges (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id    uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  source_node_id uuid NOT NULL REFERENCES pipeline_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES pipeline_nodes(id) ON DELETE CASCADE
);

CREATE TABLE pipeline_runs (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id    uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  org_id         uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'running'
                   CHECK (status IN ('running', 'success', 'failed')),
  rows_processed integer,
  error_msg      text,
  started_at     timestamptz NOT NULL DEFAULT NOW(),
  ended_at       timestamptz
);

CREATE TABLE transformations (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  node_id     uuid NOT NULL REFERENCES pipeline_nodes(id) ON DELETE CASCADE,
  type        text NOT NULL
                CHECK (type IN ('sql', 'filter', 'rename', 'join', 'aggregate')),
  config      jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE schedules (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id       uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  cron_expr         text NOT NULL,
  enabled           boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  next_run_at       timestamptz
);

CREATE TABLE alerts_config (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  on_failure  boolean NOT NULL DEFAULT true,
  webhook_url text,
  email       text
);

CREATE TABLE pipeline_versions (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id    uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  config         jsonb NOT NULL,
  created_by     uuid NOT NULL REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (pipeline_id, version_number)
);

-- ============================================================
-- HELPER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid AS $$
  SELECT org_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE orgs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE connectors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_nodes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_edges    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transformations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts_config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_versions ENABLE ROW LEVEL SECURITY;

-- Orgs: members see only their org
CREATE POLICY org_isolation ON orgs
  FOR ALL USING (id = get_user_org_id());

-- Users: see only team-mates in same org
CREATE POLICY org_isolation ON users
  FOR ALL USING (org_id = get_user_org_id());

-- Connectors
CREATE POLICY org_isolation ON connectors
  FOR ALL USING (org_id = get_user_org_id());

-- Pipelines
CREATE POLICY org_isolation ON pipelines
  FOR ALL USING (org_id = get_user_org_id());

-- Pipeline nodes (derived from pipeline org membership)
CREATE POLICY org_isolation ON pipeline_nodes
  FOR ALL USING (
    pipeline_id IN (SELECT id FROM pipelines WHERE org_id = get_user_org_id())
  );

-- Pipeline edges
CREATE POLICY org_isolation ON pipeline_edges
  FOR ALL USING (
    pipeline_id IN (SELECT id FROM pipelines WHERE org_id = get_user_org_id())
  );

-- Pipeline runs
CREATE POLICY org_isolation ON pipeline_runs
  FOR ALL USING (org_id = get_user_org_id());

-- Transformations
CREATE POLICY org_isolation ON transformations
  FOR ALL USING (
    pipeline_id IN (SELECT id FROM pipelines WHERE org_id = get_user_org_id())
  );

-- Schedules
CREATE POLICY org_isolation ON schedules
  FOR ALL USING (
    pipeline_id IN (SELECT id FROM pipelines WHERE org_id = get_user_org_id())
  );

-- Alerts config
CREATE POLICY org_isolation ON alerts_config
  FOR ALL USING (org_id = get_user_org_id());

-- Pipeline versions
CREATE POLICY org_isolation ON pipeline_versions
  FOR ALL USING (
    pipeline_id IN (SELECT id FROM pipelines WHERE org_id = get_user_org_id())
  );

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX idx_users_org_id                  ON users(org_id);
CREATE INDEX idx_connectors_org_id             ON connectors(org_id);
CREATE INDEX idx_connectors_status             ON connectors(status);
CREATE INDEX idx_pipelines_org_id              ON pipelines(org_id);
CREATE INDEX idx_pipelines_status              ON pipelines(status);
CREATE INDEX idx_pipeline_nodes_pipeline_id    ON pipeline_nodes(pipeline_id);
CREATE INDEX idx_pipeline_edges_pipeline_id    ON pipeline_edges(pipeline_id);
CREATE INDEX idx_pipeline_edges_source_node    ON pipeline_edges(source_node_id);
CREATE INDEX idx_pipeline_edges_target_node    ON pipeline_edges(target_node_id);
CREATE INDEX idx_pipeline_runs_pipeline_id     ON pipeline_runs(pipeline_id);
CREATE INDEX idx_pipeline_runs_org_id          ON pipeline_runs(org_id);
CREATE INDEX idx_pipeline_runs_status          ON pipeline_runs(status);
CREATE INDEX idx_pipeline_runs_started_at      ON pipeline_runs(started_at);
CREATE INDEX idx_transformations_pipeline_id   ON transformations(pipeline_id);
CREATE INDEX idx_transformations_node_id       ON transformations(node_id);
CREATE INDEX idx_schedules_pipeline_id         ON schedules(pipeline_id);
CREATE INDEX idx_schedules_enabled             ON schedules(enabled);
CREATE INDEX idx_schedules_next_run_at         ON schedules(next_run_at);
CREATE INDEX idx_alerts_config_org_id          ON alerts_config(org_id);
CREATE INDEX idx_alerts_config_pipeline_id     ON alerts_config(pipeline_id);
CREATE INDEX idx_pipeline_versions_pipeline_id ON pipeline_versions(pipeline_id);