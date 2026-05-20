import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-session";

const basicEnabled = () => !!(process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD);
const githubEnabled = () => !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

/** Returns a 401 Response if the request lacks a valid session, or null if auth passes.
 *  Auth is disabled only when neither basic nor GitHub provider is configured. */
export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  if (!basicEnabled() && !githubEnabled()) return null;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await verifySessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
