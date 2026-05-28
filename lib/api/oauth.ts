import { NextResponse } from "next/server";

export const OAUTH_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

export const AUTH_CODE_TTL = 60 * 10; // 10 minutes
export const ACCESS_TOKEN_TTL = 60 * 60; // 1 hour
export const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 90; // 90 days

function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base64url(buf);
}

export function generateClientId(): string {
  return `tl_${randomToken(16)}`;
}

export function generateAuthCode(): string {
  return randomToken(32);
}

export function generateRefreshToken(): string {
  return randomToken(32);
}

function base64url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** SHA-256 → base64url. Used for PKCE S256 and hashing refresh tokens at rest. */
export async function sha256Base64url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return base64url(new Uint8Array(digest));
}

export async function verifyPkceS256(verifier: string, challenge: string): Promise<boolean> {
  return (await sha256Base64url(verifier)) === challenge;
}

/** RFC 6749 §5.2 error response. */
export function oauthError(error: string, status: number, description?: string): NextResponse {
  return NextResponse.json(description ? { error, error_description: description } : { error }, {
    status,
    headers: OAUTH_CORS,
  });
}
