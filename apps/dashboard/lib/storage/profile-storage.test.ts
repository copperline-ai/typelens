import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/lib/stores/connection";
import { readProfiles, writeProfiles } from "./profile-storage";

const STORAGE_KEY = "typesense:connection-profiles";

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };
}

function makeProfile(overrides?: Partial<Profile>): Profile {
  return {
    id: "profile-1",
    name: "Test Server",
    host: "localhost",
    port: 8108,
    protocol: "http",
    apiKey: "test-api-key-xyz",
    ...overrides,
  };
}

describe("readProfiles", () => {
  let storage: ReturnType<typeof makeLocalStorageMock>;

  beforeEach(() => {
    storage = makeLocalStorageMock();
    vi.stubGlobal("localStorage", storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty state when localStorage is empty", async () => {
    const result = await readProfiles();
    expect(result).toEqual({ profiles: [], activeProfileId: null });
  });

  it("returns empty state on invalid JSON (no throw)", async () => {
    storage.setItem(STORAGE_KEY, "not-valid-json{{");
    const result = await readProfiles();
    expect(result).toEqual({ profiles: [], activeProfileId: null });
  });

  it("write/read round-trip returns same profiles with same apiKey", async () => {
    const profile = makeProfile();
    await writeProfiles({ profiles: [profile], activeProfileId: "profile-1" });

    const result = await readProfiles();
    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0].apiKey).toBe(profile.apiKey);
    expect(result.profiles[0].id).toBe(profile.id);
    expect(result.activeProfileId).toBe("profile-1");
  });

  it("migrates old plaintext apiKey format to encrypted format and returns correct profiles", async () => {
    const legacyProfile = {
      id: "profile-1",
      name: "Test Server",
      host: "localhost",
      port: 8108,
      protocol: "http",
      apiKey: "plaintext-key-abc",
    };
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ profiles: [legacyProfile], activeProfileId: null }),
    );

    const result = await readProfiles();
    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0].apiKey).toBe("plaintext-key-abc");
    expect(result.activeProfileId).toBeNull();

    // After migration, stored format must use encryptedApiKey, not plaintext apiKey
    const stored = JSON.parse(storage.getItem(STORAGE_KEY)!) as {
      profiles: Record<string, unknown>[];
    };
    expect(stored.profiles[0]).not.toHaveProperty("apiKey");
    expect(stored.profiles[0]).toHaveProperty("encryptedApiKey");
  });
});
