export function buildGitHubAuthUrl(clientId: string, state: string, redirectUri: string): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "user:email");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForToken(
  clientId: string,
  clientSecret: string,
  code: string,
): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  if (!res.ok) throw new Error("Failed to exchange code for token");
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(data.error ?? "No access token returned");
  return data.access_token;
}

export async function getGitHubPrimaryEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://api.github.com/user/emails", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error("Failed to fetch GitHub emails");
  const emails = (await res.json()) as Array<{
    email: string;
    primary: boolean;
    verified: boolean;
  }>;
  const primary = emails.find((e) => e.primary && e.verified);
  if (!primary) throw new Error("No verified primary email found");
  return primary.email;
}

/** Returns true if email is allowed by the given allowList config.
 *  Empty/unset allowList = allow all. Entries are comma-separated emails or @domain.com wildcards. */
export function isEmailAllowed(email: string, allowList: string | undefined): boolean {
  if (!allowList?.trim()) return true;
  const normalEmail = email.toLowerCase();
  return allowList
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .some((entry) => {
      if (entry.startsWith("@")) return normalEmail.endsWith(entry);
      return normalEmail === entry;
    });
}
