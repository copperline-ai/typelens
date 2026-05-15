import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth-session";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { username, password } = (body ?? {}) as { username?: string; password?: string };

  const expectedUsername = process.env.BASIC_AUTH_USERNAME;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

  if (
    !expectedUsername ||
    !expectedPassword ||
    username !== expectedUsername ||
    password !== expectedPassword
  ) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createSessionToken(username);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
