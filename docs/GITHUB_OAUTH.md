# GitHub OAuth Authentication

TypeLens supports GitHub OAuth as an optional login provider. It can run alongside basic auth (username/password) — if both are configured, users can choose either method.

## Create a GitHub OAuth App

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App** (or visit <https://github.com/settings/developers>).
2. Fill in the form:
   - **Application name**: e.g. `TypeLens`
   - **Homepage URL**: your app URL, e.g. `https://typelens.example.com`
   - **Authorization callback URL**: `https://typelens.example.com/api/auth/callback/github`
     - For local dev: `http://localhost:3000/api/auth/callback/github`
3. Click **Register application**.
4. Copy the **Client ID** and generate a **Client Secret**.

## Environment Variables

Add these to your `.env.local` (or deployment environment):

| Variable | Required | Description |
|---|---|---|
| `GITHUB_CLIENT_ID` | Yes (for GitHub auth) | OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | Yes (for GitHub auth) | OAuth App client secret |
| `AUTH_GITHUB_ALLOWED` | No | Comma-separated allowed emails/domains. Unset = allow all. |
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical URL used to build the callback redirect URI |

## Restricting Access

By default any GitHub user who can authenticate will be granted access. Use `AUTH_GITHUB_ALLOWED` to restrict:

```bash
# Single email
AUTH_GITHUB_ALLOWED=alice@example.com

# Multiple emails
AUTH_GITHUB_ALLOWED=alice@example.com,bob@example.com

# Entire domain
AUTH_GITHUB_ALLOWED=@mycompany.com

# Mix of emails and domains
AUTH_GITHUB_ALLOWED=contractor@freelance.io,@mycompany.com
```

Matching is case-insensitive. Domain entries must start with `@`.

## Using Both Providers

Setting both basic auth vars (`AUTH_USERNAME`, `AUTH_PASSWORD`) and GitHub vars (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) enables both providers simultaneously. The login screen will show a username/password form and a "Sign in with GitHub" button separated by a divider.

## Error Messages

| URL parameter | Meaning |
|---|---|
| `?error=github_csrf` | OAuth state mismatch — likely a stale or replayed request |
| `?error=github_not_allowed` | GitHub email not in the `AUTH_GITHUB_ALLOWED` list |
| `?error=github_failed` | Token exchange or email fetch failed |
