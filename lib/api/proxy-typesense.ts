import { NextRequest, NextResponse } from "next/server";

export type TypesenseProxyProfile = {
  host: string;
  port: number;
  protocol: "http" | "https";
  apiKey: string;
};

export function extractProfile(request: NextRequest): TypesenseProxyProfile | null {
  const host = request.headers.get("X-Ts-Host");
  const portStr = request.headers.get("X-Ts-Port");
  const protocol = request.headers.get("X-Ts-Protocol");
  const apiKey = request.headers.get("X-Ts-Api-Key");

  if (!host || !portStr || !protocol || !apiKey) return null;
  if (protocol !== "http" && protocol !== "https") return null;

  const port = Number(portStr);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;

  return { host, port, protocol, apiKey };
}

export function buildTypesenseUrl(profile: TypesenseProxyProfile, path: string): string {
  return `${profile.protocol}://${profile.host}:${profile.port}${path}`;
}

export async function proxyToTypesense(
  profile: TypesenseProxyProfile,
  path: string,
  searchParams?: URLSearchParams,
  options?: { method?: string; body?: string; contentType?: string },
): Promise<NextResponse> {
  const fullPath = searchParams?.size ? `${path}?${searchParams.toString()}` : path;
  const url = buildTypesenseUrl(profile, fullPath);
  const contentType = options?.contentType ?? (options?.body ? "application/json" : undefined);
  const reqHeaders: Record<string, string> = { "X-TYPESENSE-API-KEY": profile.apiKey };
  if (contentType) reqHeaders["Content-Type"] = contentType;
  try {
    const res = await fetch(url, {
      method: options?.method ?? "GET",
      headers: reqHeaders,
      body: options?.body,
      signal: AbortSignal.timeout(10_000),
    });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof DOMException && (err.name === "AbortError" || err.name === "TimeoutError")) {
      return NextResponse.json({ error: "Typesense connection timed out" }, { status: 504 });
    }
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
