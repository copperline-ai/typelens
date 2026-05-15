export const SESSION_COOKIE = "__dashboard_session";
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function signingSecret(): string {
  const s = process.env.BASIC_AUTH_PASSWORD;
  if (!s) throw new Error("BASIC_AUTH_PASSWORD is not set");
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

export async function createSessionToken(username: string): Promise<string> {
  const payload = btoa(
    JSON.stringify({ u: username, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS }),
  );
  const sig = await hmac(payload, signingSecret());
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = await hmac(payload, signingSecret());
    if (expected !== sig) return null;
    const data = JSON.parse(atob(payload)) as { u: string; exp: number };
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.u;
  } catch {
    return null;
  }
}
