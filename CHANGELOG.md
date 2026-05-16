# Changelog

## [1.2.0] - 2026-05-16

### Features

- Implement mobile responsiveness fixes for the typelens app (`5cf7d0e`) (COP-385)

## [1.1.0] - 2026-05-16

### Features

- Introduced Typelens visual brand identity system (COP-379) (`1866279`)

## [1.0.0] - 2026-05-16

### Features

- Remove trigger.dev apps/jobs and all references ([`f1dd251`](https://github.com/copperline-ai/typelens/commit/f1dd251))

## [0.4.0] - 2026-05-16

### Features

- Install brand guide and refactor Tailwind tokens (COP-378) (`1e6445f`)

### Other

- Add MIT license (`fbd85fa`)

## [0.3.0] - 2026-05-16

### Features
- Rename profiles to connections, remove port field, add test button (`a51a730`, `a87982d`)

### Bug Fixes
- Replace vi.stubGlobal with globalThis assignment for Bun compatibility in tests (`9dc96cf`)

### Other
- Remove CI check pipeline (`c52643e`, `f1bef1e`)

## [0.2.0] - 2026-05-16

### Features

- Initialize Bun+Turborepo monorepo, scaffold dashboard and jobs, add app shell (`6fd94ca`)
- Add docker-compose local Typesense and seed script (`9d1a003`)
- Add environment schema and API key security model (`0b05110`)
- Wire up connection settings page with profile CRUD and test (`dacd47f`)
- Add Railway config, release pipelines, and GitHub repo standards (`0f7cdc6`)
- Wrap dev/deploy scripts with infisical run (`e1691c9`)
- Add health task to jobs (`b7c830c`)
- Add collapsible sidebar with icon-only mode (`0456a18`)
- Add collection cards on collections page (`69306a6`)
- Add /api/healthz endpoint for Railway healthcheck (`53cd5b1`)
- Add collection detail page with fields table (`4a1e531`)
- Add collapsible fields and document preview on collection detail (`9a71680`)
- Add basic auth protection with login screen (COP-354) (`4e31ca0`)
- Add AES-GCM-256 Web Crypto primitives (COP-358) (`947c165`)
- Add async encrypted profile storage adapter (COP-360) (`3f0c4db`)
- Use encrypted storage adapter in connection store (COP-361) (`61a416f`)
- Add unit tests for crypto and profile-storage (COP-362) (`5af2fa6`)
- Add data API layer using React Query, ky, and Next.js proxy routes (COP-363) (`8716508`)
- Add rich document browser with pagination and serverless resilience (#1) (`f872cfb`)
- Add release-it-ai-gateway and fix CI test runner (COP-364) (`29657a0`)
- Add tsconfig/next.json preset and use it in dashboard (`b0febfc`)

### Bug Fixes

- Update tsconfig package name to @copperlineai/tsconfig (`033dd66`)
- Update jobs tsconfig with proper node types and includes (`8d10408`)
- Use ConnectionStatus type in store and header; wire live status from store (`afb584e`)
- Use correct @copperlineai/dashboard turbo filter in Railway config (`33738b4`)
- Update status dot when testing/activating a profile (`7f503c8`)

### Documentation

- Add API key security model section to README (`e54b469`)

### Chores

- Add tooling (husky, oxlint, oxfmt, vitest, commitlint), update monorepo config (`adc14b7`)
- Sync bun.lock after dependency updates (`50b8a7e`)
- Bump @trigger.dev/\* to 4.4.6 (`a988249`)
- Ignore .trigger/ directory (`a419411`)
- Ignore next-env.d.ts (Next.js auto-generated) (`16a93ca`)
- Add search page coming soon placeholder (`4187556`)
