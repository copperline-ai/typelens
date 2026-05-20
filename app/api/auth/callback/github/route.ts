import { type NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, getGitHubPrimaryEmail, isEmailAllowed } from "@/lib/auth-github";
import { SESSION_COOKIE, createSessionToken } from "@/lib/auth-session";

const STATE_COOKIE = "__gh_oauth_state";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!state || !storedState || state !== storedState) {
    const res = NextResponse.redirect(new URL("/login?error=github_csrf", request.url));
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret || !code) {
    const res = NextResponse.redirect(new URL("/login?error=github_failed", request.url));
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  try {
    const accessToken = await exchangeCodeForToken(clientId, clientSecret, code);
    const email = await getGitHubPrimaryEmail(accessToken);

    if (!isEmailAllowed(email, process.env.AUTH_GITHUB_ALLOWED)) {
      const res = NextResponse.redirect(new URL("/login?error=github_not_allowed", request.url));
      res.cookies.delete(STATE_COOKIE);
      return res;
    }

    const sessionToken = await createSessionToken(email);
    const res = NextResponse.redirect(new URL("/collections", request.url));
    res.cookies.delete(STATE_COOKIE);
    res.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    const res = NextResponse.redirect(new URL("/login?error=github_failed", request.url));
    res.cookies.delete(STATE_COOKIE);
    return res;
  }
}
