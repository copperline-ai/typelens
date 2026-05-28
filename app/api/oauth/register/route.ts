import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateClientId, OAUTH_CORS } from "@/lib/api/oauth";
import { getDb } from "@/lib/db/client";
import { oauthClients } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  redirect_uris: z.array(z.string().url()).min(1),
  client_name: z.string().min(1).max(256).optional(),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
  token_endpoint_auth_method: z.string().optional(),
  scope: z.string().optional(),
  software_id: z.string().optional(),
  software_version: z.string().optional(),
});

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: OAUTH_CORS });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "Invalid JSON body" },
      { status: 400, headers: OAUTH_CORS },
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_redirect_uri",
        error_description: "redirect_uris must be a non-empty array of absolute URLs",
      },
      { status: 400, headers: OAUTH_CORS },
    );
  }

  const m = parsed.data;
  const clientId = generateClientId();
  const clientName = m.client_name ?? "MCP Client";
  const redirectUris = m.redirect_uris;
  const grantTypes = m.grant_types ?? ["authorization_code", "refresh_token"];
  const responseTypes = m.response_types ?? ["code"];
  const tokenEndpointAuthMethod = m.token_endpoint_auth_method ?? "none";
  const scope = m.scope ?? "mcp";

  try {
    getDb()
      .insert(oauthClients)
      .values({
        clientId,
        clientName,
        redirectUris,
        grantTypes,
        responseTypes,
        tokenEndpointAuthMethod,
        scope,
        softwareId: m.software_id ?? null,
        softwareVersion: m.software_version ?? null,
      })
      .run();
  } catch (err) {
    console.error("[oauth/register] failed to persist client:", err);
    return NextResponse.json(
      {
        error: "server_error",
        error_description: err instanceof Error ? err.message : String(err),
      },
      { status: 500, headers: OAUTH_CORS },
    );
  }

  return NextResponse.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: grantTypes,
      response_types: responseTypes,
      token_endpoint_auth_method: tokenEndpointAuthMethod,
      scope,
    },
    { status: 201, headers: OAUTH_CORS },
  );
}
