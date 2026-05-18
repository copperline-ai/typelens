import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-session";

/** Returns a 401 Response if the request lacks a valid session, or null if auth passes.
 *  When AUTH_USERNAME / AUTH_PASSWORD are not configured, auth is disabled and always passes. */
export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  if (!(process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD)) return null;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await verifySessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
