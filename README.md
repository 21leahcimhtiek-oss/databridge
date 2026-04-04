# DataBridge

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-2.43-green)](https://supabase.com)
[![Stripe](https://img.shields.io/badge/Stripe-15.5-purple)](https://stripe.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **DataBridge** is an enterprise-grade, self-serve data pipeline platform. Connect any data source, transform it visually, and schedule automated runs — all without writing infrastructure code.

## Features

- 🔗 **Multi-source connectors** — PostgreSQL, MySQL, CSV, REST APIs, Stripe, Supabase
- 🔄 **Visual pipeline builder** — Drag-and-drop node editor powered by ReactFlow
- 🔀 **Rich transformations** — SQL, filter, rename, join, aggregate
- ⏰ **Cron scheduling** — Vercel Cron-based pipeline scheduling
- 🔐 **Team access control** — Org-scoped RBAC (admin / engineer / viewer)
- 💳 **Stripe billing** — Starter / Pro / Enterprise plans with usage limits
- 🚨 **Alerting** — Webhook + email alerts on pipeline failure
- 📊 **Observability** — Sentry error tracking + Upstash rate limiting
- 🛡️ **End-to-end encryption** — AES-256-GCM for all connector credentials

## Quick Start

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account (for billing)
- An [Upstash](https://upstash.com) Redis instance (for rate limiting)

### Installation

```bash
git clone https://github.com/21leahcimhtiek-oss/databridge.git
cd databridge
npm install
cp .env.example .env.local
```

Edit `.env.local` with your credentials, then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database Setup

Apply the Supabase migration in the SQL editor or via the CLI:

```bash
supabase db push
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_STARTER_PRICE_ID` | Stripe Price ID for Starter plan |
| `STRIPE_PRO_PRICE_ID` | Stripe Price ID for Pro plan |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `ENCRYPTION_KEY` | 64-char hex key for AES-256-GCM |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN |
| `SENTRY_ORG` | Sentry organization slug |
| `SENTRY_PROJECT` | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | Sentry auth token (source maps) |
| `NEXT_PUBLIC_APP_URL` | Public-facing application URL |

## Architecture

```
Next.js 14 (App Router)
  ├── /app              — RSC + Client Components + API Route Handlers
  └── middleware.ts     — Supabase SSR session refresh + route guard

Infrastructure
  ├── Supabase          — PostgreSQL, Auth, Row-Level Security (org isolation)
  ├── Stripe            — Subscription billing + usage limit enforcement
  └── Upstash Redis     — Rate limiting (60 req / 60 s sliding window)

Pipeline Execution
  Source node → Transform nodes → Destination node
  └── pipeline_runs row (status, rows_processed, error_msg)
      └── Alerts fired on failure (webhook / email)
```

## Deployment

### Vercel (Recommended)

1. Import the repository into Vercel
2. Set all environment variables in the project settings
3. Deploy — Vercel Cron is auto-configured via `vercel.json`

### Docker

```bash
docker build -t databridge .
docker run -p 3000:3000 --env-file .env.local databridge
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking |
| `npm test` | Run unit tests (Jest) |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:ci` | CI: Jest with coverage |

## Project Structure

```
databridge/
├── src/
│   ├── app/               # Next.js App Router pages + API routes
│   ├── components/        # Shared React components
│   ├── lib/
│   │   ├── connectors/    # Data source connectors (pg, rest, ...)
│   │   ├── transformations/ # Pipeline transforms (sql, filter, ...)
│   │   ├── supabase/      # Browser + server Supabase clients
│   │   ├── stripe/        # Stripe client
│   │   ├── encryption.ts  # AES-256-GCM helpers
│   │   └── rate-limit.ts  # Upstash Ratelimit + middleware wrapper
│   ├── types/             # Shared TypeScript type definitions
│   └── middleware.ts      # Auth session + protected route guard
├── supabase/
│   └── migrations/        # SQL migrations
├── e2e/                   # Playwright end-to-end tests
├── Dockerfile
├── vercel.json
└── .env.example
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the fork, branch, and PR process.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

## License

MIT © 2024 Aurora Rayes LLC — see [LICENSE](./LICENSE) for details.