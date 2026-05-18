import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/require-auth";
import { extractProfile, proxyToTypesense } from "@/lib/api/proxy-typesense";

type Params = { params: Promise<{ name: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const profile = extractProfile(request);
  if (!profile) return NextResponse.json({ error: "Missing connection headers" }, { status: 400 });

  const { name } = await params;
  const body = await request.text();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "create";
  const importParams = new URLSearchParams({ action });

  return proxyToTypesense(
    profile,
    `/collections/${encodeURIComponent(name)}/documents/import`,
    importParams,
    { method: "POST", body, contentType: "text/plain" },
  );
}
