// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCollectionCounts } from "../use-collection-counts";

vi.mock("@/lib/api/ky-client", () => ({
  useKy: vi.fn(),
}));

import { useKy } from "@/lib/api/ky-client";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useCollectionCounts", () => {
  beforeEach(() => vi.resetAllMocks());

  it("is disabled (fetchStatus idle) when useKy returns null", () => {
    vi.mocked(useKy).mockReturnValue(null);
    const { result } = renderHook(() => useCollectionCounts(["products"]), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("is disabled when there are no collection names", () => {
    const mockKy = { post: vi.fn() };
    vi.mocked(useKy).mockReturnValue(mockKy as any);
    const { result } = renderHook(() => useCollectionCounts([]), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockKy.post).not.toHaveBeenCalled();
  });

  it("maps multi_search results to a count-by-name record", async () => {
    const mockKy = {
      post: vi.fn().mockReturnValue({
        json: vi.fn().mockResolvedValue({ results: [{ found: 12 }, { found: 340 }] }),
      }),
    };
    vi.mocked(useKy).mockReturnValue(mockKy as any);

    const { result } = renderHook(() => useCollectionCounts(["books", "authors"]), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Names are sorted before the request, so results line up alphabetically.
    expect(result.current.data).toEqual({ authors: 12, books: 340 });
    expect(mockKy.post).toHaveBeenCalledWith("multi_search", {
      json: {
        searches: [
          { collection: "authors", q: "*", per_page: 0 },
          { collection: "books", q: "*", per_page: 0 },
        ],
      },
    });
  });

  it("skips results that lack a numeric found value", async () => {
    const mockKy = {
      post: vi.fn().mockReturnValue({
        json: vi.fn().mockResolvedValue({ results: [{ found: 5 }, null] }),
      }),
    };
    vi.mocked(useKy).mockReturnValue(mockKy as any);

    const { result } = renderHook(() => useCollectionCounts(["alpha", "beta"]), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ alpha: 5 });
  });
});
