import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const KEY_INFO = "typelens:grant-apikey:v1";

function hkdfExpand(secret: string, info: string): Buffer {
  const salt = Buffer.alloc(32, 0);
  const prk = createHmac("sha256", salt).update(secret).digest();
  return createHmac("sha256", prk)
    .update(Buffer.concat([Buffer.from(info), Buffer.from([0x01])]))
    .digest();
}

let cachedKey: Buffer | null = null;
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.TYPELENS_MCP_SECRET;
  if (!secret) throw new Error("TYPELENS_MCP_SECRET is not set");
  cachedKey = hkdfExpand(secret, KEY_INFO);
  return cachedKey;
}

export function encryptApiKey(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), ct.toString("base64url"), tag.toString("base64url")].join(
    ".",
  );
}

export function decryptApiKey(blob: string): string {
  const parts = blob.split(".");
  if (parts.length !== 4) throw new Error("Malformed cipher blob");
  const [version, ivB64, ctB64, tagB64] = parts as [string, string, string, string];
  if (version !== "v1") throw new Error(`Unknown cipher version: ${version}`);
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** Test-only: drop the derived key cache (e.g. after vi.stubEnv). */
export function _resetEncryptionKeyCache(): void {
  cachedKey = null;
}
