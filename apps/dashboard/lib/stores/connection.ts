import { create } from "zustand";

export type Profile = {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: "http" | "https";
  apiKey: string;
};

export type TestConnectionResult =
  | { ok: true; latencyMs: number }
  | { ok: false; error: string };

type State = {
  profiles: Profile[];
  activeProfileId: string | null;
};

type Actions = {
  addProfile: (profile: Omit<Profile, "id">) => void;
  updateProfile: (id: string, updates: Partial<Omit<Profile, "id">>) => void;
  removeProfile: (id: string) => void;
  setActiveProfile: (id: string | null) => void;
  testConnection: (profile: Profile) => Promise<TestConnectionResult>;
  /** Call inside a useEffect on mount to hydrate from localStorage (avoids SSR mismatch). */
  hydrateFromStorage: () => void;
};

const STORAGE_KEY = "typesense:connection-profiles";

function readStorage(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { profiles: [], activeProfileId: null };
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      activeProfileId: parsed.activeProfileId ?? null,
    };
  } catch {
    return { profiles: [], activeProfileId: null };
  }
}

function writeStorage(state: State) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
      })
    );
  } catch {
    // Silently ignore (private browsing quota exceeded, etc.)
  }
}

export const useConnectionStore = create<State & { actions: Actions }>(
  (set, get) => ({
    profiles: [],
    activeProfileId: null,

    actions: {
      hydrateFromStorage() {
        set(readStorage());
      },

      addProfile(data) {
        const profile: Profile = { ...data, id: crypto.randomUUID() };
        set((prev) => {
          const next: State = {
            profiles: [...prev.profiles, profile],
            activeProfileId: prev.activeProfileId,
          };
          writeStorage(next);
          return next;
        });
      },

      updateProfile(id, updates) {
        set((prev) => {
          const next: State = {
            ...prev,
            profiles: prev.profiles.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            ),
          };
          writeStorage(next);
          return next;
        });
      },

      removeProfile(id) {
        set((prev) => {
          const next: State = {
            profiles: prev.profiles.filter((p) => p.id !== id),
            activeProfileId:
              prev.activeProfileId === id ? null : prev.activeProfileId,
          };
          writeStorage(next);
          return next;
        });
      },

      setActiveProfile(id) {
        set((prev) => {
          const next: State = { ...prev, activeProfileId: id };
          writeStorage(next);
          return next;
        });
      },

      async testConnection(profile) {
        const start = performance.now();
        try {
          const url = `${profile.protocol}://${profile.host}:${profile.port}/health`;
          const res = await fetch(url, {
            headers: { "X-TYPESENSE-API-KEY": profile.apiKey },
            signal: AbortSignal.timeout(5_000),
          });
          const latencyMs = Math.round(performance.now() - start);
          if (!res.ok) {
            const text = await res.text().catch(() => `HTTP ${res.status}`);
            return { ok: false, error: text || `HTTP ${res.status}` };
          }
          return { ok: true, latencyMs };
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          return { ok: false, error };
        }
      },
    },
  })
);

/** Selector helpers — prefer these over destructuring the whole store. */
export const selectProfiles = (s: ReturnType<typeof useConnectionStore.getState>) =>
  s.profiles;
export const selectActiveProfileId = (s: ReturnType<typeof useConnectionStore.getState>) =>
  s.activeProfileId;
export const selectActiveProfile = (s: ReturnType<typeof useConnectionStore.getState>) =>
  s.profiles.find((p) => p.id === s.activeProfileId) ?? null;
export const selectActions = (s: ReturnType<typeof useConnectionStore.getState>) =>
  s.actions;
