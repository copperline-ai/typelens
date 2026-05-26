import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, DEMO_TTL_SECONDS, SESSION_COOKIE } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let username: string | undefined;
  let password: string | undefined;
  try {
    const form = await request.formData();
    const u = form.get("username");
    const p = form.get("password");
    username = typeof u === "string" ? u : undefined;
    password = typeof p === "string" ? p : undefined;
  } catch {
    // fall through to invalid-creds branch
  }

  const expectedUsername = process.env.AUTH_USERNAME;
  const expectedPassword = process.env.AUTH_PASSWORD;

  const ok =
    !!expectedUsername &&
    !!expectedPassword &&
    username === expectedUsername &&
    password === expectedPassword;

  if (!ok) {
    return new NextResponse(null, {
      status: 303,
      headers: { Location: "/login?error=demo" },
    });
  }

  const token = await createSessionToken(username!, { isDemo: true });
  const res = new NextResponse(null, {
    status: 303,
    headers: { Location: "/collections" },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEMO_TTL_SECONDS,
  });
  return res;
}
