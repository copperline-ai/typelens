import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/require-auth";
import { extractProfile, proxyToTypesense } from "@/lib/api/proxy-typesense";

type Params = { params: Promise<{ name: string; id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const profile = extractProfile(request);
  if (!profile) return NextResponse.json({ error: "Missing connection headers" }, { status: 400 });

  const { name, id } = await params;
  return proxyToTypesense(
    profile,
    `/collections/${encodeURIComponent(name)}/documents/${encodeURIComponent(id)}`,
  );
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const profile = extractProfile(request);
  if (!profile) return NextResponse.json({ error: "Missing connection headers" }, { status: 400 });

  const { name, id } = await params;
  return proxyToTypesense(
    profile,
    `/collections/${encodeURIComponent(name)}/documents/${encodeURIComponent(id)}`,
    undefined,
    { method: "DELETE" },
  );
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const profile = extractProfile(request);
  if (!profile) return NextResponse.json({ error: "Missing connection headers" }, { status: 400 });

  const { name, id } = await params;
  const body = await request.text();
  return proxyToTypesense(
    profile,
    `/collections/${encodeURIComponent(name)}/documents/${encodeURIComponent(id)}`,
    undefined,
    { method: "PATCH", body },
  );
}
