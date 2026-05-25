import { create } from "zustand";

const STORAGE_KEY = "typelens:sidebar-collapsed";

type State = { collapsed: boolean };

type Actions = {
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  hydrateFromStorage: () => void;
};

export const useSidebarStore = create<State & { actions: Actions }>((set, get) => ({
  collapsed: false,

  actions: {
    setCollapsed(collapsed) {
      try {
        localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
      } catch {
        // localStorage unavailable (SSR or private browsing)
      }
      set({ collapsed });
    },

    toggleCollapsed() {
      get().actions.setCollapsed(!get().collapsed);
    },

    hydrateFromStorage() {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(STORAGE_KEY);
      } catch {
        // localStorage unavailable (SSR or private browsing)
      }

      if (stored === "1" || stored === "0") {
        set({ collapsed: stored === "1" });
      } else if (typeof window !== "undefined" && window.innerWidth < 768) {
        // No saved preference: collapse by default on small screens.
        set({ collapsed: true });
      }
    },
  },
}));

export const selectSidebarCollapsed = (s: ReturnType<typeof useSidebarStore.getState>) =>
  s.collapsed;
export const selectSidebarActions = (s: ReturnType<typeof useSidebarStore.getState>) => s.actions;
