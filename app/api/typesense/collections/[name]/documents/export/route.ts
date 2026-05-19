import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/require-auth";
import { extractProfile, buildTypesenseUrl } from "@/lib/api/proxy-typesense";

type Params = { params: Promise<{ name: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const profile = extractProfile(request);
  if (!profile) return NextResponse.json({ error: "Missing connection headers" }, { status: 400 });

  const { name } = await params;
  const url = buildTypesenseUrl(
    profile,
    `/collections/${encodeURIComponent(name)}/documents/export`,
  );

  try {
    const res = await fetch(url, {
      headers: { "X-TYPESENSE-API-KEY": profile.apiKey },
      signal: AbortSignal.timeout(60_000),
    });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (err) {
    if (err instanceof DOMException && (err.name === "AbortError" || err.name === "TimeoutError")) {
      return NextResponse.json({ error: "Typesense connection timed out" }, { status: 504 });
    }
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
