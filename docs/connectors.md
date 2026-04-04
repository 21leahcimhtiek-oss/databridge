# DataBridge Connector Reference

Connectors define how DataBridge reads data from **sources** and writes data to **destinations**. Each connector stores its configuration encrypted at rest using AES-256-GCM.

---

## Supported Connector Types

| Type | Key | Use As |
|------|-----|--------|
| PostgreSQL | `postgres` | Source / Destination |
| MySQL | `mysql` | Source / Destination |
| REST API | `rest_api` | Source |
| CSV File | `csv` | Source / Destination |
| Stripe | `stripe` | Source |
| Supabase | `supabase` | Source / Destination |

---

## PostgreSQL

Connect to any PostgreSQL-compatible database (PostgreSQL, Amazon RDS, Aurora, Supabase, Neon, etc.).

### Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `host` | string | ✅ | Database hostname or IP address |
| `port` | number | ✅ | Port number (default: 5432) |
| `database` | string | ✅ | Database name |
| `user` | string | ✅ | Database username |
| `password` | string | ✅ | Database password |
| `ssl` | boolean | ❌ | Enable SSL/TLS (recommended for production) |
| `ssl_reject_unauthorized` | boolean | ❌ | Verify server certificate (default: true) |
| `connection_timeout_ms` | number | ❌ | Connection timeout in ms (default: 10000) |

### Example Config
```json
{
  "host": "db.example.com",
  "port": 5432,
  "database": "analytics",
  "user": "databridge_readonly",
  "password": "••••••••",
  "ssl": true
}
```

### Permissions
- **Source**: User needs `SELECT` on target tables
- **Destination**: User needs `INSERT`, `UPDATE`, and optionally `DELETE`

---

## MySQL

Connect to MySQL 5.7+ or MariaDB.

### Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `host` | string | ✅ | Database hostname |
| `port` | number | ✅ | Port number (default: 3306) |
| `database` | string | ✅ | Database name |
| `user` | string | ✅ | Database username |
| `password` | string | ✅ | Database password |
| `ssl` | boolean | ❌ | Enable SSL (recommended) |

### Example Config
```json
{
  "host": "mysql.example.com",
  "port": 3306,
  "database": "production",
  "user": "reader",
  "password": "••••••••"
}
```

---

## REST API

Fetch data from any HTTP(S) endpoint.

### Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | ✅ | Full URL of the API endpoint |
| `method` | string | ✅ | HTTP method: `GET`, `POST` |
| `headers` | object | ❌ | Additional HTTP headers |
| `body` | string | ❌ | Request body (for POST) |
| `auth.type` | string | ❌ | Auth strategy: `bearer`, `basic`, `api_key` |
| `auth.token` | string | ❌ | Bearer token value |
| `auth.username` | string | ❌ | Basic auth username |
| `auth.password` | string | ❌ | Basic auth password |
| `auth.key` | string | ❌ | API key value |
| `auth.header` | string | ❌ | Header name for API key (default: `X-API-Key`) |
| `dataPath` | string | ❌ | Dot-notation path to array in response, e.g. `data.items` |
| `pagination.type` | string | ❌ | Pagination: `cursor`, `offset`, `page`, `none` |
| `pagination.nextCursorPath` | string | ❌ | Path to next cursor in response |
| `pagination.pageParam` | string | ❌ | Query param name for page number |
| `pagination.limitParam` | string | ❌ | Query param name for page size |

### Example Config (Bearer Auth)
```json
{
  "url": "https://api.example.com/v2/events",
  "method": "GET",
  "auth": {
    "type": "bearer",
    "token": "••••••••"
  },
  "dataPath": "data",
  "pagination": {
    "type": "cursor",
    "nextCursorPath": "meta.next_cursor"
  }
}
```

---

## CSV File

Upload and process CSV files from your local machine or an HTTP URL.

### Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source` | string | ✅ | `upload` or `url` |
| `url` | string | ❌ | URL to fetch CSV from (when `source: url`) |
| `delimiter` | string | ❌ | Column delimiter (default: `,`) |
| `has_header` | boolean | ❌ | First row is header (default: `true`) |
| `encoding` | string | ❌ | File encoding (default: `utf-8`) |
| `skip_rows` | number | ❌ | Number of rows to skip at the beginning |

### File Upload Instructions
1. Navigate to **Connectors → New Connector**
2. Select **CSV** as the connector type
3. Click **Upload File** and select your `.csv` file (max 50 MB)
4. DataBridge detects the delimiter and column names automatically
5. Preview the first 10 rows before saving
6. The file is stored securely in Supabase Storage

---

## Stripe

Pull data from your Stripe account (customers, payments, subscriptions, invoices).

### Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `api_key` | string | ✅ | Stripe Secret Key (`sk_live_...` or `sk_test_...`) |
| `endpoint` | string | ✅ | Stripe resource to sync: `customers`, `charges`, `subscriptions`, `invoices`, `products`, `prices`, `events` |
| `created_after` | string | ❌ | ISO 8601 date — only fetch records created after this date |
| `limit` | number | ❌ | Max records per sync (default: all) |

### Example Config
```json
{
  "api_key": "sk_live_••••••••",
  "endpoint": "charges",
  "created_after": "2024-01-01T00:00:00Z"
}
```

### Permissions
Use a **Restricted Key** in Stripe Dashboard with only the read permissions needed for your selected endpoints. Never use your full secret key if a restricted key will do.

---

## Supabase

Connect to a Supabase project to read/write PostgreSQL tables via the PostgREST API.

### Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_url` | string | ✅ | Supabase project URL, e.g. `https://xxxx.supabase.co` |
| `anon_key` | string | ✅ | Supabase anon/public API key |
| `service_role_key` | string | ❌ | Service role key — bypasses RLS (use with care) |
| `table` | string | ✅ | Table name to read from or write to |
| `schema` | string | ❌ | Schema name (default: `public`) |
| `select` | string | ❌ | PostgREST select string (default: `*`) |

### Example Config
```json
{
  "project_url": "https://abcdefgh.supabase.co",
  "anon_key": "eyJhbGciOiJIUzI1NiIs...••••••••",
  "table": "orders",
  "schema": "public",
  "select": "id,customer_id,total,created_at"
}
```

---

## Security

### Credential Encryption

All connector configuration (including passwords, API keys, and tokens) is encrypted before being written to the database:

1. **Before save**: `encrypt(JSON.stringify(config))` using AES-256-GCM
2. **Encryption key**: Derived from `ENCRYPTION_KEY` environment variable (32-byte random hex)
3. **Storage**: Only the ciphertext is stored in `connectors.config` — the key never touches the database
4. **Before use**: `JSON.parse(decrypt(connectors.config))` in the API route, immediately before establishing the connection
5. **Never exposed**: Raw config values are never returned in API responses

### Best Practices

- Use **read-only database users** for source connectors
- Use **restricted API keys** with minimum required permissions
- Enable **SSL** for all database connectors in production
- **Rotate credentials** periodically — update them in DataBridge via the connector edit flow
- Use Stripe **Restricted Keys** instead of your full secret key

---

## Testing Connections

After creating or updating a connector, always test the connection:

1. Navigate to **Connectors** in the dashboard
2. Click the connector you want to test
3. Click **Test Connection**
4. DataBridge will attempt to connect and report:
   - ✅ **Success**: Connection established, latency shown
   - ❌ **Error**: Error message from the connection attempt

The connector's `status` field is updated to `active` (success) or `error` (failure) after each test.

You can also test via the API:
```bash
curl -X POST https://app.databridge.io/api/connectors/{id}/test \
  -H "Authorization: Bearer <your-token>"
```