import { NextRequest, NextResponse } from "next/server";
import { resolveBaseUrl } from "@/lib/api/base-url";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: NextRequest) {
  const base = resolveBaseUrl(request);
  return NextResponse.json(
    {
      resource: `${base}/api/mcp`,
      authorization_servers: [base],
      bearer_methods_supported: ["header"],
      scopes_supported: ["mcp"],
    },
    {
      headers: {
        ...CORS,
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
