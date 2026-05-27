import { NextRequest, NextResponse } from "next/server";
import { mcpEnabled, verifyMcpToken } from "@/lib/api/mcp-auth";
import {
  TOOLS,
  CORS,
  dispatchRpc,
  mcpUnauthorizedResponse,
  type JsonRpcRequest,
} from "@/lib/api/mcp-tools";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ── GET — endpoint discovery ──────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json(
    {
      name: "TypeLens MCP Server",
      version: "1.0.0",
      protocolVersion: "2024-11-05",
      transport: "streamable-http",
    },
    { headers: CORS },
  );
}

// ── POST — JSON-RPC handler ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!mcpEnabled()) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32002, message: "MCP server not configured" } },
      { status: 503, headers: CORS },
    );
  }

  // Extract Bearer token
  const auth = request.headers.get("Authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return mcpUnauthorizedResponse(request, {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32001, message: "Authentication required" },
    });
  }

  const verified = await verifyMcpToken(token);
  if (!verified) {
    return mcpUnauthorizedResponse(request, {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32001, message: "Invalid or expired token" },
    });
  }

  const profile = verified.profile;

  // Parse JSON-RPC body
  let rpc: JsonRpcRequest;
  try {
    rpc = (await request.json()) as JsonRpcRequest;
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 200, headers: CORS },
    );
  }

  // Handle notifications/initialized (no response, 204)
  if (rpc.method === "notifications/initialized") {
    return new NextResponse(null, { status: 204, headers: CORS });
  }

  const result = await dispatchRpc(rpc, profile);
  if (!result) {
    return new NextResponse(null, { status: 204, headers: CORS });
  }
  return NextResponse.json(result, { headers: CORS });
}

// Re-export for type consumers
export { TOOLS };
