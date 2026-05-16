import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decryptField, encryptField, getOrCreateDeviceKey } from "./crypto";

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

describe("encryptField / decryptField", () => {
  let key: CryptoKey;

  beforeEach(async () => {
    key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
      "encrypt",
      "decrypt",
    ]);
  });

  it("round-trip: decrypt(encrypt(plaintext)) returns original plaintext", async () => {
    const plaintext = "my-secret-api-key";
    const encrypted = await encryptField(plaintext, key);
    const decrypted = await decryptField(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it("each encryptField call produces a distinct IV", async () => {
    const e1 = await encryptField("same-value", key);
    const e2 = await encryptField("same-value", key);
    expect(e1.iv).not.toBe(e2.iv);
  });

  it("decryptField throws on corrupted ciphertext", async () => {
    const encrypted = await encryptField("hello", key);
    await expect(
      decryptField({ iv: encrypted.iv, ciphertext: "AAAAAAAAAA==" }, key),
    ).rejects.toThrow();
  });
});

describe("getOrCreateDeviceKey", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeLocalStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the same key on repeated calls (localStorage persistence)", async () => {
    const key1 = await getOrCreateDeviceKey();
    const key2 = await getOrCreateDeviceKey();

    // If both calls return the same key, encrypting with key1 must decrypt with key2
    const plaintext = "test-persistence";
    const encrypted = await encryptField(plaintext, key1);
    const decrypted = await decryptField(encrypted, key2);
    expect(decrypted).toBe(plaintext);
  });
});
