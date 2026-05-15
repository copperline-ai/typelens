// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CollectionField, SearchResult } from "@/lib/typesense-client";
import { useDocumentSample } from "../use-document-sample";

vi.mock("@/lib/api/ky-client", () => ({
  useKy: vi.fn(),
}));

import { useKy } from "@/lib/api/ky-client";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const fields: CollectionField[] = [
  { name: "title", type: "string" },
  { name: "price", type: "float" },
];

describe("useDocumentSample", () => {
  beforeEach(() => vi.resetAllMocks());

  it("is disabled when collectionName is undefined", () => {
    vi.mocked(useKy).mockReturnValue({} as any);
    const { result } = renderHook(() => useDocumentSample(undefined, fields), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("returns search results on success", async () => {
    const mockResult: SearchResult = {
      found: 1,
      hits: [{ document: { id: "1", title: "Widget" } }],
    };
    const mockKy = {
      get: vi.fn().mockReturnValue({ json: vi.fn().mockResolvedValue(mockResult) }),
    };
    vi.mocked(useKy).mockReturnValue(mockKy as any);

    const { result } = renderHook(() => useDocumentSample("products", fields), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.found).toBe(1);
    const getCall = mockKy.get.mock.calls[0];
    expect(getCall[1].searchParams.get("query_by")).toBe("title");
    expect(getCall[1].searchParams.get("q")).toBe("*");
    expect(getCall[1].searchParams.get("per_page")).toBe("5");
  });
});
