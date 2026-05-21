import type { NextConfig } from "next";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require("./package.json") as { version: string };

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "./"),
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  experimental: {
    middlewareClientMaxBodySize: "100mb",
  },
};

export default nextConfig;
