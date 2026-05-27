import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/require-auth";
import { createMcpToken, mcpEnabled } from "@/lib/api/mcp-auth";

const schema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  protocol: z.enum(["http", "https"]),
  apiKey: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  return NextResponse.json({ enabled: mcpEnabled() });
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  if (!mcpEnabled()) {
    return NextResponse.json(
      { error: "MCP server not configured — set TYPELENS_MCP_SECRET" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await createMcpToken(parsed.data);
  return NextResponse.json(result);
}
