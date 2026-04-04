# Changelog

All notable changes to DataBridge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-06-01

### Added

#### Core Platform
- Multi-tenant organization model with org-scoped data isolation via Supabase Row-Level Security
- Role-based access control with three roles: `admin`, `engineer`, `viewer`
- AES-256-GCM end-to-end encryption for all connector credentials stored at rest
- Org plan system: Starter (5 pipelines, 1M rows/month), Pro (unlimited), Enterprise (unlimited)

#### Connectors
- PostgreSQL connector with connection pooling via `pg` Pool (max 5, SSL support)
- MySQL connector support
- CSV file upload connector
- REST API connector supporting Bearer token, HTTP Basic, and API-key authentication
- Stripe data connector
- Supabase connector

#### Pipeline Builder
- Visual drag-and-drop pipeline editor powered by ReactFlow 11
- Three node types: Source, Transform, Destination
- JSON-serializable pipeline configuration with versioning (`pipeline_versions` table)
- Pipeline status lifecycle: `draft` → `active` / `paused`
- Pipeline versioning with full config snapshots and author tracking

#### Transformations
- SQL transform — in-memory query execution via AlaSQL with automatic table aliasing
- Filter transform — AND/OR logic with 10 operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `not_contains`, `is_null`, `is_not_null`
- Rename/remap transform — column renaming with passthrough for unmapped columns
- Join transform
- Aggregate transform

#### Scheduling and Automation
- Cron-based pipeline scheduling stored in `schedules` table
- `next_run_at` calculation using `cron-parser`
- Automatic `last_triggered_at` tracking per schedule
- Vercel Cron trigger endpoint: `/api/cron/trigger-scheduled-runs` (runs every minute)

#### Billing
- Stripe integration for Starter, Pro, and Enterprise subscription plans
- Usage limit enforcement checked at pipeline run time
- Stripe webhook handler for subscription lifecycle events (created, updated, deleted)
- Billing portal redirect for self-serve plan management

#### Observability and Reliability
- Sentry error tracking across all three Next.js runtimes: client, server, edge
- Upstash Redis sliding-window rate limiter (60 requests per 60 seconds)
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers on all API responses
- Pipeline run logs with `rows_processed` count and `error_msg` on failure

#### Alerting
- Configurable per-pipeline alert rules (`alerts_config` table)
- Webhook POST alerts on pipeline failure
- Email alerts via Nodemailer on pipeline failure

#### Developer Experience
- Next.js 14 App Router with React Server Components
- TypeScript strict mode throughout the entire codebase
- Supabase SSR cookie-based session management (no localStorage)
- Jest unit testing setup with jsdom environment
- Playwright end-to-end testing setup (Chromium)
- Docker multi-stage build (deps → builder → runner)
- Vercel deployment with automatic cron configuration

[1.0.0]: https://github.com/21leahcimhtiek-oss/databridge/releases/tag/v1.0.0