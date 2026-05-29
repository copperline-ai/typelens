import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type OnboardingStep =
  | "welcome"
  | "add-connection"
  | "test-connection"
  | "create-collection"
  | "complete";

export type OnboardingState = {
  currentStep: OnboardingStep;
  hasConnection: boolean;
  connectionVerified: boolean;
  hasCollection: boolean;
  completedAt: Date | null;
  dismissedAt: Date | null;
};

/* ---- Legacy API for onboarding-checkpoint.tsx ---- */

export type LegacyOnboardingSteps = {
  connectTypesense: boolean;
  openSearch: boolean;
  createCollection: boolean;
};

export type LegacyOnboardingData = {
  steps: LegacyOnboardingSteps;
  completed: boolean;
};

export const ONBOARDING_STORAGE_KEY = "typesense:onboarding";
const LEGACY_STORAGE_KEY = ONBOARDING_STORAGE_KEY;

const DEFAULT_STEPS: LegacyOnboardingSteps = {
  connectTypesense: false,
  openSearch: false,
  createCollection: false,
};

function getLegacyState(): LegacyOnboardingData {
  if (typeof localStorage === "undefined") {
    return { steps: { ...DEFAULT_STEPS }, completed: false };
  }

  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return { steps: { ...DEFAULT_STEPS }, completed: false };
    }
    const parsed = JSON.parse(raw) as LegacyOnboardingData;
    // Migrate: fill in any missing step keys (e.g. createCollection added later)
    return {
      ...parsed,
      steps: { ...DEFAULT_STEPS, ...parsed.steps },
    };
  } catch {
    return { steps: { ...DEFAULT_STEPS }, completed: false };
  }
}

function setLegacyState(data: LegacyOnboardingData): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(data));
}

export function getOnboardingState(): LegacyOnboardingData {
  return getLegacyState();
}

export function markOnboardingStep(
  step: keyof LegacyOnboardingSteps,
  value: boolean,
): LegacyOnboardingData {
  const current = getLegacyState();
  const updated: LegacyOnboardingData = {
    ...current,
    steps: { ...current.steps, [step]: value },
  };
  setLegacyState(updated);
  return updated;
}

export function completeOnboarding(): LegacyOnboardingData {
  const updated: LegacyOnboardingData = {
    steps: { connectTypesense: true, openSearch: true, createCollection: true },
    completed: true,
  };
  setLegacyState(updated);
  return updated;
}

export function dismissOnboarding(): LegacyOnboardingData {
  const current = getLegacyState();
  const updated: LegacyOnboardingData = {
    ...current,
    completed: true,
  };
  setLegacyState(updated);
  return updated;
}

export function resetOnboarding(): LegacyOnboardingData {
  const reset: LegacyOnboardingData = {
    steps: { ...DEFAULT_STEPS },
    completed: false,
  };
  setLegacyState(reset);
  return reset;
}

/* ---- New guided onboarding store ---- */

type Actions = {
  setHasConnection: (has: boolean) => void;
  setConnectionVerified: (verified: boolean) => void;
  setHasCollection: (has: boolean) => void;
  advance: () => void;
  dismiss: () => void;
  reset: () => void;
  hydrateFromStorage: () => void;
};

const STORAGE_KEY = "typesense:onboarding";
const ONBOARDING_COMPLETE = "typesense:onboarding-complete";

function loadFromStorage(): OnboardingState {
  if (typeof window === "undefined") {
    return initialState();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();

    const parsed = JSON.parse(raw) as OnboardingState;
    if (!parsed || typeof parsed.currentStep !== "string") return initialState();

    const hasComplete = localStorage.getItem(ONBOARDING_COMPLETE) === "true";
    if (hasComplete && !parsed.completedAt) {
      return { ...initialState(), completedAt: new Date() };
    }

    return parsed;
  } catch {
    return initialState();
  }
}

function initialState(): OnboardingState {
  return {
    currentStep: "welcome",
    hasConnection: false,
    connectionVerified: false,
    hasCollection: false,
    completedAt: null,
    dismissedAt: null,
  };
}

function saveToStorage(state: OnboardingState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function determineStep(state: OnboardingState): OnboardingStep {
  if (state.completedAt) return "complete";
  if (state.dismissedAt) return "complete";
  if (state.hasCollection) return "test-connection";
  if (state.connectionVerified) return "create-collection";
  if (state.hasConnection) return "test-connection";
  return "welcome";
}

export const useOnboardingStore = create<OnboardingState & Actions>((set, get) => {
  const loaded = typeof window !== "undefined" ? loadFromStorage() : initialState();
  const currentStep = determineStep(loaded);

  return {
    ...loaded,
    currentStep,

    setHasConnection(has) {
      set((prev) => {
        const next = { ...prev, hasConnection: has };
        saveToStorage(next);
        return { ...next, currentStep: determineStep(next) };
      });
    },

    setConnectionVerified(verified) {
      set((prev) => {
        const next = { ...prev, connectionVerified: verified };
        saveToStorage(next);
        return { ...next, currentStep: determineStep(next) };
      });
    },

    setHasCollection(has) {
      set((prev) => {
        const next = { ...prev, hasCollection: has };
        saveToStorage(next);
        return { ...next, currentStep: determineStep(next) };
      });
    },

    advance() {
      set((prev) => {
        let nextStep: OnboardingStep;
        switch (prev.currentStep) {
          case "welcome":
            nextStep = "add-connection";
            break;
          case "add-connection":
            nextStep = prev.hasConnection ? "test-connection" : "add-connection";
            break;
          case "test-connection":
            nextStep = prev.connectionVerified ? "create-collection" : "test-connection";
            break;
          case "create-collection":
            nextStep = "complete";
            localStorage.setItem(ONBOARDING_COMPLETE, "true");
            break;
          default:
            nextStep = prev.currentStep;
        }
        const next: OnboardingState = {
          ...prev,
          currentStep: nextStep,
          completedAt: nextStep === "complete" ? new Date() : null,
        };
        saveToStorage(next);
        return next;
      });
    },

    dismiss() {
      set((prev) => {
        const next: OnboardingState = {
          ...prev,
          currentStep: "complete",
          dismissedAt: new Date(),
        };
        localStorage.setItem(ONBOARDING_COMPLETE, "true");
        saveToStorage(next);
        return next;
      });
    },

    reset() {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ONBOARDING_COMPLETE);
      const next = initialState();
      set({ ...next, currentStep: "welcome" });
    },

    hydrateFromStorage() {
      const loaded = loadFromStorage();
      const newStep = determineStep(loaded);
      set({ ...loaded, currentStep: newStep });
    },
  };
});

export const selectOnboardingState = (s: ReturnType<typeof useOnboardingStore.getState>) => s;
export const selectShowOnboarding = (s: ReturnType<typeof useOnboardingStore.getState>) =>
  s.currentStep !== "complete" && !s.dismissedAt;

/* ---- Non-persisted force-open store for programmatic checklist open ---- */

export const useOnboardingChecklistStore = create<{
  forceOpen: boolean;
  setForceOpen: (v: boolean) => void;
}>((set) => ({
  forceOpen: false,
  setForceOpen: (v) => set({ forceOpen: v }),
}));
