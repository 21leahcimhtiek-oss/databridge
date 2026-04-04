# DataBridge — Vercel Deployment Guide

Complete step-by-step guide to deploying DataBridge to production on Vercel.

**Estimated time:** 30–45 minutes

---

## Prerequisites

- GitHub account with access to the DataBridge repository
- [Vercel account](https://vercel.com) (Hobby or Pro)
- [Supabase account](https://supabase.com)
- [Stripe account](https://stripe.com)
- [Upstash account](https://upstash.com)
- [Sentry account](https://sentry.io)
- Node.js 20+ installed locally

---

## Step 1: Fork / Clone the Repository

```bash
# Clone the repository
git clone https://github.com/21leahcimhtiek-oss/databridge.git
cd databridge

# Install dependencies
npm install
```

If you're deploying a fork, go to the repository on GitHub and click **Fork** first, then clone your fork.

---

## Step 2: Create Supabase Project and Run Migration

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose an organization, name your project (e.g., `databridge-prod`), set a strong database password, and select a region
3. Wait for the project to initialize (~2 minutes)
4. Navigate to **Settings → API** and note:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret key** → `SUPABASE_SERVICE_ROLE_KEY`
5. Navigate to **SQL Editor** and run the full migration:

```bash
# Option A: Using Supabase CLI
npx supabase db push

# Option B: Manually copy and run supabase/migrations/*.sql
# in the Supabase Dashboard SQL Editor, in order
```

6. Verify tables created: `organizations`, `org_members`, `connectors`, `pipelines`, `pipeline_versions`, `pipeline_runs`, `schedules`, `billing`
7. Navigate to **Authentication → URL Configuration** and set:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

---

## Step 3: Set Up Stripe Products and Price IDs

1. Go to [stripe.com](https://stripe.com) → **Products** (use Test mode for staging)
2. Create **Starter** product:
   - Name: `DataBridge Starter`
   - Pricing: $29/month, recurring
   - Note the **Price ID** → `STRIPE_STARTER_PRICE_ID` (format: `price_...`)
3. Create **Pro** product:
   - Name: `DataBridge Pro`
   - Pricing: $99/month, recurring
   - Note the **Price ID** → `STRIPE_PRO_PRICE_ID`
4. Go to **Developers → API Keys**:
   - **Secret key** → `STRIPE_SECRET_KEY` (starts with `sk_live_` or `sk_test_`)
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (starts with `pk_`)
5. Keep the **Webhook Secret** tab open — you'll fill it in Step 8

---

## Step 4: Set Up Upstash Redis

1. Go to [upstash.com](https://upstash.com) → **Create Database**
2. Name: `databridge-ratelimit`, region: same as your Vercel deployment
3. Type: **Regional** (not Global, unless you have a Pro plan)
4. After creation, go to the database details page:
   - **REST URL** → `UPSTASH_REDIS_REST_URL`
   - **REST Token** → `UPSTASH_REDIS_REST_TOKEN`

---

## Step 5: Set Up Sentry Project

1. Go to [sentry.io](https://sentry.io) → **Projects → Create Project**
2. Select **Next.js** as the platform
3. Name the project `databridge-prod`
4. After creation, copy the **DSN** → `NEXT_PUBLIC_SENTRY_DSN`
5. Configure source maps upload by adding your Sentry auth token to Vercel env as `SENTRY_AUTH_TOKEN`

---

## Step 6: Generate Encryption Key

The `ENCRYPTION_KEY` is used to encrypt connector credentials at rest. It must be a 32-byte (64 hex characters) random value.

```bash
# Generate using OpenSSL
openssl rand -hex 32
```

**Example output:**
```
a3f8c2d1e4b5a6f7c8d9e0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1
```

⚠️ **Important**: Store this value securely. If you lose it, all stored connector credentials become unreadable. Use a password manager or secrets vault.

---

## Step 7: Deploy to Vercel with All Environment Variables

### Option A: Vercel Dashboard (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository** and connect your GitHub account
3. Select the `databridge` repository
4. In the **Environment Variables** section, add all of the following:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | From Step 2 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Step 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | From Step 2 |
| `STRIPE_SECRET_KEY` | From Step 3 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | From Step 3 |
| `STRIPE_WEBHOOK_SECRET` | From Step 8 (add after deploy) |
| `STRIPE_STARTER_PRICE_ID` | From Step 3 |
| `STRIPE_PRO_PRICE_ID` | From Step 3 |
| `UPSTASH_REDIS_REST_URL` | From Step 4 |
| `UPSTASH_REDIS_REST_TOKEN` | From Step 4 |
| `ENCRYPTION_KEY` | From Step 6 |
| `NEXT_PUBLIC_SENTRY_DSN` | From Step 5 |
| `CRON_SECRET` | `openssl rand -hex 32` (generate a new one) |

5. Click **Deploy**
6. Note your deployment URL (e.g., `https://databridge-xyz.vercel.app`)

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Repeat for each variable listed above
```

---

## Step 8: Configure Stripe Webhook Endpoint

1. In Stripe Dashboard → **Developers → Webhooks** → **Add endpoint**
2. **Endpoint URL**: `https://your-app.vercel.app/api/billing/webhook`
3. **Events to listen to**:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `checkout.session.completed`
4. Click **Add endpoint**
5. Click **Reveal** on the **Signing secret** → copy it as `STRIPE_WEBHOOK_SECRET`
6. Go back to Vercel → **Settings → Environment Variables** → add `STRIPE_WEBHOOK_SECRET`
7. **Redeploy** the application for the new variable to take effect:

```bash
vercel --prod
```

---

## Step 9: Configure Vercel Cron

DataBridge uses Vercel Cron to trigger scheduled pipeline runs. This is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/trigger",
      "schedule": "* * * * *"
    }
  ]
}
```

Verify cron is working:

1. Go to Vercel Dashboard → your project → **Cron Jobs** tab
2. You should see the `/api/cron/trigger` job listed
3. Check **Logs** to confirm it runs every minute
4. The cron endpoint is protected by `CRON_SECRET` — Vercel passes this automatically

> **Note**: Vercel Cron requires a **Pro plan** for 1-minute schedules. On Hobby plan, the minimum interval is 1 hour.

---

## Step 10: Verify Deployment Checklist

Run through this checklist to confirm everything is working:

### Authentication
- [ ] Visit `https://your-app.vercel.app` — redirects to `/login`
- [ ] Sign up with a new email address
- [ ] Confirm email via the magic link
- [ ] Successfully redirected to `/dashboard`

### Database
- [ ] Dashboard loads without errors
- [ ] `/dashboard/connectors` — page loads (empty state OK)
- [ ] `/dashboard/pipelines` — page loads (empty state OK)

### Connectors
- [ ] Create a new PostgreSQL connector with test credentials
- [ ] Click **Test Connection** — receives success or meaningful error
- [ ] Connector appears in the connectors list

### Pipeline Builder
- [ ] Create a new pipeline — canvas loads
- [ ] Add a source node
- [ ] Save pipeline — success toast appears
- [ ] Pipeline appears in `/dashboard/pipelines`

### Billing
- [ ] Visit `/dashboard/billing` — Starter and Pro plan cards visible
- [ ] Click **Upgrade to Pro** — redirects to Stripe Checkout
- [ ] Complete test checkout (use Stripe test card `4242 4242 4242 4242`)
- [ ] Return to billing page — plan shows as **Pro**

### Scheduling & Cron
- [ ] Create a schedule on a pipeline (set to `* * * * *` for testing)
- [ ] Wait 2 minutes — check **Run History** for the pipeline
- [ ] At least one run should appear

### Monitoring
- [ ] Visit your Sentry project dashboard
- [ ] Confirm the `databridge-prod` project is receiving events
- [ ] Intentionally trigger a 404 — verify it appears in Sentry

### Environment Variables
- [ ] All 13 environment variables are set in Vercel Dashboard
- [ ] No `NEXT_PUBLIC_` variables contain secret values
- [ ] `STRIPE_WEBHOOK_SECRET` is set after Step 8 and app redeployed

---

## Troubleshooting

### Build fails with "Module not found"
```bash
npm ci  # Clean install
```

### "Invalid API key" from Stripe
Verify `STRIPE_SECRET_KEY` starts with `sk_live_` (production) or `sk_test_` (test mode) and matches the mode of your `STRIPE_WEBHOOK_SECRET`.

### Supabase auth redirects to wrong URL
Update **Site URL** and **Redirect URLs** in Supabase → Authentication → URL Configuration to match your Vercel deployment URL.

### Cron job not triggering
- Ensure `vercel.json` is committed to your repo
- Verify you are on Vercel Pro for 1-minute schedules
- Check the **Cron Jobs** tab in Vercel Dashboard for error logs

### Connector test fails for all types
Ensure `ENCRYPTION_KEY` is exactly 64 hex characters. Verify it is set in Vercel production environment, not just preview.

---

## Updating / Redeploying

```bash
# Push changes to main branch
git push origin main

# Vercel automatically redeploys on push to main
# Or trigger manually:
vercel --prod
```

For database schema changes, run new migrations via Supabase CLI or Dashboard SQL Editor before deploying code that depends on them.