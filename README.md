# TypeLens

A Typesense collection explorer and manager.

---

## Local Development

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Compose v2+

### One-command setup

```bash
docker compose up
```

This starts:

| Service    | URL                      | Notes                                    |
|------------|--------------------------|------------------------------------------|
| Typesense  | http://localhost:8108     | API key: `xyz` (override via env)        |
| Seed       | —                        | Runs once, exits after seeding           |

The `seed` service waits for Typesense to be healthy, then:
1. Creates a **`products`** collection (fields: name, description, category, brand, price, rating, in_stock, tags)
2. Imports ~300 sample documents across 7 categories

### Configuration

Override defaults with a `.env` file at the repo root:

```env
TYPESENSE_API_KEY=your-secret-key
```

### Re-seeding

The seed script is idempotent — re-running drops and recreates the collection:

```bash
docker compose run --rm seed
```

### Stopping

```bash
docker compose down          # keep data volume
docker compose down -v       # also remove data volume
```

### Verifying

```bash
# Check health
curl http://localhost:8108/health

# List collections (replace xyz with your API key)
curl -H "X-TYPESENSE-API-KEY: xyz" http://localhost:8108/collections

# Search products
curl -H "X-TYPESENSE-API-KEY: xyz" \
  "http://localhost:8108/collections/products/documents/search?q=electronics&query_by=name,description"
```

---

## API Key Security Model

The dashboard supports two storage modes. Choose the one that matches your deployment.

### Mode 1 — localStorage (dev tool default)

Connection profiles (host, port, API key) are stored in the **browser's localStorage** only. No server ever sees your API keys.

| Property | Value |
|----------|-------|
| Who it's for | Individual developers running the dashboard locally or on a personal Vercel/Railway instance |
| Where keys live | Browser localStorage, scoped to the origin |
| Server env vars required | None — leave `TYPESENSE_ADMIN_KEY` blank |
| Risk profile | Keys are tied to one browser; clearing localStorage removes them |

**How to use:** leave `TYPESENSE_ADMIN_KEY` and `TYPESENSE_HOST` blank in `.env.local`. Open the app → Connection Settings → add a profile with your Typesense host and admin key.

> **Note:** Typesense must have CORS enabled. The local Docker Compose setup enables it automatically (`TYPESENSE_ENABLE_CORS=true`). For remote instances, pass `--enable-cors` to the Typesense process. The Connection Settings page surfaces a CORS error hint when it is missing.

### Mode 2 — Server env var (team deployment)

The admin key lives in a **server-side environment variable** and is never sent to the browser. Next.js API routes proxy sensitive operations (JSONL export, schema mutations) so the key stays server-side.

| Property | Value |
|----------|-------|
| Who it's for | Teams sharing a single dashboard deployment |
| Where keys live | Server process environment (Railway / Vercel secret) |
| Server env vars required | `TYPESENSE_ADMIN_KEY` (required), `TYPESENSE_HOST`, `TYPESENSE_PORT`, `TYPESENSE_PROTOCOL` |
| Risk profile | Key is invisible to browser; rotate in the hosting provider's secrets panel |

**How to use:** set `TYPESENSE_ADMIN_KEY` as a secret in your hosting provider and configure the `TYPESENSE_HOST`, `TYPESENSE_PORT`, `TYPESENSE_PROTOCOL`, and `TYPESENSE_API_KEY` vars to pre-populate the connection for all users. These are served to the browser only via `/api/typesense/config` — they are never baked into the JS bundle.

> **Never** put the admin key in a `NEXT_PUBLIC_*` variable — those are bundled into the client JS and visible to anyone who opens DevTools.

### Environment variable reference

Full typed declarations live in [`env.d.ts`](./env.d.ts). Copy [`.env.example`](./.env.example) to `.env.local` to get started.

| Variable | Scope | Required | Description |
|----------|-------|----------|-------------|
| `TYPESENSE_ADMIN_KEY` | Server only | Mode 2 | Admin API key for Next.js API routes |
| `TYPESENSE_HOST` | Server only | Mode 2 | Pre-configured Typesense host (served via `/api/typesense/config`) |
| `TYPESENSE_PORT` | Server only | Mode 2 | Typesense port (default `8108`) |
| `TYPESENSE_PROTOCOL` | Server only | Mode 2 | `http` or `https` |
| `TYPESENSE_API_KEY` | Server only | Optional | API key (served via `/api/typesense/config` for auto-connect) |
| `TRIGGER_SECRET_KEY` | Server only | If using jobs | Trigger.dev project secret |
| `TRIGGER_API_URL` | Server only | Optional | Override Trigger.dev API URL (self-hosting) |
| `NEXT_PUBLIC_APP_URL` | Browser + server | Recommended | Canonical app URL for CORS headers |
