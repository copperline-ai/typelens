// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingCheckpoint } from "../onboarding-checkpoint";
import { useConnectionStore } from "@/lib/stores/connection";
import {
  ONBOARDING_STORAGE_KEY,
  useOnboardingChecklistStore,
} from "@/lib/stores/onboarding";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

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

describe("OnboardingCheckpoint", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage() as never;
    useConnectionStore.setState({
      profiles: [],
      activeProfileId: null,
      status: "idle",
      lastLatencyMs: null,
      lastCollectionCount: null,
      lastTestedAt: null,
      isDemo: false,
    });
    useOnboardingChecklistStore.setState({ forceOpen: false });
  });

  it("shows skip actions for incomplete steps and persists skipped progress", async () => {
    render(<OnboardingCheckpoint />);

    await screen.findByText("Getting started");

    expect(screen.getAllByRole("button", { name: "Skip" })).toHaveLength(3);

    fireEvent.click(screen.getAllByRole("button", { name: "Skip" })[0]!);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Skip" })).toHaveLength(2);
    });

    const stored = JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEY) ?? "{}");
    expect(stored.steps.connectTypesense).toBe(true);
    expect(stored.completed).toBe(false);
  });

  it("dismisses the checklist by persisting completion and hiding the card", async () => {
    const { container } = render(<OnboardingCheckpoint />);

    await screen.findByText("Getting started");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => {
      expect(screen.queryByText("Getting started")).toBeNull();
    });

    const stored = JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEY) ?? "{}");
    expect(stored.completed).toBe(true);
    expect(container.innerHTML).toBe("");
  });
});
