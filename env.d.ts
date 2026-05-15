/// <reference types="next" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'test' | 'production';

    // ── Server-side (never exposed to the browser) ──────────────────────────
    /**
     * Typesense admin key used by Next.js API routes (e.g. JSONL export).
     * Required only in team/server-proxy deployment mode.
     * In localStorage mode this is never set — users configure keys per-browser.
     */
    readonly TYPESENSE_ADMIN_KEY?: string;

    /** Trigger.dev project secret key (apps/jobs). */
    readonly TRIGGER_SECRET_KEY?: string;

    /** Override Trigger.dev API URL — only needed when self-hosting Trigger.dev. */
    readonly TRIGGER_API_URL?: string;

    // ── Public (NEXT_PUBLIC_* — safe to expose to the browser) ──────────────
    /**
     * Pre-configure the Typesense host for team deployments.
     * Leave unset to use the in-app Connection Settings (localStorage model).
     */
    readonly NEXT_PUBLIC_TYPESENSE_HOST?: string;

    /** Typesense HTTP/HTTPS port (default: 8108). */
    readonly NEXT_PUBLIC_TYPESENSE_PORT?: string;

    /** Transport protocol for the Typesense connection. */
    readonly NEXT_PUBLIC_TYPESENSE_PROTOCOL?: 'http' | 'https';

    /**
     * Typesense search-only API key for browser use.
     * Never set the admin key here — it would be leaked to every visitor.
     */
    readonly NEXT_PUBLIC_TYPESENSE_SEARCH_KEY?: string;

    /** Canonical URL of this app (used in server-to-browser CORS headers). */
    readonly NEXT_PUBLIC_APP_URL?: string;
  }
}
