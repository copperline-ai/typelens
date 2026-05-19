# Changelog

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
