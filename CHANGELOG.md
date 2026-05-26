# Changelog

## [1.50.12] - 2026-05-26

### Other

- Manual release (no commits since last tag in this app's path filter).

## [1.50.11] - 2026-05-26

Release triggered by CTO after setup-bun fix

### Other

- Manual release (no commits since last tag in this app's path filter).

## [1.50.10] - 2026-05-26

Retry: full release with Docker publish

### Bug Fixes

- Fix link in release notes title to point to Docker image instead of GitHub release page (`9031e57`)
- Replace oven-sh/setup-bun action with direct curl install (`c8708e8`, `c46687d`)

## [1.50.9] - 2026-05-26

<<<<<<< Updated upstream
=======
Release triggered by CTO after setup-bun fix

>>>>>>> Stashed changes
### Bug Fixes
- Fix link in release notes title to point to Docker image instead of GitHub release page (`9031e57`)
- Replace oven-sh/setup-bun with direct curl install (`c8708e8`, `c46687d`)

## [1.50.8] - 2026-05-26

### Bug Fixes

- Fix swipe right on search page not working (`ed4ca87`)

## [1.50.7] - 2026-05-26

### Other

- Render release notes body as markdown instead of raw pre text (`f05d5fa`)

## [1.50.6] - 2026-05-26

### Other

- Improved search page reconnecting logic (`1c6939c`)

## [1.50.5] - 2026-05-25

### Bug Fixes
- Remove highlight ring from search input and collections dropdown (`e6f6c1b`, `356ae80`)

### Other
- Refactor responsive connections card with footer action row in settings (`c34896c`)

## [1.50.4] - 2026-05-25

### Bug Fixes

- Consolidate connecting messages to a single line with conditional text (`4b245d0`)
- Fix connecting message with duplicate ellipsis (`a7fabe2`)

## [1.50.3] - 2026-05-25

### Bug Fixes

- Close settings popover when an item is clicked (`921c749`)

## [1.50.2] - 2026-05-25

### Other

- Change connections nav icon from Cable to Server (`d9da43a`, `d31029d`)
- Refactor CreateCollectionDialog to use Drawer on mobile and Dialog on desktop (`58883a1`)

## [1.50.1] - 2026-05-25

### Bug Fixes
- Fix race condition: hide ConnectingState when data already loaded (`934c8a1`, `4de06b4`)
- Show 'Connecting to [server name]...' instead of raw host address (`d19d864`)

## [1.50.0] - 2026-05-25

### Features

- Sidebar persistence, accurate doc counts, and removal of aliases page (`02037c8`)

## [1.49.0] - 2026-05-25

### Features

- Add alias management UI page with create/delete (`9292019`)

## [1.48.1] - 2026-05-25

Trigger deploy of alias management UI

### Other

- Manual release (no commits since last tag in this app's path filter).

## [1.48.0] - 2026-05-25

### Features
- Enhance image detection with field-name heuristics, data URI support, and content-type probing (`7a35ba1`)

## [1.47.0] - 2026-05-25

### Features

- Auto-refresh collections every 3 seconds and remove the manual refresh button (`ee4461f`, `7a11c30`)

## [1.46.0] - 2026-05-24

### Features

- Add swipe-down-to-expand for collapsed search options (`9b553c1`)

## [1.45.0] - 2026-05-24

### Features

- Swipe up to collapse search options on mobile (`7b8add8`, `869b8a6`)

## [1.44.0] - 2026-05-24

### Features

- Show summary line when search options are collapsed (`09ece4a`) (COP-513)

## [1.43.2] - 2026-05-24

### Bug Fixes

- Fix lightbox navigation to hide previous/next buttons when there is only a single image (`5cdcf94`)

## [1.43.1] - 2026-05-24

### Bug Fixes

- Improve release toast detection sensitivity (`83f275b`)

## [1.43.0] - 2026-05-24

### Features

- Add collapsible search options with grid animation (COP-508) (`bc76ab2`)

## [1.42.2] - 2026-05-24

### Other

- Improve Docker build performance by adding layer caching and trimming build context (COP-507) (`6234044`)

## [1.42.1] - 2026-05-24

### Bug Fixes

- Fix double-fire issue on swipe for search and full-screen navigation (`1681d53`)

## [1.42.0] - 2026-05-24

### Features

- Lightbox enhancements: zoom, captions, copy URL, open in new tab ([`9c218ab`](https://github.com/your-repo/typelens/commit/9c218ab))

## [1.41.0] - 2026-05-24

### Features

- Add collapsible filters sidebar with localStorage persistence in search (COP-504) (`5bac70e`)

## [1.40.0] - 2026-05-24

### Features

- Add edge-swipe page navigation for mobile (COP-503) (`3008407`)

## [1.39.0] - 2026-05-24

### Features

- Fire Paperclip webhook on CI pipeline failure (COP-502) (`1a56bec`)

## [1.38.0] - 2026-05-24

### Features

- Replace manual refresh with 30s auto-polling in collections (COP-499) (`6cdc6fd`)

## [1.37.0] - 2026-05-24

### Features

- Add click-to-reveal popover for truncated field names in field-tooltips (COP-500) (`50d950d`)

## [1.36.0] - 2026-05-24

### Features

- Unify connecting display across all screens (COP-496) (`35660c2`)

## [1.35.1] - 2026-05-24

### Bug Fixes

- Remove double padding on search page (COP-497) (`7f226f0`)

## [1.35.0] - 2026-05-24

### Features

- Move export to right row and enlarge prev/next buttons in doc navigation ([`219bf47`](219bf47))

## [1.34.1] - 2026-05-24

### Bug Fixes

- fix(popover): prevent auto-focus blue ring on settings dropdown open (COP-493) (`c51c1a4`)

## [1.34.0] - 2026-05-24

### Features
- Force card view and remove layout switcher ([`ae4f190`](ae4f190))
- Add previous/next navigation between documents ([`92f67b4`](92f67b4))

## [1.33.0] - 2026-05-24

### Features

- Hide keyboard shortcuts on mobile devices in the search feature (`8158e84`) (COP-491)

## [1.32.0] - 2026-05-24

### Features

- Use Drawer on mobile and Dialog on desktop for release notes (COP-489) (`7398b12`)

## [1.31.0] - 2026-05-24

### Features
- Add copy connection button in connections panel (`cb65c3e`)

### Bug Fixes
- Deduplicate refresh toast notifications using stable id (`4037b15`)

## [1.30.1] - 2026-05-24

### Bug Fixes

- Fix settings dropdown order to API Keys, Theme, Log out (`ecb8280`)

## [1.30.0] - 2026-05-24

### Features

- Add copy connection button in connections module (COP-486) (`7894154`)

## [1.29.0] - 2026-05-24

### Features

- Auto-select collection and persist to localStorage in search (`c2a5e10`) (COP-484)
- Move API Keys from nav to settings dropdown (`779bf2f`) (COP-485)

## [1.28.0] - 2026-05-24

### Features

- Show connecting state on search screen (`a830100`) (COP-483)

## [1.27.0] - 2026-05-23

### Features

- Default page and header logo now redirect to search (COP-482) (`793c78e`)

## [1.26.0] - 2026-05-23

### Features

- Move record navigation buttons to toolbar with horizontal layout in search (COP-481) (`f6c0fa7`)

## [1.25.0] - 2026-05-23

### Features

- Add mobile swipe gestures for pagination and lightbox in search (COP-478) (`9cea2bb`)

## [1.24.0] - 2026-05-23

### Features

- Add Copy JSON and Delete actions to document view (`998f271`)

## [1.23.2] - 2026-05-23

### Bug Fixes

- Remove breadcrumb navigation from document view page (COP-479) (`92b3dd5`)

## [1.23.1] - 2026-05-23

### Bug Fixes

- Add missing API route for individual document GET/DELETE (`8c1410e`) (COP-477)

## [1.23.0] - 2026-05-23

### Features

- Add document view page (COP-476) (`bbb4b0c`)

## [1.22.0] - 2026-05-23

### Features

- Add mobile drawer for export panel in search (COP-475) (`f4a3ca8`)

## [1.21.1] - 2026-05-23

### Bug Fixes

- Make filters scrollable on mobile in search (`4f3e6e0`)

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
