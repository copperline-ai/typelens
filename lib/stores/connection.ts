import { create } from "zustand";
import { readProfiles, writeProfiles } from "../storage/profile-storage";

export type ConnectionStatus = "connected" | "connecting" | "error" | "idle";

export type Profile = {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: "http" | "https";
  apiKey: string;
};

export type TestConnectionResult = { ok: true; latencyMs: number } | { ok: false; error: string };

export function normalizeConnectionError(error: unknown, status?: number): string {
  if (status === 401) return "Invalid Typesense API key (401)";
  if (status === 403) return "API key lacks required permissions (403)";
  if (status === 502 || status === 503 || status === 504) {
    return "Typesense server unavailable or timed out. Please retry.";
  }

  const text = typeof error === "string" ? error : error instanceof Error ? error.message : "";
  if (/abort|timed out|timeout/i.test(text)) {
    return "Typesense connection timed out. Please retry.";
  }
  return text || (status ? `HTTP ${status}` : "Connection failed");
}

type State = {
  profiles: Profile[];
  activeProfileId: string | null;
  status: ConnectionStatus;
  lastLatencyMs: number | null;
  lastCollectionCount: number | null;
  lastTestedAt: Date | null;
  isDemo: boolean;
};

type Actions = {
  addProfile: (profile: Omit<Profile, "id">) => void;
  updateProfile: (id: string, updates: Partial<Omit<Profile, "id">>) => void;
  removeProfile: (id: string) => void;
  setActiveProfile: (id: string | null) => void;
  setDemo: (isDemo: boolean) => void;
  testConnection: (profile: Profile) => Promise<TestConnectionResult>;
  /** Single-shot connection test for the popover button — no long retry loop. */
  testConnectionOnce: (profile: Profile) => Promise<TestConnectionResult>;
  /** Call inside a useEffect on mount to hydrate from localStorage (avoids SSR mismatch). */
  hydrateFromStorage: () => Promise<void>;
/** Re-run the retry loop only if status is currently "error". */
    testConnectionIfNeeded: () => Promise<void>;
    /** Force an immediate connection check regardless of current status. */
    refreshHealth: () => Promise<void>;
};

export const useConnectionStore = create<State & { actions: Actions }>((set) => ({
  profiles: [],
  activeProfileId: null,
  status: "idle",
  lastLatencyMs: null,
  lastCollectionCount: null,
  lastTestedAt: null,
  isDemo: false,

  actions: {
    async hydrateFromStorage() {
      const saved = await readProfiles();
      let { profiles, activeProfileId } = saved;

      if (!profiles.some((p) => p.id === "env-config")) {
        try {
          const res = await fetch("/api/typesense/config");
          if (res.ok) {
            const data = (await res.json()) as
              | { configured: false }
              | {
                  host: string;
                  port: number;
                  protocol: "http" | "https";
                  apiKey: string;
                  name?: string;
                };
            if ("host" in data) {
              const envProfile: Profile = {
                id: "env-config",
                name: data.name ?? data.host,
                host: data.host,
                port: data.port,
                protocol: data.protocol,
                apiKey: data.apiKey,
              };
              profiles = [envProfile, ...profiles];
              if (activeProfileId === null) {
                activeProfileId = "env-config";
              }
            }
          }
        } catch (err) {
          console.warn("Failed to fetch /api/typesense/config:", err);
        }
      }

      set({ profiles, activeProfileId });

      if (activeProfileId) {
        const profile = profiles.find((p) => p.id === activeProfileId);
        if (profile) useConnectionStore.getState().actions.testConnection(profile);
      }
    },

    addProfile(data) {
      if (useConnectionStore.getState().isDemo) return;
      const profile: Profile = { ...data, id: crypto.randomUUID() };
      set((prev) => {
        const next = {
          profiles: [...prev.profiles, profile],
          activeProfileId: prev.activeProfileId,
        };
        writeProfiles(next);
        return next;
      });
    },

    updateProfile(id, updates) {
      if (useConnectionStore.getState().isDemo) return;
      set((prev) => {
        const next = {
          ...prev,
          profiles: prev.profiles.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        };
        writeProfiles(next);
        return next;
      });
    },

    removeProfile(id) {
      if (useConnectionStore.getState().isDemo) return;
      set((prev) => {
        const next = {
          profiles: prev.profiles.filter((p) => p.id !== id),
          activeProfileId: prev.activeProfileId === id ? null : prev.activeProfileId,
        };
        writeProfiles(next);
        return next;
      });
    },

    setDemo(isDemo) {
      set({ isDemo });
    },

    setActiveProfile(id) {
      set((prev) => {
        const next = { ...prev, activeProfileId: id };
        writeProfiles(next);
        return next;
      });
      if (id) {
        const profile = useConnectionStore.getState().profiles.find((p) => p.id === id);
        if (profile) useConnectionStore.getState().actions.testConnection(profile);
      } else {
        set({ status: "idle" });
      }
    },

    async testConnection(profile) {
      set({ status: "connecting" });
      const start = performance.now();
      const quickRetryDelay = 3000;
      const retryDelays = [5_000, 10_000, 15_000, 20_000, 25_000, 30_000, 35_000];

      for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
        if (attempt > 0) {
          await new Promise<void>((r) => setTimeout(r, attempt === 1 ? quickRetryDelay : retryDelays[attempt - 1]!));
        }

        try {
          const res = await fetch("/api/typesense/collections", {
            headers: {
              "X-Ts-Host": profile.host,
              "X-Ts-Port": String(profile.port),
              "X-Ts-Protocol": profile.protocol,
              "X-Ts-Api-Key": profile.apiKey,
            },
            signal: AbortSignal.timeout(attempt === 1 ? 8000 : 25_000),
          });

          // 503 from Typesense or 502/504 from proxy (server can't reach Typesense) — retry
          if (
            (res.status === 503 || res.status === 502 || res.status === 504) &&
            attempt < retryDelays.length
          )
            continue;

          const latencyMs = Math.round(performance.now() - start);
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            const raw = (data as { error?: string } | null)?.error ?? "";
            const text = normalizeConnectionError(raw, res.status);
            set({ status: "error" });
            return { ok: false, error: text };
          }
          let collectionCount: number | null = null;
          try {
            const data = await res.json();
            if (Array.isArray(data)) collectionCount = data.length;
          } catch {
            // ignore parse errors
          }
          set({
            status: "connected",
            lastLatencyMs: latencyMs,
            lastCollectionCount: collectionCount,
            lastTestedAt: new Date(),
          });
          return { ok: true, latencyMs };
        } catch (err) {
          // fetch() itself threw (timeout, network error to the Next.js server) — retry
          if (attempt < retryDelays.length) continue;
          set({ status: "error" });
          return { ok: false, error: normalizeConnectionError(err) };
        }
      }

      set({ status: "error" });
      return { ok: false, error: "Typesense server unavailable after retries" };
    },

    async testConnectionOnce(profile) {
      set({ status: "connecting" });
      const start = performance.now();
      try {
        const res = await fetch("/api/typesense/collections", {
          headers: {
            "X-Ts-Host": profile.host,
            "X-Ts-Port": String(profile.port),
            "X-Ts-Protocol": profile.protocol,
            "X-Ts-Api-Key": profile.apiKey,
          },
          signal: AbortSignal.timeout(10_000),
        });
        const latencyMs = Math.round(performance.now() - start);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          const raw = (data as { error?: string } | null)?.error ?? "";
          const text = normalizeConnectionError(raw, res.status);
          set({ status: "error", lastTestedAt: new Date() });
          return { ok: false, error: text };
        }
        let collectionCount: number | null = null;
        try {
          const data = await res.json();
          if (Array.isArray(data)) collectionCount = data.length;
        } catch {
          // ignore parse errors
        }
        set({
          status: "connected",
          lastLatencyMs: latencyMs,
          lastCollectionCount: collectionCount,
          lastTestedAt: new Date(),
        });
        return { ok: true, latencyMs };
      } catch (err) {
        set({ status: "error", lastTestedAt: new Date() });
        return { ok: false, error: normalizeConnectionError(err) };
      }
    },

    async testConnectionIfNeeded() {
      const { status, activeProfileId, profiles } = useConnectionStore.getState();
      if (status !== "error") return;
      if (!activeProfileId) return;
      const profile = profiles.find((p) => p.id === activeProfileId);
      if (!profile) return;
      await useConnectionStore.getState().actions.testConnection(profile);
    },

    async refreshHealth() {
      const { activeProfileId, profiles } = useConnectionStore.getState();
      if (!activeProfileId) return;
      const profile = profiles.find((p) => p.id === activeProfileId);
      if (!profile) return;
      await useConnectionStore.getState().actions.testConnection(profile);
    },
  },
}));

/** Selector helpers — prefer these over destructuring the whole store. */
export const selectProfiles = (s: ReturnType<typeof useConnectionStore.getState>) => s.profiles;
export const selectActiveProfileId = (s: ReturnType<typeof useConnectionStore.getState>) =>
  s.activeProfileId;
export const selectActiveProfile = (s: ReturnType<typeof useConnectionStore.getState>) =>
  s.profiles.find((p) => p.id === s.activeProfileId) ?? null;
export const selectActions = (s: ReturnType<typeof useConnectionStore.getState>) => s.actions;
export const selectLastLatencyMs = (s: ReturnType<typeof useConnectionStore.getState>) =>
  s.lastLatencyMs;
export const selectLastCollectionCount = (s: ReturnType<typeof useConnectionStore.getState>) =>
  s.lastCollectionCount;
export const selectLastTestedAt = (s: ReturnType<typeof useConnectionStore.getState>) =>
  s.lastTestedAt;
export const selectIsDemo = (s: ReturnType<typeof useConnectionStore.getState>) => s.isDemo;
export const selectStatus = (s: ReturnType<typeof useConnectionStore.getState>) => s.status;
