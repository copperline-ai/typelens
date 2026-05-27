import { NextRequest, NextResponse } from "next/server";
import { mcpEnabled, verifyMcpToken } from "@/lib/api/mcp-auth";
import { getSession } from "@/lib/api/mcp-session";
import { dispatchRpc, jsonErr, CORS, type JsonRpcRequest } from "@/lib/api/mcp-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_MESSAGES = {
  ...CORS,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_MESSAGES });
}

export async function POST(request: NextRequest) {
  if (!mcpEnabled()) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32002, message: "MCP server not configured" } },
      { status: 503, headers: CORS_MESSAGES },
    );
  }

  // Auth: Bearer token in Authorization header
  const auth = request.headers.get("Authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Authentication required" } },
      { status: 401, headers: CORS_MESSAGES },
    );
  }

  const credentials = await verifyMcpToken(token);
  if (!credentials) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Invalid or expired token" } },
      { status: 401, headers: CORS_MESSAGES },
    );
  }

  // Resolve session
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32002, message: "Missing sessionId" } },
      { status: 400, headers: CORS_MESSAGES },
    );
  }

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32002, message: "Session not found or expired" },
      },
      { status: 404, headers: CORS_MESSAGES },
    );
  }

  // Parse JSON-RPC body
  let rpc: JsonRpcRequest;
  try {
    rpc = (await request.json()) as JsonRpcRequest;
  } catch {
    const errResponse = jsonErr(null, -32700, "Parse error");
    session.enqueue(JSON.stringify(errResponse));
    return new NextResponse(null, { status: 202, headers: CORS_MESSAGES });
  }

  // Dispatch and send response via SSE stream
  const response = await dispatchRpc(rpc, session.profile);

  if (response !== null) {
    session.enqueue(JSON.stringify(response));
  }

  // MCP SSE transport: always respond 202 Accepted; actual response is on the stream
  return new NextResponse(null, { status: 202, headers: CORS_MESSAGES });
}
