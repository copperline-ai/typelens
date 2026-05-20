import { NextResponse } from "next/server";
import { buildGitHubAuthUrl } from "@/lib/auth-github";

const STATE_COOKIE = "__gh_oauth_state";
const STATE_TTL_SECONDS = 60 * 10; // 10 minutes

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GitHub OAuth not configured" }, { status: 503 });
  }

  const state = crypto.randomUUID();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/callback/github`;

  const url = buildGitHubAuthUrl(clientId, state, redirectUri);

  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: STATE_TTL_SECONDS,
  });
  return response;
}
