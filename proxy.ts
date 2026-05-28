import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth-session";

const AUTH_ENABLED = !!(process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD);

const PUBLIC_PATHS = [
  "/login",
  "/unauthorized",
  "/api/auth/login",
  "/api/auth/demo",
  "/api/healthz",
  "/api/mcp/sse",
  "/api/mcp/messages",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!AUTH_ENABLED) {
    if (pathname === "/login" || pathname === "/unauthorized") {
      return NextResponse.redirect(new URL("/collections", request.url));
    }
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const user = token ? await verifySessionToken(token) : null;
    if (pathname === "/login" && user) {
      return NextResponse.redirect(new URL("/collections", request.url));
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    const redirectTarget = `${pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("redirect", redirectTarget);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest).*)"],
};
