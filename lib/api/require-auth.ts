import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-session";

const authEnabled = () => !!(process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD);

export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  if (!authEnabled()) return null;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await verifySessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
