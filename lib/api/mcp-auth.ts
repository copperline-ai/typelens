const MCP_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type McpTokenPayload = {
  host: string;
  port: number;
  protocol: "http" | "https";
  apiKey: string;
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

export async function verifyMcpToken(token: string): Promise<McpTokenPayload | null> {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;
    const encoded = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = await hmac(encoded, mcpSecret());
    if (expected !== sig) return null;
    const payload = JSON.parse(atob(encoded)) as McpTokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.host || !payload.port || !payload.protocol || !payload.apiKey) return null;
    return payload;
  } catch {
    return null;
  }
}
