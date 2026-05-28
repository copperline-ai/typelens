# Telemetry Funnel — Event Schema

**Owner:** PM (schema) → Founding Engineer (instrumentation) → CTO (review)
**Last updated:** 2026-05-28

## Design constraints

- **Privacy-first:** No PII. No IP logging. No user IDs beyond an anonymous session ID (first-party, generated on app load, stored in sessionStorage).
- **Lightweight:** Server-side batched POST to a single endpoint. Max one event per user action — no duplicate or redundant emissions.
- **Self-hosted compatible:** Events POST to `/api/telemetry/events` (Next.js API route). Implementations can swap the handler to any backend (PostHog, Segment, Plausible, etc.) without changing the frontend instrumentation.
- **Opt-out:** Respect `navigator.doNotTrack` and a `TYPELENS_TELEMETRY_OPT_OUT` cookie. No UI toggle in v1.

## Events

### `signup_completed`

**When:** User successfully completes the login or demo-session flow.

```json
{
  "event": "signup_completed",
  "sessionId": "uuid",
  "timestamp": "2026-05-28T12:00:00Z",
  "properties": {
    "method": "basic_auth | demo"
  }
}
```

### `onboarding_completed`

**When:** User clicks "Complete onboarding" in the `OnboardingCheckpoint` component (both steps done: connected + visited search).

```json
{
  "event": "onboarding_completed",
  "sessionId": "uuid",
  "timestamp": "2026-05-28T12:00:00Z",
  "properties": {}
}
```

### `connector_configured`

**When:** User generates an MCP access token from the Claude Team Connector settings section.

```json
{
  "event": "connector_configured",
  "sessionId": "uuid",
  "timestamp": "2026-05-28T12:00:00Z",
  "properties": {
    "isFirstToken": true
  }
}
```

## Funnel definition

```
signup_completed → onboarding_completed → connector_configured
```

Weekly readout: conversion rate at each step. Source: query the event store or forward to analytics provider.

## Implementation notes

- **Client library:** A lightweight `lib/telemetry.ts` module with a single `emitEvent(name, properties?)` function. It posts to `/api/telemetry/events` with `fetch(..., { keepalive: true })` so events are not lost on page navigation.
- **Session ID:** Generated once on first load via `crypto.randomUUID()`, stored in `sessionStorage` under `typelens:session`.
- **API route:** `app/api/telemetry/events/route.ts` — accepts POST with the event payload, writes to stdout (or a configurable sink). 204 No Content on success.
- **Opt-out hook:** In `lib/telemetry.ts`, check `navigator.doNotTrack` and `document.cookie` for `typelens_telemetry_opt_out=true` before emitting.
