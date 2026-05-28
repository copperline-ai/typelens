import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createOauthAccessToken, mcpEnabled } from "@/lib/api/mcp-auth";
import {
  ACCESS_TOKEN_TTL,
  generateRefreshToken,
  oauthError,
  OAUTH_CORS,
  REFRESH_TOKEN_TTL,
  sha256Base64url,
  verifyPkceS256,
} from "@/lib/api/oauth";
import { getDb } from "@/lib/db/client";
import { oauthCodes, oauthRefreshTokens } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: OAUTH_CORS });
}

async function readParams(request: NextRequest): Promise<URLSearchParams> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(json)) {
      if (typeof v === "string") params.set(k, v);
    }
    return params;
  }
  return new URLSearchParams(await request.text());
}

function tokenResponse(accessToken: string, refreshToken: string, scope: string) {
  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL,
      refresh_token: refreshToken,
      scope,
    },
    { headers: { ...OAUTH_CORS, "Cache-Control": "no-store", Pragma: "no-cache" } },
  );
}

async function issueTokens(grantId: string, clientId: string, scope: string) {
  const { token: accessToken } = await createOauthAccessToken(grantId);
  const refreshToken = generateRefreshToken();
  getDb()
    .insert(oauthRefreshTokens)
    .values({
      tokenHash: await sha256Base64url(refreshToken),
      grantId,
      clientId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL * 1000),
    })
    .run();
  return { accessToken, refreshToken, scope };
}

export async function POST(request: NextRequest) {
  if (!mcpEnabled()) {
    return oauthError("temporarily_unavailable", 503, "MCP server not configured");
  }

  const params = await readParams(request);
  const grantType = params.get("grant_type");

  if (grantType === "authorization_code") {
    return handleAuthorizationCode(params);
  }
  if (grantType === "refresh_token") {
    return handleRefreshToken(params);
  }
  return oauthError("unsupported_grant_type", 400);
}

async function handleAuthorizationCode(params: URLSearchParams) {
  const code = params.get("code");
  const redirectUri = params.get("redirect_uri");
  const clientId = params.get("client_id");
  const codeVerifier = params.get("code_verifier");

  if (!code || !redirectUri || !clientId || !codeVerifier) {
    return oauthError("invalid_request", 400, "Missing required parameter");
  }

  const db = getDb();
  const row = db.select().from(oauthCodes).where(eq(oauthCodes.code, code)).get();
  if (
    !row ||
    row.usedAt ||
    row.expiresAt.getTime() < Date.now() ||
    row.clientId !== clientId ||
    row.redirectUri !== redirectUri
  ) {
    return oauthError("invalid_grant", 400, "Authorization code is invalid or expired");
  }

  if (!(await verifyPkceS256(codeVerifier, row.codeChallenge))) {
    return oauthError("invalid_grant", 400, "PKCE verification failed");
  }

  // Single-use: mark consumed before issuing tokens.
  db.update(oauthCodes).set({ usedAt: new Date() }).where(eq(oauthCodes.code, code)).run();

  const { accessToken, refreshToken, scope } = await issueTokens(
    row.grantId,
    row.clientId,
    row.scope,
  );
  return tokenResponse(accessToken, refreshToken, scope);
}

async function handleRefreshToken(params: URLSearchParams) {
  const refreshToken = params.get("refresh_token");
  const clientId = params.get("client_id");
  if (!refreshToken || !clientId) {
    return oauthError("invalid_request", 400, "Missing required parameter");
  }

  const db = getDb();
  const hash = await sha256Base64url(refreshToken);
  const row = db
    .select()
    .from(oauthRefreshTokens)
    .where(eq(oauthRefreshTokens.tokenHash, hash))
    .get();
  if (!row || row.revokedAt || row.expiresAt.getTime() < Date.now() || row.clientId !== clientId) {
    return oauthError("invalid_grant", 400, "Refresh token is invalid or expired");
  }

  const {
    accessToken,
    refreshToken: newRefresh,
    scope,
  } = await issueTokens(row.grantId, row.clientId, "mcp");

  // Rotate: revoke the presented token and link it to its replacement.
  db.update(oauthRefreshTokens)
    .set({ revokedAt: new Date(), replacedByHash: await sha256Base64url(newRefresh) })
    .where(eq(oauthRefreshTokens.tokenHash, hash))
    .run();

  return tokenResponse(accessToken, newRefresh, scope);
}
