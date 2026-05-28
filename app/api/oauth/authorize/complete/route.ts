import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-session";
import { AUTH_CODE_TTL, generateAuthCode } from "@/lib/api/oauth";
import { getDb } from "@/lib/db/client";
import { encryptApiKey } from "@/lib/db/encryption";
import { oauthClients, oauthCodes, oauthGrants } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  code_challenge: z.string().min(1),
  code_challenge_method: z.literal("S256"),
  state: z.string().optional().default(""),
  scope: z.string().optional().default("mcp"),
  profile: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
    protocol: z.enum(["http", "https"]),
    apiKey: z.string().min(1),
  }),
});

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Re-validate the client + redirect_uri server-side — never trust the client.
  const client = getDb()
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, data.client_id))
    .get();
  if (!client) {
    return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  }
  if (!client.redirectUris.includes(data.redirect_uri)) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }

  const db = getDb();
  const grantId = crypto.randomUUID();
  db.insert(oauthGrants)
    .values({
      id: grantId,
      clientId: data.client_id,
      userId: user,
      profileId: data.profile.id,
      profileName: data.profile.name,
      profileHost: data.profile.host,
      profilePort: data.profile.port,
      profileProtocol: data.profile.protocol,
      profileApiKeyEnc: encryptApiKey(data.profile.apiKey),
      scope: data.scope,
    })
    .run();

  const code = generateAuthCode();
  db.insert(oauthCodes)
    .values({
      code,
      grantId,
      clientId: data.client_id,
      redirectUri: data.redirect_uri,
      codeChallenge: data.code_challenge,
      codeChallengeMethod: data.code_challenge_method,
      scope: data.scope,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL * 1000),
    })
    .run();

  const qs = new URLSearchParams({ code });
  if (data.state) qs.set("state", data.state);
  return NextResponse.json({ redirect: `${data.redirect_uri}?${qs.toString()}` });
}
