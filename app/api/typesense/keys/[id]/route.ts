import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/require-auth";
import { extractProfile, proxyToTypesense } from "@/lib/api/proxy-typesense";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const profile = extractProfile(request);
  if (!profile) return NextResponse.json({ error: "Missing connection headers" }, { status: 400 });

  const { id } = await params;
  return proxyToTypesense(profile, `/keys/${encodeURIComponent(id)}`, undefined, {
    method: "DELETE",
  });
}
