import type { TypesenseProxyProfile } from "@/lib/api/proxy-typesense";

const MCP_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type McpTokenPayload = {
  host: string;
  port: number;
  protocol: "http" | "https";
  apiKey: string;
  exp: number;
};

/**
 * Discriminated union returned by verifyMcpToken.
 * - `legacy`: existing static tokens minted via /api/mcp/token (creds embedded).
 * - `oauth`: v2 tokens minted via the OAuth flow (look up grant for creds).
 *
 * In PR1 only the `legacy` branch is wired. The OAuth branch will start
 * firing once /api/oauth/token exists in PR2.
 */
export type VerifiedToken =
  | { kind: "legacy"; profile: TypesenseProxyProfile; exp: number }
  | {
      kind: "oauth";
      profile: TypesenseProxyProfile;
      grantId: string;
      clientId: string;
      exp: number;
    };

export function mcpEnabled(): boolean {
  return !!process.env.TYPELENS_MCP_SECRET;
}

function mcpSecret(): string {
  const s = process.env.TYPELENS_MCP_SECRET;
  if (!s) throw new Error("TYPELENS_MCP_SECRET is not set");
  return s;
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export async function createMcpToken(
  credentials: Omit<McpTokenPayload, "exp">,
): Promise<{ token: string; expiresAt: string }> {
  const payload: McpTokenPayload = {
    ...credentials,
    exp: Math.floor(Date.now() / 1000) + MCP_TTL_SECONDS,
  };
  const encoded = btoa(JSON.stringify(payload));
  const sig = await hmac(encoded, mcpSecret());
  const token = `${encoded}.${sig}`;
  const expiresAt = new Date(payload.exp * 1000).toISOString();
  return { token, expiresAt };
}

/**
 * Verify and decode an MCP token. Returns the credentials needed to talk to
 * Typesense, plus a `kind` tag so callers can branch on legacy vs OAuth
 * provenance (e.g. for logging or future grant-aware behavior).
 */
export async function verifyMcpToken(token: string): Promise<VerifiedToken | null> {
  const decoded = await decodeAndVerify(token);
  if (!decoded) return null;

  // v2 token (OAuth-issued) — currently no such tokens exist; PR2 will mint them
  // and add the grant lookup here. Treat as invalid for now so a partial deploy
  // doesn't accept malformed v2 tokens.
  if (isV2Payload(decoded)) {
    return null;
  }

  // Legacy token — flat payload with creds.
  if (isLegacyPayload(decoded)) {
    return {
      kind: "legacy",
      profile: {
        host: decoded.host,
        port: decoded.port,
        protocol: decoded.protocol,
        apiKey: decoded.apiKey,
      },
      exp: decoded.exp,
    };
  }

  return null;
}

type AnyPayload = Record<string, unknown>;

function isLegacyPayload(p: AnyPayload): p is McpTokenPayload {
  return (
    typeof p.host === "string" &&
    typeof p.port === "number" &&
    (p.protocol === "http" || p.protocol === "https") &&
    typeof p.apiKey === "string" &&
    typeof p.exp === "number"
  );
}

function isV2Payload(p: AnyPayload): boolean {
  return p.v === 2 && typeof p.gid === "string";
}

async function decodeAndVerify(token: string): Promise<AnyPayload | null> {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;
    const encoded = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = await hmac(encoded, mcpSecret());
    if (expected !== sig) return null;
    const payload = JSON.parse(atob(encoded)) as AnyPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
