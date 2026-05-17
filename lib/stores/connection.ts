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

type State = {
  profiles: Profile[];
  activeProfileId: string | null;
  status: ConnectionStatus;
};

type Actions = {
  addProfile: (profile: Omit<Profile, "id">) => void;
  updateProfile: (id: string, updates: Partial<Omit<Profile, "id">>) => void;
  removeProfile: (id: string) => void;
  setActiveProfile: (id: string | null) => void;
  testConnection: (profile: Profile) => Promise<TestConnectionResult>;
  /** Call inside a useEffect on mount to hydrate from localStorage (avoids SSR mismatch). */
  hydrateFromStorage: () => Promise<void>;
};

export const useConnectionStore = create<State & { actions: Actions }>((set) => ({
  profiles: [],
  activeProfileId: null,
  status: "idle",

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
              | { host: string; port: number; protocol: "http" | "https"; apiKey: string };
            if ("host" in data) {
              const envProfile: Profile = {
                id: "env-config",
                name: data.host,
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
      set((prev) => {
        const next = {
          profiles: prev.profiles.filter((p) => p.id !== id),
          activeProfileId: prev.activeProfileId === id ? null : prev.activeProfileId,
        };
        writeProfiles(next);
        return next;
      });
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
      const retryDelays = [3_000, 5_000, 8_000, 12_000];

      for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
        if (attempt > 0) {
          await new Promise<void>((r) => setTimeout(r, retryDelays[attempt - 1]!));
        }

        try {
          const url = `${profile.protocol}://${profile.host}:${profile.port}/health`;
          const res = await fetch(url, {
            headers: { "X-TYPESENSE-API-KEY": profile.apiKey },
            signal: AbortSignal.timeout(10_000),
          });

          if (res.status === 503 && attempt < retryDelays.length) continue;

          const latencyMs = Math.round(performance.now() - start);
          if (!res.ok) {
            const text = await res.text().catch(() => `HTTP ${res.status}`);
            set({ status: "error" });
            return { ok: false, error: text || `HTTP ${res.status}` };
          }
          set({ status: "connected" });
          return { ok: true, latencyMs };
        } catch (err) {
          set({ status: "error" });
          if (err instanceof TypeError) {
            return {
              ok: false,
              error: "Enable CORS on your Typesense instance with --enable-cors",
            };
          }
          const error = err instanceof Error ? err.message : String(err);
          return { ok: false, error };
        }
      }

      set({ status: "error" });
      return { ok: false, error: "Typesense server unavailable after retries" };
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
