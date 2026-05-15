// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Collection } from "@/lib/typesense-client";
import { useCollection } from "../use-collection";

vi.mock("@/lib/api/ky-client", () => ({
  useKy: vi.fn(),
}));

import { useKy } from "@/lib/api/ky-client";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useCollection", () => {
  beforeEach(() => vi.resetAllMocks());

  it("is disabled when name is undefined", () => {
    vi.mocked(useKy).mockReturnValue({} as any);
    const { result } = renderHook(() => useCollection(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("returns collection detail on success", async () => {
    const mockCollection: Collection = { name: "products", num_documents: 42, fields: [] };
    const mockKy = {
      get: vi.fn().mockReturnValue({ json: vi.fn().mockResolvedValue(mockCollection) }),
    };
    vi.mocked(useKy).mockReturnValue(mockKy as any);

    const { result } = renderHook(() => useCollection("products"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe("products");
    expect(mockKy.get).toHaveBeenCalledWith("collections/products");
  });

  it("URL-encodes collection names with spaces", async () => {
    const mockCollection: Collection = { name: "my collection", num_documents: 1, fields: [] };
    const mockKy = {
      get: vi.fn().mockReturnValue({ json: vi.fn().mockResolvedValue(mockCollection) }),
    };
    vi.mocked(useKy).mockReturnValue(mockKy as any);

    const { result } = renderHook(() => useCollection("my collection"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockKy.get).toHaveBeenCalledWith("collections/my%20collection");
  });
});
