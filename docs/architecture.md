# DataBridge — Architecture Documentation

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                              │
│  ┌──────────────┐  ┌───────────────────┐  ┌─────────────────────┐  │
│  │  Next.js App │  │  React Flow Canvas│  │   Stripe Elements   │  │
│  │  (App Router)│  │  (Pipeline Builder│  │   (Billing UI)      │  │
│  └──────┬───────┘  └────────┬──────────┘  └──────────┬──────────┘  │
└─────────┼───────────────────┼────────────────────────┼─────────────┘
          │  HTTPS            │                        │
┌─────────▼───────────────────▼────────────────────────▼─────────────┐
│                         VERCEL EDGE NETWORK                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               Next.js Middleware (Auth Check)                │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │                   Next.js App Router                         │   │
│  │  /api/pipelines  /api/connectors  /api/billing  /api/cron   │   │
│  └───┬──────────────────────┬───────────────────┬──────────────┘   │
└──────┼──────────────────────┼───────────────────┼───────────────────┘
       │                      │                   │
┌──────▼──────┐   ┌───────────▼──────┐   ┌────────▼────────┐
│  Supabase   │   │  Upstash Redis   │   │     Stripe      │
│  ─────────  │   │  ─────────────── │   │  ─────────────  │
│  Auth       │   │  Rate Limiting   │   │  Subscriptions  │
│  PostgreSQL │   │  Job Queue       │   │  Checkout       │
│  RLS        │   │  Session Cache   │   │  Webhooks       │
│  Storage    │   └──────────────────┘   └─────────────────┘
└─────────────┘
       │
┌──────▼──────────────────────────────────────────────┐
│                    Sentry                           │
│  Error tracking, performance monitoring, alerting  │
└─────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### Next.js App Router
- **Framework**: Next.js 14+ with App Router and React Server Components
- **Rendering**: Server-side rendering for dashboard pages; client components for interactive canvas
- **Middleware**: `middleware.ts` validates Supabase session on every request to `/dashboard/**` and `/api/**`
- **API Routes**: Located in `app/api/`, each route handler creates a scoped Supabase client with the request's auth cookie
- **Cron Endpoints**: `app/api/cron/trigger/route.ts` — invoked by Vercel Cron, protected by `CRON_SECRET` header verification

### Supabase (Auth / Database / RLS)
- **Auth**: Supabase Auth with email/password and magic link. JWTs stored in HTTP-only cookies via `@supabase/ssr`
- **Database**: PostgreSQL with the following core tables:
  - `organizations` — multi-tenant root entity
  - `org_members` — user ↔ org membership with roles (`owner`, `admin`, `member`)
  - `connectors` — source/destination connector definitions (encrypted config)
  - `pipelines` — pipeline metadata and React Flow JSON config
  - `pipeline_versions` — immutable version history of pipeline configs
  - `pipeline_runs` — execution log (status, started_at, finished_at, error)
  - `schedules` — cron expressions linked to pipelines
  - `billing` — Stripe customer and subscription metadata per org
- **Row Level Security**: All tables are protected by RLS policies. Every query is scoped to the authenticated user's organization

### Stripe Billing
- **Products**: Starter ($29/mo) and Pro ($99/mo) plans managed in Stripe Dashboard
- **Checkout**: `POST /api/billing/checkout` creates a Stripe Checkout Session and returns the URL
- **Portal**: `POST /api/billing/portal` creates a Stripe Customer Portal session for self-serve management
- **Webhooks**: `POST /api/billing/webhook` processes `customer.subscription.updated/deleted` events to sync plan status in Supabase

### React Flow Canvas
- **Library**: `@xyflow/react` (React Flow v12)
- **Nodes**: Source, Transform (Filter, Rename, SQL), Destination — each as a custom React component
- **State**: Pipeline config (`{ nodes, edges }`) serialized to JSON and stored in `pipelines.config`
- **Persistence**: Auto-save debounced at 2 seconds after last change via `PATCH /api/pipelines/[id]`

### Upstash Redis
- **Rate Limiting**: `@upstash/ratelimit` with sliding window algorithm, 60 requests/minute per IP
- **Applied to**: All `/api/**` routes via a shared `rateLimiter` helper
- **Job Queue** (optional): Background pipeline runs can be queued via Upstash QStash

### Sentry
- **SDK**: `@sentry/nextjs` with automatic instrumentation
- **Error Tracking**: Unhandled exceptions in API routes and client components reported with org/user context
- **Performance**: Transaction tracing for pipeline execution and API response times
- **Alerts**: Configured for error spike and latency threshold notifications

---

## Data Flow

### User Request → API Response

```
Browser Request
    │
    ▼
Vercel Edge (middleware.ts)
    │  createServerClient() — reads auth cookie
    │  supabase.auth.getUser()
    │  → 307 redirect to /login if unauthenticated
    ▼
Next.js API Route Handler
    │  rateLimiter.limit(ip) — Upstash Redis
    │  → 429 if exceeded
    │
    │  createClient() — scoped server Supabase client
    │  supabase.auth.getUser() — verify session
    │  → 401 if invalid
    ▼
Supabase Query (with RLS)
    │  All queries automatically filtered by org_id
    │  via RLS policies — no manual tenant scoping needed
    ▼
JSON Response (200/201/204/400/401/403/404/429/500)
```

### Pipeline Execution Flow

```
Vercel Cron (every minute)
    │
    ▼
POST /api/cron/trigger
    │  Verify CRON_SECRET header
    │  Query schedules WHERE next_run_at <= NOW()
    │
    ├─► For each due schedule:
    │       Insert pipeline_run { status: 'running' }
    │       Fetch pipeline.config (nodes + edges)
    │       Resolve execution order (topological sort of edges)
    │
    │       ┌──────────────────────────────────────┐
    │       │  Execute node graph:                  │
    │       │                                       │
    │       │  [Source Node]                        │
    │       │    └─ fetch data from connector       │
    │       │        (postgres query / REST call /  │
    │       │         CSV parse / Stripe list)      │
    │       │                                       │
    │       │  [Transform Nodes] (0 or more)        │
    │       │    └─ applyFilter / applyRename /     │
    │       │       applySqlTransform on row array  │
    │       │                                       │
    │       │  [Destination Node]                   │
    │       │    └─ write rows to connector         │
    │       │        (postgres INSERT/UPSERT /      │
    │       │         REST POST / CSV export)       │
    │       └──────────────────────────────────────┘
    │
    │       Update pipeline_run { status: 'success'/'failed', rows_processed, error }
    │       Update schedule.next_run_at
    │
    └─► Return { triggered: N } response
```

---

## Security Model

### Row Level Security (RLS) Policies

All database tables implement RLS. Example policies:

```sql
-- pipelines: org members can read their org's pipelines
CREATE POLICY "org_members_select_pipelines"
  ON pipelines FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid()
    )
  );

-- connectors: only owners/admins can create
CREATE POLICY "org_admins_insert_connectors"
  ON connectors FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );
```

### Credential Encryption

Connector credentials (passwords, API keys, tokens) are encrypted before storage:
- **Algorithm**: AES-256-GCM
- **Key**: `ENCRYPTION_KEY` environment variable (32-byte hex, never stored in DB)
- **Flow**: `encrypt(JSON.stringify(config))` → stored in `connectors.config` column
- **Retrieval**: `JSON.parse(decrypt(connectors.config))` in API route before use

### Rate Limiting

```typescript
// Applied to every API route
const identifier = getRateLimitIdentifier(request) // IP or user ID
const { success } = await rateLimiter.limit(identifier)
if (!success) return new Response('Too Many Requests', { status: 429 })
```

- Window: 60 requests per 60 seconds (sliding window)
- Storage: Upstash Redis (no latency penalty for serverless cold starts)

### Cron Security

Pipeline trigger endpoint (`/api/cron/trigger`) validates:
```typescript
const secret = request.headers.get('authorization')
if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 })
}
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Production Stack                   │
│                                                     │
│  Vercel (vercel.com)                                │
│  ├── Next.js app (Edge + Node.js Functions)         │
│  ├── Vercel Cron (pipeline scheduling)              │
│  └── Environment variables (all secrets)           │
│                                                     │
│  Supabase Cloud (supabase.com)                      │
│  ├── PostgreSQL database                            │
│  ├── Auth service (JWT + cookies)                   │
│  └── Storage (CSV uploads)                         │
│                                                     │
│  Upstash Cloud (upstash.com)                        │
│  └── Redis (rate limiting, optional queue)          │
│                                                     │
│  Stripe (stripe.com)                                │
│  ├── Payment processing                             │
│  └── Webhook delivery → /api/billing/webhook        │
│                                                     │
│  Sentry (sentry.io)                                 │
│  └── Error & performance monitoring                 │
└─────────────────────────────────────────────────────┘
```

### CI/CD Pipeline

1. Developer pushes to `develop` branch
2. GitHub Actions runs: lint → typecheck → tests → build
3. Vercel preview deployment created automatically for PRs
4. Merge to `main` → Vercel production deployment
5. Zero-downtime deployments via Vercel's atomic deploy model