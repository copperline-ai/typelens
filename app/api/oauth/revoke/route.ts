import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { OAUTH_CORS, sha256Base64url } from "@/lib/api/oauth";
import { getDb } from "@/lib/db/client";
import { oauthGrants, oauthRefreshTokens } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: OAUTH_CORS });
}

/** Decode a v2 access token's grant id without verifying the signature.
 *  Revocation only needs the claimed grant — a forged token revoking its own
 *  (nonexistent) grant is harmless. */
function grantIdFromAccessToken(token: string): string | null {
  try {
    const encoded = token.slice(0, token.lastIndexOf("."));
    const payload = JSON.parse(atob(encoded)) as { v?: number; gid?: unknown };
    return payload.v === 2 && typeof payload.gid === "string" ? payload.gid : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const params = new URLSearchParams(await request.text().catch(() => ""));
  const token = params.get("token");

  // RFC 7009: always respond 200, even for unknown/invalid tokens.
  const ok = new NextResponse(null, { status: 200, headers: OAUTH_CORS });
  if (!token) return ok;

  const db = getDb();

  // Try refresh token first (stored hashed).
  const hash = await sha256Base64url(token);
  const refresh = db
    .select()
    .from(oauthRefreshTokens)
    .where(eq(oauthRefreshTokens.tokenHash, hash))
    .get();
  if (refresh) {
    db.update(oauthRefreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(oauthRefreshTokens.tokenHash, hash))
      .run();
    db.update(oauthGrants)
      .set({ revokedAt: new Date() })
      .where(eq(oauthGrants.id, refresh.grantId))
      .run();
    return ok;
  }

  // Otherwise treat it as an access token and revoke its grant.
  const grantId = grantIdFromAccessToken(token);
  if (grantId) {
    db.update(oauthGrants).set({ revokedAt: new Date() }).where(eq(oauthGrants.id, grantId)).run();
  }
  return ok;
}
