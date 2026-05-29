// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CollectionsPage from "../page";
import { useConnectionStore } from "@/lib/stores/connection";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/hooks/use-collections", () => ({
  useCollections: vi.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

vi.mock("@/lib/hooks/use-collection-counts", () => ({
  useCollectionCounts: vi.fn(() => ({ data: {} })),
}));

vi.mock("@/components/collections/create-collection-dialog", () => ({
  CreateCollectionDialog: () => null,
}));

vi.mock("@/components/connecting-state", () => ({
  ConnectingState: () => <div>Connecting...</div>,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CollectionsPage />
    </QueryClientProvider>,
  );
}

describe("CollectionsPage", () => {
  beforeEach(() => {
    useConnectionStore.setState({
      profiles: [],
      activeProfileId: null,
      status: "idle",
      lastLatencyMs: null,
      lastCollectionCount: null,
      lastTestedAt: null,
      isDemo: false,
    });
  });

  it("hides the create collection action while the connection is still connecting", () => {
    useConnectionStore.setState({
      profiles: [
        {
          id: "profile-1",
          name: "Primary",
          host: "localhost",
          port: 8108,
          protocol: "http",
          apiKey: "xyz",
        },
      ],
      activeProfileId: "profile-1",
      status: "connecting",
    });

    renderPage();

    expect(screen.queryByTitle("New Collection")).toBeNull();
  });

  it("shows the create collection action once the connection is connected", () => {
    useConnectionStore.setState({
      profiles: [
        {
          id: "profile-1",
          name: "Primary",
          host: "localhost",
          port: 8108,
          protocol: "http",
          apiKey: "xyz",
        },
      ],
      activeProfileId: "profile-1",
      status: "connected",
    });

    renderPage();

    expect(screen.getByTitle("New Collection")).not.toBeNull();
  });
});
