/**
 * Resolve the canonical base URL of this deployment.
 *
 * Preference order:
 *   1. NEXT_PUBLIC_APP_URL env var (authoritative on Railway / prod)
 *   2. x-forwarded-proto + x-forwarded-host (behind a reverse proxy)
 *   3. host header + request protocol
 *
 * Returns a URL with no trailing slash.
 */
export function resolveBaseUrl(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}
