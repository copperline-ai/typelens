# Claude Team Connector — Settings Page Copy & Instructions

**Owner:** PM (inputs) → Founding Engineer (settings page integration) → CTO (review)
**Depends on:** MCP SSE endpoint implementation (Track C server-side work)
**Last updated:** 2026-05-28

## Overview

The unified Settings page needs a "Claude Team Connector" section next to Connections / API Keys / Theme. This section appears only when `TYPELENS_MCP_SECRET` is set (server-side MCP is enabled).

## Settings page section

### Section: "Claude Team Connector"

#### Token generation area

**Heading:** Claude Team Connector
**Description:** Connect Typelens to your Claude Team or Enterprise workspace so your team can search and explore Typesense collections through natural conversation.

**Label:** Access Token
**Help text:** Generate a token to authenticate your Claude workspace. Tokens are valid indefinitely until revoked.
**Button label:** Generate Token / Regenerate Token
**Warning on regenerate:** "Regenerating will invalidate the current token. All active Claude sessions will disconnect."
**Confirmation dialog:** "Regenerate access token?" / "Your Claude Team connector will stop working until you update the connector URL with the new token."

#### After token generation

**Label:** Connector URL
**Copyable field:** `https://<app-url>/api/mcp/sse?token=<generated-token>`
**Button:** Copy URL

**Instructions (static, below the URL):**

> To add this connector to your Claude workspace:
>
> 1. Copy the Connector URL above.
> 2. Open your [Claude admin console](https://console.anthropic.com) and go to **Settings → Connectors**.
> 3. Click **Add your own connector** and paste the URL.
> 4. Your team can now ask Claude questions about your Typesense data.
>
> Need help? [Read the guide](/docs/guides/claude-team-connector).

#### Empty state (no token generated)

> Generate an access token to create your connector URL. Then add it to your Claude admin console so your team can search Typesense through Claude.

**CTA Button:** Generate Token

#### Token management

- Tokens are stored server-side (HMAC-signed, same mechanism as current MCP auth).
- No "revoke" list in Phase 1 — regenerate replaces the signing secret.
- Phase 2 (future): token revocation UI per-token.

## Proxy / middleware changes

`proxy.ts` must add `/api/mcp/sse` and `/api/mcp/messages` to `PUBLIC_PATHS` — these endpoints authenticate via MCP token (query param / Bearer header), not the dashboard session cookie.

## Brand voice notes

- Use "Claude Team Connector" (not "MCP", not "SSE", not "Streamable HTTP") in all user-facing copy.
- Avoid technical terms like "token lifecycle", "SSE transport", "protocol version".
- Frame the benefit: "Your team can search Typesense through natural conversation in Claude."
