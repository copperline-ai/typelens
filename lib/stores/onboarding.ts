export const ONBOARDING_STORAGE_KEY = "typelens:onboarding:v1";

export type OnboardingStep = "connectTypesense" | "openSearch";

export type OnboardingState = {
  completed: boolean;
  completedAt: string | null;
  steps: Record<OnboardingStep, boolean>;
};

const DEFAULT_STATE: OnboardingState = {
  completed: false,
  completedAt: null,
  steps: {
    connectTypesense: false,
    openSearch: false,
  },
};

function readState(): OnboardingState {
  const storage = (globalThis as { localStorage?: Storage }).localStorage;
  if (!storage) return DEFAULT_STATE;
  const raw = storage.getItem(ONBOARDING_STORAGE_KEY);
  if (!raw) return DEFAULT_STATE;
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return {
      completed: !!parsed.completed,
      completedAt: parsed.completedAt ?? null,
      steps: {
        connectTypesense: !!parsed.steps?.connectTypesense,
        openSearch: !!parsed.steps?.openSearch,
      },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeState(state: OnboardingState): OnboardingState {
  const storage = (globalThis as { localStorage?: Storage }).localStorage;
  if (storage) {
    storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  }
  return state;
}

export function getOnboardingState(): OnboardingState {
  return readState();
}

export function markOnboardingStep(step: OnboardingStep, done: boolean): OnboardingState {
  const state = readState();
  const next: OnboardingState = {
    ...state,
    steps: {
      ...state.steps,
      [step]: done,
    },
  };
  return writeState(next);
}

export function completeOnboarding(): OnboardingState {
  const state = readState();
  const next: OnboardingState = {
    ...state,
    completed: true,
    completedAt: new Date().toISOString(),
  };
  return writeState(next);
}

export function resetOnboarding(): OnboardingState {
  return writeState(DEFAULT_STATE);
}
