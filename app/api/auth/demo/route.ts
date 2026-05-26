import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin;

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
    return NextResponse.redirect(new URL("/login?error=demo", origin), 303);
  }

  const token = await createSessionToken(username!);
  const res = new NextResponse(null, {
    status: 303,
    headers: { Location: new URL("/collections", origin).toString() },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
