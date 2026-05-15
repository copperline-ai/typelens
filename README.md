# Typesense Dashboard

A dashboard for exploring and managing Typesense collections.

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
