#!/usr/bin/env node
/**
 * Railway / RAILPACK: find monorepo root (`package.json` with `workspaces`), then
 * `bun install` and **only** `turbo run build --filter=dashboard`.
 * Never use the root `turbo run build` (full monorepo sweep). Does not build
 * `apps/jobs` (Trigger.dev) — that deploys separately. Cwd can be repo root or a
 * subdirectory as long as this file exists in the checkout.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function die(msg) {
  console.error(`[dashboard railway-build] ${msg}`);
  process.exit(1);
}

/** Walk parents from `startDir` until `package.json` contains `"workspaces"`. */
function findMonorepoRoot(startDir) {
  let dir = resolve(startDir);
  for (let depth = 0; depth < 12; depth++) {
    const pkgPath = resolve(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        if (pkg.workspaces) {
          return dir;
        }
      } catch {
        /* ignore */
      }
    }
    const parent = resolve(dir, "..");
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return null;
}

const repoRoot = findMonorepoRoot(__dirname);
if (!repoRoot) {
  die(
    `Could not find monorepo root (no package.json with "workspaces" above ${__dirname}). ` +
      `Railway **Root Directory** must be the repository root (\`/\`), not \`apps/dashboard\`, ` +
      `so \`packages/*\` and workspace deps resolve.`,
  );
}

process.chdir(repoRoot);
console.log(`[dashboard railway-build] repoRoot=${repoRoot} cwd=${process.cwd()}`);

if (process.env.SKIP_ENV_VALIDATION === undefined) {
  process.env.SKIP_ENV_VALIDATION = "1";
}
if (process.env.CI === undefined) {
  process.env.CI = "true";
}
/** Avoid husky/git hook setup in minimal images (prepare script runs `husky`). */
process.env.HUSKY = "0";

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (r.error) {
    throw r.error;
  }
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

/**
 * Skip lifecycle scripts (prepare → husky) — not needed for production build; avoids
 * failures when `.git` is missing in the build container.
 */
run("bun", ["install", "--ignore-scripts"]);
/** Intentionally inline turbo + filter so a mistaken root script (`b` / `build`) is never used. */
run("bun", ["x", "turbo", "run", "build", "--filter=dashboard"]);
