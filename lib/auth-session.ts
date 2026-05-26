export const SESSION_COOKIE = "__dashboard_session";
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const DEMO_TTL_SECONDS = 60 * 15; // 15 minutes

function signingSecret(): string {
  const s = process.env.AUTH_PASSWORD;
  if (!s) throw new Error("AUTH_PASSWORD is not set");
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

export async function createSessionToken(
  username: string,
  opts?: { isDemo?: boolean },
): Promise<string> {
  const isDemo = !!opts?.isDemo;
  const ttl = isDemo ? DEMO_TTL_SECONDS : TTL_SECONDS;
  const claims: { u: string; exp: number; d?: 1 } = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + ttl,
  };
  if (isDemo) claims.d = 1;
  const payload = btoa(JSON.stringify(claims));
  const sig = await hmac(payload, signingSecret());
  return `${payload}.${sig}`;
}

export interface SessionPayload {
  user: string;
  exp: number;
  isDemo: boolean;
}

export async function decodeSessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = await hmac(payload, signingSecret());
    if (expected !== sig) return null;
    const data = JSON.parse(atob(payload)) as { u: string; exp: number; d?: 1 };
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return { user: data.u, exp: data.exp, isDemo: data.d === 1 };
  } catch {
    return null;
  }
}

export async function verifySessionToken(token: string): Promise<string | null> {
  const decoded = await decodeSessionToken(token);
  return decoded ? decoded.user : null;
}
