# Demo Mode — Design Spec

## Problem

When a user authenticates via the "Demo" path (`POST /api/auth/demo`), they get a
15-minute read-only session. Currently the UI does nothing to restrict
**connection mutability** — the demo user can add, edit, and delete connection
profiles. This breaks the demo contract: a demo session should consume a
pre-configured connection and not be able to modify connection state.

## Scope

**In scope:**
- Disable "Add Connection", "Edit Connection", "Copy Connection", "Delete
  Connection" during demo sessions.
- Propagate `isDemo` flag from the session cookie down through the server
  layout into client components.
- Read-only rendering of the Connections settings page during demo.

**Out of scope:**
- API Keys page mutability during demo (users can already view, but create/delete
  go through Typesense directly — these are not connection-level actions and the
  demo key's own permissions gate them server-side).
- Collections create/delete/clone during demo (same logic: gated by the
  Typesense API key's permissions, not by the app).
- Login page "Try Demo" button UX (separate concern).

## Approach

The demo read-only constraint applies at the **connection profile** level only.
The connection store (`lib/stores/connection.ts`) already has a `isReadOnly`
concept for the `"env-config"` profile (id-locked). We extend this to make
**all** profiles read-only when `isDemo` is true.

### Data flow

1. `app/(dashboard)/layout.tsx` (server component) already decodes the session
   token and knows `session?.isDemo`.
2. We need this boolean available client-side without a new API call.
   - **Option A:** Pass `isDemo` as a prop to a client component that writes it
     into a Zustand store (or context).
   - **Option B:** Embed it as a `<meta>` tag or `data-*` attribute.
   - **Chosen: Option A** — it follows the existing pattern (`authEnabled` is
     already passed this way to `Sidebar` and `Header`).

### Changes by file

#### 1. `lib/stores/connection.ts` — add `isDemo` flag to store state

- Add `isDemo: boolean` to `State`.
- Add `setDemo(isDemo: boolean)` to `Actions`.
- `addProfile`, `updateProfile`, `removeProfile` check `isDemo` and no-op (or
  throw) if true.

#### 2. `components/hydrate-store.tsx` — accept and write `isDemo` prop

- Accept `isDemo?: boolean` prop.
- Call `setDemo(isDemo)` after `hydrateFromStorage()`.

#### 3. `app/(dashboard)/layout.tsx` — pass `isDemo` to `HydrateStore`

- Add `isDemo={session?.isDemo ?? false}` to `<HydrateStore />`.

#### 4. `components/settings/connection-form.tsx` — gate mutations on `isDemo`

- Read `isDemo` from the connection store.
- When `isDemo` is true:
  - Open the form dialog? Deny it — the caller should prevent opening.
  - Alternatively, disable save button + show a banner inside the dialog.

#### 5. `app/(dashboard)/settings/connection/page.tsx` — gate the "+" button

- Read `isDemo` from the connection store.
- Conditionally hide the "Add Connection" button and the "Add your first
  connection" empty-state button.
- Pass `isDemo` down or gate inside each profile card.

#### 6. `components/settings/profile-card.tsx` — gate Edit/Copy/Delete buttons

- Read `isDemo` from connection store.
- Conditionally hide Edit, Copy, Delete action buttons.
- "Pre-configured" badge is already shown for `env-config` but should also show
  when `isDemo` is true.

#### 7. `components/demo-session-banner.tsx` — add note about read-only mode

- Optionally append a subtitle like "Connections are read-only in demo mode."

### Edge cases

- **Demo session + `env-config` profile**: both the `id`-level guard and the
  `isDemo` guard apply — no double-enablement risk.
- **Demo session with no `env-config`**: if the server has no TYPESENSE_HOST
  configured, there is no pre-configured connection. The demo user sees an empty
  connection list with no way to add one. This is acceptable (the demo mode
  requires a server-side connection to be useful).
- **Demo session expires in the middle of editing**: the 401 handler in
  `providers.tsx` redirects to login. The connection form dialog is dismissed by
  page navigation. No special handling needed.
- **localStorage writes**: the store's `writeProfiles` call inside `addProfile`,
  `updateProfile`, `removeProfile` should also be skipped when `isDemo` is true
  (prevent stale writes on re-hydration).

## Future considerations

- Demo mode could eventually restrict **all** mutating operations (create
  collection, delete collection, manage API keys), but those are already gated
  by the Typesense API key permissions in practice. This spec focuses on the
  connection-profile layer, which is the current gap.
