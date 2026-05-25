import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/require-auth";
import { extractProfile, proxyToTypesense } from "@/lib/api/proxy-typesense";

type Params = { params: Promise<{ name: string }> };

// Used by the collection schema-migration flow to point an alias at a new collection.
export async function PUT(request: NextRequest, { params }: Params) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const profile = extractProfile(request);
  if (!profile) return NextResponse.json({ error: "Missing connection headers" }, { status: 400 });

  const { name } = await params;
  const body = await request.text();
  return proxyToTypesense(profile, `/aliases/${encodeURIComponent(name)}`, undefined, {
    method: "PUT",
    body,
  });
}
