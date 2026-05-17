import { create } from "zustand";

export type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "typelens:theme";

function applyTheme(theme: Theme): void {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldBeDark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", shouldBeDark);
}

type State = { theme: Theme };

type Actions = {
  setTheme: (t: Theme) => void;
  hydrateFromStorage: () => void;
};

export const useThemeStore = create<State & { actions: Actions }>((set) => ({
  theme: "system",

  actions: {
    setTheme(t) {
      try {
        localStorage.setItem(STORAGE_KEY, t);
      } catch {
        // localStorage unavailable (SSR or private browsing)
      }
      applyTheme(t);
      set({ theme: t });
    },

    hydrateFromStorage() {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(STORAGE_KEY);
      } catch {
        // localStorage unavailable (SSR or private browsing)
      }

      const theme: Theme =
        stored === "light" || stored === "dark" || stored === "system" ? stored : "system";

      applyTheme(theme);
      set({ theme });

      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        if (useThemeStore.getState().theme === "system") {
          applyTheme("system");
        }
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    },
  },
}));

export const selectTheme = (s: ReturnType<typeof useThemeStore.getState>) => s.theme;
export const selectThemeActions = (s: ReturnType<typeof useThemeStore.getState>) => s.actions;
