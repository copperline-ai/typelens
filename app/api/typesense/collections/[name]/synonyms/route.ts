import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/require-auth";
import { extractProfile, proxyToTypesense } from "@/lib/api/proxy-typesense";

type Params = { params: Promise<{ name: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const profile = extractProfile(request);
  if (!profile) return NextResponse.json({ error: "Missing connection headers" }, { status: 400 });

  const { name } = await params;
  return proxyToTypesense(profile, `/collections/${encodeURIComponent(name)}/synonyms`);
}

export async function POST(request: NextRequest, { params }: Params) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const profile = extractProfile(request);
  if (!profile) return NextResponse.json({ error: "Missing connection headers" }, { status: 400 });

  const { name } = await params;
  const payload = (await request.json().catch(() => null)) as {
    id?: string;
    root?: string;
    synonyms?: string[];
  } | null;

  if (!payload?.id || !Array.isArray(payload.synonyms) || payload.synonyms.length === 0) {
    return NextResponse.json(
      { error: "Expected synonym payload with id and synonyms array" },
      { status: 400 },
    );
  }

  return proxyToTypesense(
    profile,
    `/collections/${encodeURIComponent(name)}/synonyms/${encodeURIComponent(payload.id)}`,
    undefined,
    { method: "POST", body: JSON.stringify(payload) },
  );
}
