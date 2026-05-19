# Deploy and Host typelens (typesense + Dashboard) on Railway

typelens is a self-hostable dashboard for Typesense — the open-source, typo-tolerant search engine. Browse collections, manage API keys, and import data from JSON or CSV without touching the raw API. One Railway deploy ships both the search engine and the dashboard, ready to go.

## 🧭 typelens

typelens is a Typesense collection explorer and manager — a clean, self-hostable dashboard that gives individuals and teams full visibility into their Typesense instance without touching the raw API.

**Features:**

- 📚 **Collection browser** — view schema, field types, and document counts across all collections
- 📂 **Import from JSON & CSV** — get your data into Typesense fast without touching the API
- 🔑 **API key management** — create, inspect, and revoke API keys with an expiration date picker
- 🌐 **Multi-server support** — manage multiple Typesense instances from a single dashboard
- ⚡ **Auto-connect** — pre-populate the connection for all users via server environment variables; no manual setup required
- 🔎 **Live search** *(coming soon)* — run queries against any collection directly from the dashboard

typelens is a [Next.js](https://nextjs.org) app. In team deployments, sensitive operations (schema mutations, JSONL export) are proxied server-side so the admin key is never exposed to the browser.

typelens is zero-configuration out of the box. Already running Typesense somewhere else? Connect it by setting these environment variables on the Railway service:

| Variable | Description |
| --- | --- |
| `TYPESENSE_SERVER_NAME` | Display name for the connection |
| `TYPESENSE_HOST` | Hostname of your Typesense instance |
| `TYPESENSE_PORT` | Typesense port |
| `TYPESENSE_API_KEY` | API key |
| `TYPESENSE_PROTOCOL` | `http` or `https` |

---

## ⚡ Typesense

Typesense is an open-source alternative to Algolia and an easier-to-use alternative to Elasticsearch. It's a single-binary search engine with no runtime dependencies, built for sub-50ms search latency and zero-downtime version upgrades.

**Features:**

- 🤔 **Typo tolerance** — handles misspellings automatically without configuration
- 🎯 **Tunable ranking** — customize how results are ordered with per-field weights and sort rules
- 🗂️ **Faceting & filtering** — let users drill into results dynamically
- 🔁 **Synonyms** — map word equivalences to broaden search recall
- 🤖 **Vector & semantic search** — index ML embeddings for similarity and hybrid search
- 🌍 **Geo search** — radius and bounding-box queries on coordinate fields
- 🔗 **Federated search** — query multiple collections in a single request
- 🏗️ **Raft-based clustering** — distributed, high-availability deployments

Official API clients: [JavaScript](https://github.com/typesense/typesense-js), [PHP](https://github.com/typesense/typesense-php), [Python](https://github.com/typesense/typesense-python), [Ruby](https://github.com/typesense/typesense-ruby). Community clients: [Go](https://github.com/typesense/typesense-go), [.NET](https://github.com/DAXGRID/typesense-dotnet), [Java](https://github.com/typesense/typesense-java), [Rust](https://github.com/typesense/typesense-rust).

---

## About Hosting typelens (typesense + Dashboard)

This template deploys two Railway services: Typesense (the search engine) and typelens (the Next.js dashboard). Both live in the same Railway project and communicate over private networking, so your admin key is never publicly exposed. Typesense runs as a persistent service with a mounted volume for data durability. typelens is zero-configuration — it auto-connects to the bundled Typesense instance on first boot. For teams, sensitive operations are proxied server-side through Next.js API routes. To connect an existing Typesense instance instead of the bundled one, set `TYPESENSE_HOST`, `TYPESENSE_PORT`, `TYPESENSE_API_KEY`, `TYPESENSE_PROTOCOL`, and `TYPESENSE_SERVER_NAME` on the typelens service.

## Common Use Cases

- **E-commerce search** — fast, faceted product search with typo tolerance and geo-aware results
- **SaaS app search** — add a real search engine to your app, not a SQL `LIKE` query
- **Internal tooling** — search across logs, documents, or records with instant results
- **AI & semantic search** — pair vector embeddings with keyword search for hybrid retrieval pipelines
- **Multi-tenant search** — isolated collections per customer or workspace with scoped API keys
- **Content platforms** — blogs, docs sites, knowledge bases, and wikis with relevance-tuned ranking

## Dependencies for typelens (typesense + Dashboard) Hosting

- **Typesense** — bundled in this template; no external search provider needed
- **Node.js runtime** — managed automatically by Railway for the typelens Next.js app

### Deployment Dependencies

- [Typesense documentation](https://typesense.org/docs/)
- [typelens on GitHub](https://github.com/copperline-ai/typelens)

### Implementation Details

Connect to your Railway-hosted Typesense instance using the JavaScript client:

```js
const Typesense = require('typesense');

const client = new Typesense.Client({
  'nodes': [{
    'host': process.env.TYPESENSE_HOST,
    'port': process.env.TYPESENSE_PORT,
    'protocol': 'https'
  }],
  'apiKey': process.env.TYPESENSE_API_KEY,
  'connectionTimeoutSeconds': 2
});

// Create a collection with faceted fields
const schema = {
  'name': 'products',
  'fields': [
    {'name': 'title', 'type': 'string'},
    {'name': 'price', 'type': 'float'},
    {'name': 'category', 'type': 'string', 'facet': true},
    {'name': 'brand', 'type': 'string', 'facet': true},
    {'name': 'location', 'type': 'geopoint'}
  ]
};

await client.collections().create(schema);

// Search with typo tolerance, filtering, faceting, and geo search
const searchResults = await client
  .collections('products')
  .documents()
  .search({
    'q': 'runing shoes',  // Typo tolerance handles this automatically
    'query_by': 'title',
    'filter_by': 'price:[50..200] && category:footwear',
    'facet_by': 'brand,category',
    'sort_by': 'price:asc',
    'geo_location': '37.7749,-122.4194',
    'geo_radius': '10 km'
  });

// Use synonyms for better search results
await client.collections('products').synonyms().upsert('footwear-synonyms', {
  'synonyms': ['shoes', 'sneakers', 'footwear', 'boots']
});
```

## Why Deploy typelens (typesense + Dashboard) on Railway?

Railway makes it dead simple to manage your infrastructure stack for the modern web. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying typelens + Typesense on Railway, you provide your stack a "search-as-a-service" offering similar to Algolia or ElasticSearch without having to deal with providers or pricing. Simply pay for usage. With typelens and JSON/CSV import, it's easier than ever to get your data into Typesense and get to building!
