import { beforeEach, describe, expect, it } from "vitest";
import {
  ONBOARDING_STORAGE_KEY,
  completeOnboarding,
  getOnboardingState,
  markOnboardingStep,
  resetOnboarding,
} from "./onboarding";

function mockStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
}

describe("onboarding persistence", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage() as never;
  });

  it("starts incomplete and persists individual step progress", () => {
    const initial = getOnboardingState();
    expect(initial.completed).toBe(false);
    expect(initial.steps.connectTypesense).toBe(false);

    const updated = markOnboardingStep("connectTypesense", true);
    expect(updated.steps.connectTypesense).toBe(true);

    const reloaded = getOnboardingState();
    expect(reloaded.steps.connectTypesense).toBe(true);
    expect(reloaded.completed).toBe(false);
  });

  it("persists completion checkpoint and can reset", () => {
    const completed = completeOnboarding();
    expect(completed.completed).toBe(true);

    const stored = JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEY) ?? "{}");
    expect(stored.completed).toBe(true);

    const reset = resetOnboarding();
    expect(reset.completed).toBe(false);
    expect(reset.steps.connectTypesense).toBe(false);
  });
});
