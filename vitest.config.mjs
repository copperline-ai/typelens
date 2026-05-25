import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    environment: "node",
    include: [
      "lib/**/*.test.ts",
      "lib/**/*.test.tsx",
      "app/**/*.test.ts",
      "app/**/*.test.tsx",
      "components/**/*.test.ts",
      "components/**/*.test.tsx",
    ],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
