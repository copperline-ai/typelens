// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useConnectionStore } from "@/lib/stores/connection";
import { useKy } from "../ky-client";

describe("useKy", () => {
  it("returns null when no active profile", () => {
    useConnectionStore.setState({ profiles: [], activeProfileId: null });
    const { result } = renderHook(() => useKy());
    expect(result.current).toBeNull();
  });

  it("returns a ky instance when profile is active", () => {
    const profile = {
      id: "test-id",
      name: "Test",
      host: "localhost",
      port: 8108,
      protocol: "http" as const,
      apiKey: "xyz",
    };
    useConnectionStore.setState({ profiles: [profile], activeProfileId: "test-id" });
    const { result } = renderHook(() => useKy());
    expect(result.current).not.toBeNull();
    expect(typeof result.current?.get).toBe("function");
  });
});
