const VAULT_KEY = "typesense:vault-key";

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from([...atob(b64)].map((c) => c.charCodeAt(0)));
}

export async function getOrCreateDeviceKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(VAULT_KEY);
  if (stored) {
    return crypto.subtle.importKey(
      "jwk",
      JSON.parse(stored),
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );
  }
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const jwk = await crypto.subtle.exportKey("jwk", key);
  localStorage.setItem(VAULT_KEY, JSON.stringify(jwk));
  return key;
}

export async function encryptField(
  plaintext: string,
  key: CryptoKey,
): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const result = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(result)) };
}

export async function decryptField(
  encrypted: { iv: string; ciphertext: string },
  key: CryptoKey,
): Promise<string> {
  const iv = fromBase64(encrypted.iv);
  const ciphertext = fromBase64(encrypted.ciphertext);
  const result = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(result);
}
