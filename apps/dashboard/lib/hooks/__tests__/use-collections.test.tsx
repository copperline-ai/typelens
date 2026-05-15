// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Collection } from "@/lib/typesense-client";
import { useCollections } from "../use-collections";

vi.mock("@/lib/api/ky-client", () => ({
  useKy: vi.fn(),
}));

import { useKy } from "@/lib/api/ky-client";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useCollections", () => {
  beforeEach(() => vi.resetAllMocks());

  it("is disabled (fetchStatus idle) when useKy returns null", () => {
    vi.mocked(useKy).mockReturnValue(null);
    const { result } = renderHook(() => useCollections(), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("returns collections on success", async () => {
    const mockCollections: Collection[] = [{ name: "products", num_documents: 5, fields: [] }];
    const mockKy = {
      get: vi.fn().mockReturnValue({ json: vi.fn().mockResolvedValue(mockCollections) }),
    };
    vi.mocked(useKy).mockReturnValue(mockKy as any);

    const { result } = renderHook(() => useCollections(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCollections);
    expect(mockKy.get).toHaveBeenCalledWith("collections");
  });
});
