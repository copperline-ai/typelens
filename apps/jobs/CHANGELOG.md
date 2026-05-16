# Changelog

## [0.2.0] - 2026-05-16

### Features
- Add docker-compose local Typesense + seed script (`9d1a003`)
- Add env schema and API key security model (`0b05110`)
- Init Bun+Turborepo monorepo, scaffold dashboard + jobs, add app shell (`6fd94ca`)
- Add tsconfig/next.json preset; use it in dashboard (`b0febfc`)
- Wire up dashboard connection settings page with profile CRUD and test (`dacd47f`)
- Add Railway config, release pipelines, and GitHub repo standards (`0f7cdc6`)
- Wrap dev/deploy scripts with infisical run (`e1691c9`)
- Add health task to jobs (`b7c830c`)
- Add collapsible sidebar with icon-only mode in dashboard (`0456a18`)
- Add collection cards on collections page (`69306a6`)
- Add /api/healthz endpoint for Railway healthcheck (`53cd5b1`)
- Add collection detail page with fields table (`4a1e531`)
- Add collapsible fields + document preview on collection detail (`9a71680`)
- Add basic auth protection with login screen (COP-354) (`4e31ca0`)
- Add AES-GCM-256 Web Crypto primitives (COP-358) (`947c165`)
- Add async encrypted profile storage adapter (COP-360) (`3f0c4db`)
- Use encrypted storage adapter in connection store (COP-361) (`61a416f`)
- Add unit tests for crypto and profile-storage (COP-362) (`5af2fa6`)
- Add data API layer — React Query + ky + Next.js proxy routes (COP-363) (`8716508`)
- Add rich document browser with pagination and serverless resilience (#1) (`f872cfb`)
- Add release-it-ai-gateway and fix CI test runner (COP-364) (`29657a0`)

### Bug Fixes
- Update tsconfig package name to @copperlineai/tsconfig (`033dd66`)
- Update jobs tsconfig with proper node types and includes (`8d10408`)
- Use ConnectionStatus type in store and header; wire live status from store (`afb584e`)
- Fix Railway to use correct @copperlineai/dashboard turbo filter (`33738b4`)
- Update status dot when testing/activating a profile (`7f503c8`)

### Other
- Add tooling (husky, oxlint, oxfmt, vitest, commitlint), update monorepo config (`adc14b7`)
- Sync bun.lock after dependency updates (`50b8a7e`)
- Bump @trigger.dev/* to 4.4.6 (`a988249`)
- Ignore .trigger/ directory (`a419411`)
- Ignore next-env.d.ts (Next.js auto-generated) (`16a93ca`)
- Add search page coming soon placeholder (`4187556`)

