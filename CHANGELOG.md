# Changelog

## [1.21.0] - 2026-05-22

### Features

- Enhance mobile layout and fix network error via proxy in search feature (COP-473) (`aeef90a`)

## [1.20.1] - 2026-05-22

### Bug Fixes

- Restore decorative search icon left-aligned in input (`e54bea7`)

## [1.20.0] - 2026-05-22

### Features

- Full InstantSearch UI with Typesense adapter (`51c0414`)

## [1.19.7] - 2026-05-21

### Bug Fixes
- Suppress Radix DialogContent aria-describedby warnings for better accessibility compliance (`b04f991`)
- Replace deprecated middlewareClientMaxBodySize with proxyClientMaxBodySize in config (`dec74f7`)

## [1.19.6] - 2026-05-21

### Bug Fixes

- Fix import process to batch documents in 500-record chunks with per-batch retry and progress tracking (`fb8b4ef`)

## [1.19.5] - 2026-05-21

### Bug Fixes

- fix(docker): disable provenance attestation to remove unknown/unknown manifest entry (`576119e`)

## [1.19.4] - 2026-05-21

### Bug Fixes

- Fix recognition of schema JSON in create-from-file mode in collections (`de6a919`)

## [1.19.3] - 2026-05-21

### Bug Fixes
- Correct body size limit configuration
- Exclude id from schema diff
- Add schema export (`9955d88`)

## [1.19.2] - 2026-05-21

### Bug Fixes

- Increase request body size limit to 100mb for large document imports (`a998334`)

### Other

- Revert fallback to JSONL parsing for .json files with newline-delimited JSON (`3d3e6b0`)

## [1.19.1] - 2026-05-21

### Bug Fixes

- Fix fallback to JSONL parsing when `.json` file contains newline-delimited JSON (`f7e2292`)

## [1.19.0] - 2026-05-21

### Features

- Support JSONL/NDJSON files in create-from-file mode in collections (`763b21f`)

## [1.18.5] - 2026-05-21

### Bug Fixes

- Force dynamic rendering on login page to ensure environment variables are read at runtime (`9e599bc`)

## [1.18.4] - 2026-05-21

### Other

- Bump actions/checkout from v4 to v6 in CI configuration (`2b076a0`)

## [1.18.3] - 2026-05-21

### Bug Fixes

- Drop GitHub OAuth and restore plain user/password authentication (`2b18c39`)

## [1.18.2] - 2026-05-21

### Bug Fixes

- Fix `AUTH_ENABLED` in `proxy.ts` to cover GitHub OAuth provider (`06ce7b0`)

## [1.18.1] - 2026-05-21

### Bug Fixes

- Fix Docker multi-arch support for Apple Silicon (arm64) (`d521d70`)

## [1.18.0] - 2026-05-21

### Features
- Add PATCH schema, truncate documents, and alias CRUD routes (`fed08cb`)
- Add updateCollectionSchema, truncateDocuments, alias operations, and importDocumentsWithOptions to client (`413980d`)
- Add EditSchemaDialog with direct PATCH and alias migration support (`5eb103e`)
- Add ImportRecordsDialog with schema diffing and JSON/JSONL/CSV support (`8b6b427`)
- Add AddEmbeddingDialog for auto-embed and manual vector field configuration (`28f9bb7`)
- Wire up EditSchema, ImportRecords, AddEmbedding, and Truncate on collection details page (`44bd0ef`)
- Add collection rename support and import error surfacing (`d7c7c9f`)

### Bug Fixes
- Correct diffSchemas compatible/conflict overlap and type safety (`bc5e208`)
- Remove dead rename logic, guard default_sorting_field, fix form reset and empty-fields validation (`5403070`)

### Other
- Refactor: extract inferType/inferFieldsFromRecords to lib/schema-utils, add diffSchemas (`3e5b228`)
- Refactor: deduplicate importDocuments via delegation, tighten SchemaFieldPatch type (`4684d56`)
- Add missing tests for aliases list, document truncate, and alias GET routes (`a9c511e`)

## [1.17.1] - 2026-05-20

### Bug Fixes

- Fix showing card view on mobile when table view is active in collections (`a3fcfa0`, `b472d54`)

## [1.17.0] - 2026-05-20

### Other

- Manual release (no commits since last tag in this app's path filter).

## [1.16.0] - 2026-05-20

### Features

- Add GitHub OAuth app support for authentication (`a95a231`)

## [1.15.2] - 2026-05-20

### Other

- Manual release (no commits since last tag in this app's path filter).

## [1.15.1] - 2026-05-19

### Bug Fixes

- Fix sorting of release notes by published_at date descending (`47e62d9`, `c93c9a7`)

## [1.15.0] - 2026-05-19

### Features

- Add release notes modal on version string click (`c877d91`)

## [1.14.0] - 2026-05-19

### Features

- Add docker-compose and start script for local development (`813253f`)

## [1.13.2] - 2026-05-19

### Other

- Standardize product name to lowercase typelens (`795b161`)

## [1.13.1] - 2026-05-19

### Other

- Add Railway template markdown and update README (`d43c81e`)

## [1.13.0] - 2026-05-19

### Features

- Poll `/api/healthz` for version and show toast notification on new deploy (`1367179`)

## [1.12.0] - 2026-05-19

### Features

- Add optional expires_at dropdown on API key create dialog and larger status dot tap target (`81e3a1a`)

## [1.11.0] - 2026-05-19

### Features

- Replace logo with TL lettermark icon (`a1ced08`)

## [1.10.0] - 2026-05-19

### Features

- Add API key management page and routes (`651ba2d`) (COP-457)

## [1.9.0] - 2026-05-19

### Features

- Add collection cloning action to typelens collections (COP-455) (`9c770de`)

## [1.8.0] - 2026-05-19

### Features

- Export collection as JSONL in documents module (COP-454) (`9452fad`)

## [1.7.1] - 2026-05-19

### Bug Fixes

- Prevent document pagination from wrapping on mobile devices (`8cd7d7d`)

## [1.7.0] - 2026-05-19

### Features

- Added wordmark-only logo in expanded sidebar and mobile header (COP-451) (`77e443e`)

## [1.6.0] - 2026-05-19

### Features

- Mobile: icon-only navigation and gear settings popover (`6e33352`) (COP-450)

## [1.5.0] - 2026-05-19

### Features

- Mobile improvements including icon-only logo, dot-only status, and settings gear on mobile devices (COP-449) (`49fef32`)

## [1.4.0] - 2026-05-19

### Features

- Add mobile header navigation and hide sidebar on small screens (COP-448) (`e27c677`)

## [1.3.1] - 2026-05-19

### Bug Fixes

- Remove host row from status popover (COP-447) (`e72f40a`)

## [1.3.0] - 2026-05-18

### Features
- Replace logo and app icon with new brand asset (`b18ad2b`, `be4f8fd`)  
- Show Typesense server version in status popover (`488a5b7`)  
- Add Learn more links to schema form areas in collections (`66c9822`)  
- Sort collections by name and date with icon toolbar; pin sidebar gear (`f2f101e`)  
- Add card/table view toggle with localStorage persistence in collections (`f87703f`)  
- Add list/card view toggle for connections; expand to full content width (`ff54740`)

### Bug Fixes
- Check field optionality and keys across all records, not just sample (`eeed723`)  
- Use logo.png directly instead of favicon.svg for header icon (`53c389a`)  
- Add viewport-fit=cover and safe-area padding for sidebar gear on iPhone (`d1a6a7b`)  
- Pin gear icon to bottom on mobile/PWA via overflow-hidden + min-h-0 (`cc0053e`)  
- Show logout by checking session cookie, not build-time env vars (`0b3577a`)  
- Correct broken SVG path and add favicon.ico for Chrome (`53db91e`)  
- Drop version row in status popover (`23a8cf3`)  
- Left-align view toggle, right-align sort toolbar in collections (`ac7b72f`)  
- Regenerate all favicon assets from logo.png (`b2b7252`)  
- Update API key Learn more URL and add auth link to modal header (`91b12b3`)  
- Remove background from logo before generating favicon assets (`255095c`)  
- Drop "Set via environment variables" label in profile card (`dfe30d8`)  
- Change dialog description link text to "How authentication works" (`8dc99c5`)  
- Suppress browser autofill on connection fields (`083a720`)  
- Right-align action icons opposite connection info (`c671e86`)  
- Wrap action buttons below info on narrow viewports (`1db915d`)  
- Move connections view toggle to left-aligned toolbar above list (`e9bb091`)  
- Remove subtitle from connections page header (`40a7c4c`)  
- Use h-dvh for mobile viewport height (`2f77c21`)  
- Prevent silent no-op when paths contains "." and remove workflow path filter (`5fb31cc`, `88ad29f`)  
- Switch Railway builder from DOCKERFILE to RAILPACK (`5dbb6ef`)  
- Use GH_TOKEN instead of GITHUB_TOKEN to bypass branch protection (`ae0d64c`)

### Other
- Refresh .env.example for current application (`e943ab5`)

## [1.2.7] - 2026-05-18

### Other

- Manual release (no commits since last tag in this app's path filter).

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
