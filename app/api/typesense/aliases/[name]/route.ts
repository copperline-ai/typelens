import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/require-auth";
import { extractProfile, proxyToTypesense } from "@/lib/api/proxy-typesense";

type Params = { params: Promise<{ name: string }> };

async function requireAliasContext(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return { error: authError };

  const profile = extractProfile(request);
  if (!profile) {
    return {
      error: NextResponse.json({ error: "Missing connection headers" }, { status: 400 }),
    };
  }

  return { profile };
}

// Used by the collection schema-migration flow to point an alias at a new collection.
export async function PUT(request: NextRequest, { params }: Params) {
  const context = await requireAliasContext(request);
  if ("error" in context) return context.error;

  const { name } = await params;
  const body = await request.text();
  return proxyToTypesense(context.profile, `/aliases/${encodeURIComponent(name)}`, undefined, {
    method: "PUT",
    body,
  });
}

export async function GET(request: NextRequest, { params }: Params) {
  const context = await requireAliasContext(request);
  if ("error" in context) return context.error;

  const { name } = await params;
  return proxyToTypesense(context.profile, `/aliases/${encodeURIComponent(name)}`);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const context = await requireAliasContext(request);
  if ("error" in context) return context.error;

  const { name } = await params;
  return proxyToTypesense(context.profile, `/aliases/${encodeURIComponent(name)}`, undefined, {
    method: "DELETE",
  });
}
