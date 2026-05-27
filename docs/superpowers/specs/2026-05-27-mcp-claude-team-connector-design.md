# MCP Claude Team Connector — Design Spec

## Status: Approved (board 2026-05-27, chose approach C)

## Problem

The existing MCP server (on `feat/mcp-server`) uses Streamable HTTP transport, which only works with Claude Desktop (`claude_desktop_config.json`). Claude Team and Enterprise workspaces require MCP connectors that use **SSE (Server-Sent Events)** transport.

## Scope: Phase 1 (this sprint)

- Add SSE transport endpoint alongside existing Streamable HTTP
- Claude Team users can connect via "Add your own connector" in the admin console
- Reuse existing token-based auth infrastructure
- Update the MCP settings page to show a Claude Team connector config snippet
- Phase 2 (future): OAuth connector for the Claude directory marketplace

## Architecture

### New endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/mcp/sse` | GET | Long-lived SSE connection. Auth via `?token=` query param. Sends JSON-RPC requests to the client |
| `/api/mcp/messages` | POST | Client posts JSON-RPC responses back. Auth via Bearer token. Same auth middleware as existing route |

### SSE connection lifecycle

1. Client connects to `GET /api/mcp/sse?token=<token>` with `Accept: text/event-stream`
2. Server validates token, sends `endpoint` event with the messages URL:
   ```
   event: endpoint
   data: /api/mcp/messages?sessionId=<uuid>
   ```
3. Server sends `initialize` request via SSE:
   ```
   event: message
   data: {"jsonrpc":"2.0","id":"1","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"Claude Team","version":"1.0.0"}}}
   ```
4. Client posts responses to `POST /api/mcp/messages` with `sessionId` query param
5. Server sends `tools/list` result, tool call requests, etc. via SSE `message` events
6. Connection stays open; both sides can initiate JSON-RPC

### Auth

- **Token generation**: Unchanged from current flow — dashboard user generates HMAC-signed token from MCP settings page
- **Token verification**: Reuse `verifyMcpToken()` from `lib/api/mcp-auth.ts`
- **SSE auth**: Token passed as `?token=` query param on the SSE GET request (since SSE connections can't set custom headers)
- **Messages auth**: Bearer token in `Authorization` header (unchanged from current)
- **Session binding**: SSE session ID ties the SSE stream and messages POST together; messages POST without a valid session ID are rejected

### Session management

- In-memory `Map<sessionId, { profile, controller }>` for active SSE sessions
- Session created on SSE connect, cleaned up on SSE disconnect/error
- 5-minute idle timeout: if no messages received on the session, close the SSE connection
- Session IDs are UUIDs, generated server-side per connection

### Code structure

```
app/api/mcp/
├── route.ts          # Existing Streamable HTTP handler (unchanged)
├── sse/route.ts      # New: SSE endpoint, session creation, keep-alive
├── messages/route.ts  # New: POST endpoint for client responses
└── token/route.ts     # Existing token generation (unchanged)

lib/api/
├── mcp-auth.ts        # Existing HMAC token auth (unchanged)
└── mcp-session.ts     # New: In-memory SSE session manager
```

### SSE format

Standard SSE format:
```
event: {event_type}
data: {json_payload}\n\n
```

Event types:
- `endpoint` — sent once on connect, gives the messages URL + session ID
- `message` — JSON-RPC request or notification from server to client
- `error` — error notification
- `keepalive` — empty event sent every 30s to keep connection alive

### Keep-alive

- Server sends a comment (`: keepalive\n\n`) every 30 seconds on the SSE connection
- If no activity for 5 minutes, server closes the connection

### Middleware (proxy.ts) changes

- Add `/api/mcp/sse` and `/api/mcp/messages` to `PUBLIC_PATHS` in `proxy.ts`, since these endpoints authenticate via MCP Bearer/query token, not the dashboard session cookie
- SSE and messages endpoints handle their own auth internally (token verification)

### Next.js config

- SSE routes should use `export const runtime = "nodejs"` (not edge) since they maintain long-lived connections with in-memory state
- Add `export const dynamic = "force-dynamic"` to the SSE route to prevent static optimization

### Settings page changes

Add a "Claude Team / Enterprise" section to the existing MCP settings page:

1. After token generation, show the SSE endpoint URL: `https://<app-url>/api/mcp/sse?token=<token>`
2. Show instructions: "In your Claude admin console, add an MCP connector with this URL"
3. Keep the existing Claude Desktop config snippet below it

### CORS

All MCP endpoints use the existing CORS headers (`Access-Control-Allow-Origin: *`).

## Acceptance criteria

1. A user can generate an MCP token from the settings page
2. Connecting to `GET /api/mcp/sse?token=<valid-token>` opens a long-lived SSE connection
3. The initial `endpoint` event returns the messages URL with a session ID
4. JSON-RPC tool calls work bidirectionally over the SSE transport
5. Invalid/expired tokens return a 401 SSE event (or close the connection)
6. The connection stays alive with keep-alive pings every 30s
7. Idle connections are cleaned up after 5 minutes
8. The existing Streamable HTTP endpoint (`/api/mcp`) continues to work unchanged
9. The settings page shows the SSE connector URL after token generation
10. The `proxy.ts` middleware does not buffer the SSE connection

## Out of scope (Phase 2)

- OAuth flow for Claude connector directory
- Plugin marketplace publication
- Fine-grained per-tool permissions
- Connection pooling or horizontal scaling (in-memory sessions assume single instance for now)

## Risks

- SSE sessions are in-memory: a server restart drops all active connections. Acceptable for Phase 1. Phase 2 should use a shared store (Redis) if needed.
- Claude's MCP SSE spec is still evolving (protocol version `2024-11-05`). The SSE transport follows the pattern used by the official MCP SDK and reference servers.
