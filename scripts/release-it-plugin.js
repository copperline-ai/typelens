import fs from "node:fs";
import path from "node:path";
import { Plugin } from "release-it";
import { Octokit } from "@octokit/rest";
import semver from "semver";

const DEFAULT_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1";
const DEFAULT_MODEL = "openai/gpt-4.1-mini";

/**
 * When set to `patch`, `minor`, or `major`, skip AI bump selection and use this increment
 * (manual / workflow_dispatch releases). Changelog still comes from AI when there are
 * commits since the last tag; with no commits, a short manual note is used.
 */
function readBumpOverride() {
  const raw = process.env.RELEASE_BUMP_OVERRIDE?.trim().toLowerCase();
  if (!raw) return null;
  if (!["patch", "minor", "major"].includes(raw)) {
    throw new Error(
      `release-it-ai-gateway: RELEASE_BUMP_OVERRIDE must be patch, minor, or major; got "${process.env.RELEASE_BUMP_OVERRIDE}"`,
    );
  }
  return raw;
}

/** Optional markdown block prepended to the release changelog (e.g. workflow_dispatch note). */
function readReleaseMessagePrefix() {
  const raw = process.env.RELEASE_MESSAGE_PREFIX;
  if (raw == null || raw === "") return "";
  return String(raw).trim();
}

function prependReleaseMessage(changelogBody) {
  const prefix = readReleaseMessagePrefix();
  const body = changelogBody.trim();
  if (!prefix) return body;
  return `${prefix}\n\n${body}`;
}

/**
 * @param {string} text
 * @returns {Record<string, unknown> | null}
 */
function parseAiJson(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

/**
 * Compare payload includes `files` for the whole diff, not per commit. If any changed file
 * matches the app prefix(es), we pass all commits in the range to the model (monorepo-safe gate).
 *
 * @param {import('@octokit/rest').RestEndpointMethodTypes['repos']['compareCommitsWithBasehead']['response']['data']} comparison
 * @param {string[]} paths
 */
function commitsForApp(comparison, paths) {
  const list = comparison.commits || [];
  const normalized = paths.map((p) => p.replace(/\\/g, "/").replace(/\/$/, ""));
  if (normalized.length === 0 || normalized.includes(".")) return list;

  const changed = comparison.files || [];
  const touchesApp = changed.some((f) => {
    const fp = (f.filename || "").replace(/\\/g, "/");
    return normalized.some((prefix) => fp === prefix || fp.startsWith(`${prefix}/`));
  });

  return touchesApp ? list : [];
}

class AiGatewayRelease extends Plugin {
  static disablePlugin() {
    return ["version", "@release-it/conventional-changelog"];
  }

  getInitialOptions(options, namespace) {
    const raw = options[namespace] || {};
    const envModel = process.env.RELEASE_AI_MODEL?.trim();
    const paths = Array.isArray(raw.paths) ? raw.paths : raw.paths ? [raw.paths] : [];
    return {
      gatewayUrl: DEFAULT_GATEWAY_URL,
      ...raw,
      model: envModel || raw.model || DEFAULT_MODEL,
      paths,
    };
  }

  async init() {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (!token) {
      throw new Error(
        "release-it-ai-gateway: set GITHUB_TOKEN (or GH_TOKEN) to fetch commits from the GitHub API.",
      );
    }
    const apiKey = process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) {
      throw new Error("release-it-ai-gateway: set AI_GATEWAY_API_KEY for Vercel AI Gateway.");
    }
    this.octokit = new Octokit({ auth: token });
  }

  async fetchComparisonCommits() {
    const { owner, project: repo } = this.config.getContext("repo");
    const { latestTag } = this.config.getContext();
    const headSha =
      process.env.GITHUB_SHA ||
      (await this.exec("git rev-parse HEAD", { options: { write: false } }).catch(() => null));
    const head = headSha?.trim() || "HEAD";
    let base = latestTag;
    if (!base) {
      base = (
        await this.exec("git rev-list --max-parents=0 HEAD", { options: { write: false } }).catch(
          () => "",
        )
      ).trim();
    }
    if (!base) {
      return [];
    }
    const { data } = await this.octokit.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${base}...${head}`,
    });
    return commitsForApp(data, this.options.paths);
  }

  formatCommitsForPrompt(commits) {
    return commits
      .map((c) => {
        const msg = (c.commit?.message || "").split("\n")[0];
        const sha = c.sha?.slice(0, 7) || "";
        return `- ${sha} ${msg}`;
      })
      .join("\n");
  }

  async callGateway(systemPrompt, userPrompt) {
    const url = `${this.options.gatewayUrl.replace(/\/$/, "")}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.options.model,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI Gateway HTTP ${res.status}: ${errText.slice(0, 500)}`);
    }
    const body = await res.json();
    const text = body.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("AI Gateway returned no message content.");
    }
    return text;
  }

  async resolveReleaseWithAi(latestVersion) {
    const bumpOverride = readBumpOverride();
    const commits = await this.fetchComparisonCommits();

    if (commits.length === 0) {
      if (!bumpOverride) {
        this.setContext({ aiResolvedVersion: null, aiChangelog: null });
        return null;
      }
      const next = semver.inc(latestVersion, bumpOverride);
      if (!next) {
        throw new Error(
          `release-it-ai-gateway: semver.inc failed for ${latestVersion} + ${bumpOverride}`,
        );
      }
      const fallback =
        "### Other\n\n- Manual release (no commits since last tag in this app's path filter).";
      const changelogBody = prependReleaseMessage(fallback);
      this.setContext({
        aiResolvedVersion: next,
        aiChangelog: changelogBody,
        aiCommitsAnalyzed: 0,
      });
      return changelogBody;
    }

    const { name: pkgName } = this.config.getContext("npm") || {};
    const appLabel = pkgName || this.options.paths[0] || "app";
    const commitBlock = this.formatCommitsForPrompt(commits);

    const system = bumpOverride
      ? `You are a release engineer. The semver bump for this release is already fixed at "${bumpOverride}" — do not choose a different bump.
Respond with ONLY a JSON object (no markdown fences) with keys:
- "bump": must be exactly "${bumpOverride}"
- "changelog": markdown body for a GitHub release (no title line with version); use ### Features, ### Bug Fixes, ### Other as needed; bullet list; reference commit shas in backticks when useful`
      : `You are a release engineer. Given commits since the last release, respond with ONLY a JSON object (no markdown fences) with keys:
- "bump": one of "patch" | "minor" | "major" (semver)
- "changelog": markdown body for a GitHub release (no title line with version); use ### Features, ### Bug Fixes, ### Other as needed; bullet list; reference commit shas in backticks when useful
Rules: breaking changes or removals → major; new features → minor; fixes/docs/chore → patch. Be conservative: prefer patch when unsure.`;

    const user = `Package/app: ${appLabel}
Current version: ${latestVersion}

Commits since last tag:
${commitBlock}`;

    const raw = await this.callGateway(system, user);
    const parsed = parseAiJson(raw);
    if (!parsed || typeof parsed.bump !== "string") {
      throw new Error(
        `release-it-ai-gateway: could not parse AI response as JSON with "bump". Got: ${raw.slice(0, 400)}`,
      );
    }

    let bump = parsed.bump.toLowerCase();
    if (bumpOverride) {
      bump = bumpOverride;
    } else if (!["patch", "minor", "major"].includes(bump)) {
      throw new Error(`release-it-ai-gateway: invalid bump "${parsed.bump}"`);
    }

    const changelog =
      typeof parsed.changelog === "string" && parsed.changelog.trim()
        ? parsed.changelog.trim()
        : null;
    if (!changelog) {
      throw new Error('release-it-ai-gateway: AI response missing non-empty "changelog" string.');
    }

    const next = semver.inc(latestVersion, bump);
    if (!next) {
      throw new Error(`release-it-ai-gateway: semver.inc failed for ${latestVersion} + ${bump}`);
    }

    const changelogWithPrefix = prependReleaseMessage(changelog);

    this.setContext({
      aiResolvedVersion: next,
      aiChangelog: changelogWithPrefix,
      aiCommitsAnalyzed: commits.length,
    });
    return changelogWithPrefix;
  }

  /**
   * Runs first in release-it: fetch GitHub commits, call AI, cache version + notes.
   * @param {string} latestVersion
   */
  async getChangelog(latestVersion) {
    await this.resolveReleaseWithAi(latestVersion);
    return this.getContext("aiChangelog");
  }

  getIncrementedVersion() {
    return this.getContext("aiResolvedVersion");
  }

  getIncrementedVersionCI() {
    return this.getIncrementedVersion();
  }

  async beforeRelease() {
    const { infile } = this.options;
    if (!infile || this.config.isDryRun) return;

    const changelogBody = this.getContext("aiChangelog");
    if (!changelogBody) return;

    const root = process.cwd();
    const filePath = path.isAbsolute(infile) ? infile : path.join(root, infile);
    const version = this.config.getContext("version");
    const title = `## [${version}] - ${new Date().toISOString().slice(0, 10)}`;
    const block = `${title}\n\n${changelogBody.trim()}\n`;

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let previous = "";
    if (fs.existsSync(filePath)) {
      previous = fs.readFileSync(filePath, "utf8");
    } else {
      previous = "# Changelog\n\n";
    }

    const headerEnd = previous.indexOf("\n## ");
    const insertAt = headerEnd === -1 ? previous.length : headerEnd;
    const next =
      previous.slice(0, insertAt) +
      (insertAt > 0 && !previous.slice(0, insertAt).endsWith("\n\n") ? "\n" : "") +
      block +
      (previous.slice(insertAt).startsWith("\n") ? "" : "\n") +
      previous.slice(insertAt);

    fs.writeFileSync(filePath, next, "utf8");
    const rel = path.relative(root, filePath);
    await this.exec(`git add ${rel || infile}`);
  }
}

export default AiGatewayRelease;
