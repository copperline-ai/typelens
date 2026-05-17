/// <reference types="next" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: "development" | "test" | "production";

    // ── Authentication ───────────────────────────────────────────────────────
    /** Dashboard login username (required). */
    readonly BASIC_AUTH_USERNAME: string;

    /** Dashboard login password — also used as the session-signing secret (required). */
    readonly BASIC_AUTH_PASSWORD: string;

    // ── Server-side (never exposed to the browser) ──────────────────────────
    /**
     * Typesense admin key used by Next.js API routes (e.g. JSONL export).
     * Required only in team/server-proxy deployment mode.
     * In localStorage mode this is never set — users configure keys per-browser.
     */
    readonly TYPESENSE_ADMIN_KEY?: string;

    /**
     * Pre-configure the Typesense host for team deployments.
     * Exposed to the browser only via /api/typesense/config — never bundled.
     */
    readonly TYPESENSE_HOST?: string;

    /** Typesense HTTP/HTTPS port (default: 8108). */
    readonly TYPESENSE_PORT?: string;

    /** Transport protocol for the Typesense connection. */
    readonly TYPESENSE_PROTOCOL?: "http" | "https";

    /**
     * Typesense API key.
     * Exposed to the browser only via /api/typesense/config — never bundled.
     */
    readonly TYPESENSE_API_KEY?: string;

    /** Canonical URL of this app (used in server-to-browser CORS headers). */
    readonly NEXT_PUBLIC_APP_URL?: string;
  }
}
