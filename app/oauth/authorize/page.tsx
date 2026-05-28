import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-session";
import { getDb } from "@/lib/db/client";
import { oauthClients } from "@/lib/db/schema";
import AuthorizeConsent from "./authorize-consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const responseType = first(sp.response_type);
  const clientId = first(sp.client_id);
  const redirectUri = first(sp.redirect_uri);
  const codeChallenge = first(sp.code_challenge);
  const codeChallengeMethod = first(sp.code_challenge_method);
  const state = first(sp.state);
  const scope = first(sp.scope) || "mcp";

  // Validate the client + redirect_uri FIRST — never redirect back to an
  // unvalidated URI (open-redirect guard).
  if (!clientId) {
    return <ErrorCard title="Invalid request" message="Missing client_id." />;
  }
  const client = getDb()
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId))
    .get();
  if (!client) {
    return <ErrorCard title="Unknown client" message="This client is not registered." />;
  }
  if (!redirectUri || !client.redirectUris.includes(redirectUri)) {
    return (
      <ErrorCard
        title="Invalid redirect URI"
        message="The redirect_uri does not match this client's registration."
      />
    );
  }
  if (responseType !== "code") {
    return <ErrorCard title="Unsupported response_type" message="Only 'code' is supported." />;
  }
  if (codeChallengeMethod !== "S256" || !codeChallenge) {
    return (
      <ErrorCard title="PKCE required" message="A code_challenge with method S256 is required." />
    );
  }

  // Auth gate — preserve the full query string across the login round-trip.
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;
  if (!user) {
    const qs = new URLSearchParams({
      response_type: responseType,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      scope,
    });
    if (state) qs.set("state", state);
    redirect(`/login?redirect=${encodeURIComponent(`/oauth/authorize?${qs.toString()}`)}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <AuthorizeConsent
        clientId={clientId}
        clientName={client.clientName}
        redirectUri={redirectUri}
        codeChallenge={codeChallenge}
        codeChallengeMethod={codeChallengeMethod}
        state={state}
        scope={scope}
      />
    </main>
  );
}
