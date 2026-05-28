import type { NextConfig } from "next";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require("./package.json") as { version: string };

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "./"),
  serverExternalPackages: ["better-sqlite3"],
  // The standalone bundle only ships traced JS — the Drizzle SQL migrations
  // (read at runtime by lib/db/client.ts) aren't picked up automatically, so
  // force them into every route that touches the DB. Without this the bundle
  // has no migrations folder, tables are never created, and DB writes 500.
  outputFileTracingIncludes: {
    "/api/oauth/register": ["./drizzle/**/*"],
    "/api/oauth/token": ["./drizzle/**/*"],
    "/api/oauth/revoke": ["./drizzle/**/*"],
    "/api/oauth/authorize/complete": ["./drizzle/**/*"],
    "/oauth/authorize": ["./drizzle/**/*"],
    "/api/mcp": ["./drizzle/**/*"],
    "/api/mcp/sse": ["./drizzle/**/*"],
    "/api/mcp/messages": ["./drizzle/**/*"],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  experimental: {
    proxyClientMaxBodySize: "100mb",
  },
};

export default nextConfig;
