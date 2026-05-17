import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/require-auth";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const host = process.env.TYPESENSE_HOST;
  if (!host) {
    return NextResponse.json({ configured: false });
  }

  return NextResponse.json({
    host,
    port: Number(process.env.TYPESENSE_PORT ?? 8108),
    protocol: (process.env.TYPESENSE_PROTOCOL as "http" | "https") ?? "https",
    apiKey: process.env.TYPESENSE_API_KEY ?? "",
  });
}
