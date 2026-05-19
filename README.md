# typelens

A Typesense collection explorer and manager.

<a href="https://railway.com/deploy/typelens-typesense-dashboard"><img src="https://railway.com/button.svg" alt="Deploy on Railway" /></a>

---

## Local Development

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Compose v2+

### One-command setup

```bash
./start.sh
```

This generates a random `TYPESENSE_API_KEY` into `.env` (if one doesn't exist), then starts:

| Service | URL | Notes |
| --- | --- | --- |
| Typesense | <http://localhost:8108> | API key from `.env` |
| typelens | <http://localhost:3000> | Pre-connected to Typesense |

typelens is pre-configured to talk to Typesense over Docker's internal network — no manual connection setup required.

### Configuration

Override any defaults with a `.env` file at the repo root before running `./start.sh`:

```env
TYPESENSE_API_KEY=your-secret-key
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

### Environment variable reference

These variables are optional. Set them to pre-configure a connection for all users — otherwise connections are managed manually in the dashboard.

| Variable | Description |
| --- | --- |
| `TYPESENSE_SERVER_NAME` | Display name for the pre-configured connection |
| `TYPESENSE_HOST` | Hostname of your Typesense instance |
| `TYPESENSE_PORT` | Typesense port (default `8108`) |
| `TYPESENSE_API_KEY` | API key |
| `TYPESENSE_PROTOCOL` | `http` or `https` |
| `AUTH_USERNAME` | Username for dashboard authentication |
| `AUTH_PASSWORD` | Password for dashboard authentication |

To enable authentication, set both `AUTH_USERNAME` and `AUTH_PASSWORD`. Generate a strong password with:

```bash
openssl rand -base64 32
```
