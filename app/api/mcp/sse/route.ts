import { NextRequest } from "next/server";
import { mcpEnabled, verifyMcpToken } from "@/lib/api/mcp-auth";
import { createSession, deleteSession, getSession } from "@/lib/api/mcp-session";
import type { TypesenseProxyProfile } from "@/lib/api/proxy-typesense";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(request: NextRequest) {
  if (!mcpEnabled()) {
    return new Response("MCP server not configured", { status: 503, headers: CORS });
  }

  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return new Response("Missing token query parameter", { status: 401, headers: CORS });
  }

  const credentials = await verifyMcpToken(token);
  if (!credentials) {
    return new Response("Invalid or expired token", { status: 401, headers: CORS });
  }

  const profile: TypesenseProxyProfile = {
    host: credentials.host,
    port: credentials.port,
    protocol: credentials.protocol,
    apiKey: credentials.apiKey,
  };

  const encoder = new TextEncoder();
  let sessionId: string | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`event: message\ndata: ${data}\n\n`));
        } catch {
          // stream closed — ignore
        }
      };

      sessionId = createSession(profile, enqueue);

      // Send endpoint event so the client knows where to POST messages
      const endpointPath = `/api/mcp/messages?sessionId=${sessionId}`;
      controller.enqueue(encoder.encode(`event: endpoint\ndata: ${endpointPath}\n\n`));

      // Keep the connection alive and close idle sessions.
      pingTimer = setInterval(() => {
        try {
          if (sessionId) {
            const session = getSession(sessionId);
            if (!session) {
              controller.close();
              if (pingTimer) clearInterval(pingTimer);
              deleteSession(sessionId);
              return;
            }
          }
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // stream closed — setInterval will be cleared on cancel
        }
      }, 30_000);
    },
    cancel() {
      if (pingTimer) clearInterval(pingTimer);
      if (sessionId) deleteSession(sessionId);
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
