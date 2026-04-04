# DataBridge API Reference

## Authentication

All API endpoints require a valid Supabase session. Include the session cookie automatically managed by `@supabase/ssr`, or pass a Bearer token in the `Authorization` header.

```
Authorization: Bearer <supabase-access-token>
```

Tokens are obtained via `supabase.auth.getSession()` on the client or from the Supabase Auth REST API.

---

## Rate Limiting

- **Limit**: 60 requests per 60 seconds (sliding window)
- **Scope**: Per IP address
- **Headers returned on 429**:
  ```
  X-RateLimit-Limit: 60
  X-RateLimit-Remaining: 0
  X-RateLimit-Reset: <unix-timestamp>
  ```

---

## Standard Response Format

### Success
```json
{
  "id": "uuid",
  "name": "Example",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Error
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

---

## Connectors

### List Connectors
`GET /api/connectors`

Returns all connectors for the authenticated user's organization.

**Response 200**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "org_id": "org-uuid",
    "name": "Production Postgres",
    "type": "postgres",
    "status": "active",
    "created_at": "2024-01-10T08:00:00Z",
    "updated_at": "2024-01-10T08:00:00Z"
  }
]
```

---

### Create Connector
`POST /api/connectors`

**Request Body**
```json
{
  "name": "Production Postgres",
  "type": "postgres",
  "config": {
    "host": "db.example.com",
    "port": 5432,
    "database": "mydb",
    "user": "readonly",
    "password": "secret",
    "ssl": true
  }
}
```

**Supported types**: `postgres`, `mysql`, `rest_api`, `csv`, `stripe`, `supabase`

**Response 201**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Production Postgres",
  "type": "postgres",
  "status": "pending",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Errors**
| Status | Code | Description |
|--------|------|-------------|
| 400 | MISSING_NAME | `name` field is required |
| 400 | INVALID_TYPE | `type` is not a supported connector type |
| 400 | MISSING_CONFIG | `config` object is required |
| 401 | UNAUTHORIZED | Invalid or missing session |

---

### Get Connector
`GET /api/connectors/[id]`

**Response 200** — Same as list item format (config is omitted for security)

**Response 404**
```json
{ "error": "Connector not found" }
```

---

### Update Connector
`PATCH /api/connectors/[id]`

**Request Body** (all fields optional)
```json
{
  "name": "Renamed Connector",
  "config": { "host": "new-host.example.com" }
}
```

**Response 200** — Updated connector object

---

### Delete Connector
`DELETE /api/connectors/[id]`

**Response 204** — No content

---

### Test Connector
`POST /api/connectors/[id]/test`

Attempts to establish a connection using the stored credentials. Updates `status` to `active` or `error`.

**Response 200**
```json
{
  "success": true,
  "message": "Connection established successfully",
  "latency_ms": 42
}
```

**Response 200 (failure)**
```json
{
  "success": false,
  "message": "Connection refused: ECONNREFUSED 127.0.0.1:5432"
}
```

---

## Pipelines

### List Pipelines
`GET /api/pipelines`

**Response 200**
```json
[
  {
    "id": "pipe-uuid",
    "name": "Sales → Analytics",
    "status": "active",
    "last_run_at": "2024-01-15T06:00:00Z",
    "last_run_status": "success",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

---

### Create Pipeline
`POST /api/pipelines`

**Request Body**
```json
{
  "name": "My Pipeline",
  "config": {
    "nodes": [],
    "edges": []
  }
}
```

**Response 201** — Created pipeline object

**Errors**
| Status | Description |
|--------|-------------|
| 400 | Missing `name` |
| 403 | Plan limit reached (Starter: 5 pipelines, Pro: unlimited) |

---

### Get Pipeline
`GET /api/pipelines/[id]`

**Response 200**
```json
{
  "id": "pipe-uuid",
  "name": "Sales → Analytics",
  "status": "active",
  "config": {
    "nodes": [
      { "id": "source-1", "type": "source", "data": { "connectorId": "conn-uuid" }, "position": { "x": 100, "y": 200 } }
    ],
    "edges": []
  },
  "version": 3,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

---

### Update Pipeline
`PATCH /api/pipelines/[id]`

**Request Body** (all fields optional)
```json
{
  "name": "Renamed Pipeline",
  "config": { "nodes": [...], "edges": [...] },
  "status": "active"
}
```

**Response 200** — Updated pipeline object. A new entry is created in `pipeline_versions`.

---

### Delete Pipeline
`DELETE /api/pipelines/[id]`

**Response 204** — No content

---

### Run Pipeline
`POST /api/pipelines/[id]/run`

Immediately triggers a pipeline execution.

**Response 202**
```json
{
  "run_id": "run-uuid",
  "status": "running",
  "started_at": "2024-01-15T10:30:00Z"
}
```

---

### List Pipeline Runs
`GET /api/pipelines/[id]/runs`

**Query Parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 20 | Max runs to return |
| offset | number | 0 | Pagination offset |

**Response 200**
```json
[
  {
    "id": "run-uuid",
    "pipeline_id": "pipe-uuid",
    "status": "success",
    "rows_processed": 1432,
    "started_at": "2024-01-15T06:00:00Z",
    "finished_at": "2024-01-15T06:00:08Z",
    "error": null
  }
]
```

---

## Schedules

### List Schedules
`GET /api/schedules`

**Response 200**
```json
[
  {
    "id": "sched-uuid",
    "pipeline_id": "pipe-uuid",
    "cron": "0 6 * * *",
    "enabled": true,
    "timezone": "America/New_York",
    "next_run_at": "2024-01-16T11:00:00Z"
  }
]
```

---

### Create Schedule
`POST /api/schedules`

**Request Body**
```json
{
  "pipeline_id": "pipe-uuid",
  "cron": "0 6 * * *",
  "timezone": "America/New_York",
  "enabled": true
}
```

**Response 201** — Created schedule object

---

### Update Schedule
`PATCH /api/schedules/[id]`

**Request Body** (all fields optional)
```json
{
  "cron": "0 */6 * * *",
  "enabled": false
}
```

**Response 200** — Updated schedule object

---

### Delete Schedule
`DELETE /api/schedules/[id]`

**Response 204** — No content

---

## Billing

### Create Checkout Session
`POST /api/billing/checkout`

**Request Body**
```json
{
  "plan": "pro",
  "successUrl": "https://app.databridge.io/dashboard/billing?success=1",
  "cancelUrl": "https://app.databridge.io/dashboard/billing"
}
```

**Response 200**
```json
{
  "url": "https://checkout.stripe.com/pay/cs_live_..."
}
```

---

### Create Customer Portal Session
`POST /api/billing/portal`

**Response 200**
```json
{
  "url": "https://billing.stripe.com/session/..."
}
```

---

### Stripe Webhook
`POST /api/billing/webhook`

Handles Stripe webhook events. Protected by `stripe.webhooks.constructEvent()` signature verification using `STRIPE_WEBHOOK_SECRET`.

**Handled Events**
- `customer.subscription.created` — activates plan
- `customer.subscription.updated` — syncs plan tier and status
- `customer.subscription.deleted` — downgrades to free tier
- `invoice.payment_failed` — marks subscription as past_due

**Response 200**
```json
{ "received": true }
```

---

## Auth

### Invite Team Member
`POST /api/auth/invite`

**Request Body**
```json
{
  "email": "colleague@example.com",
  "role": "member"
}
```

**Roles**: `owner`, `admin`, `member`

**Response 200**
```json
{ "message": "Invitation sent to colleague@example.com" }
```

---

## Cron

### Trigger Pipeline Schedules
`POST /api/cron/trigger`

**Protected**: Requires `Authorization: Bearer <CRON_SECRET>` header. Intended to be called exclusively by Vercel Cron.

**Response 200**
```json
{
  "triggered": 3,
  "skipped": 0,
  "timestamp": "2024-01-15T06:00:00Z"
}
```

---

## Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | MISSING_FIELD | Required field is absent |
| 400 | INVALID_TYPE | Field value is not an accepted enum value |
| 400 | VALIDATION_ERROR | General input validation failure |
| 401 | UNAUTHORIZED | No valid session |
| 403 | PLAN_LIMIT | Operation exceeds current plan limits |
| 403 | INSUFFICIENT_ROLE | User role does not allow this action |
| 404 | NOT_FOUND | Resource does not exist or is not accessible |
| 409 | CONFLICT | Resource already exists |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Unexpected server error |