import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/require-auth";
import { extractProfile, proxyToTypesense } from "@/lib/api/proxy-typesense";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const profile = extractProfile(request);
  if (!profile) return NextResponse.json({ error: "Missing connection headers" }, { status: 400 });

  return proxyToTypesense(profile, "/collections");
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const profile = extractProfile(request);
  if (!profile) return NextResponse.json({ error: "Missing connection headers" }, { status: 400 });

  const body = await request.text();
  const srcName = request.nextUrl.searchParams.get("src_name");
  const searchParams = srcName ? new URLSearchParams({ src_name: srcName }) : undefined;
  return proxyToTypesense(profile, "/collections", searchParams, { method: "POST", body });
}
