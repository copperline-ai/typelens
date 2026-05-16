import { Profile } from "@/lib/stores/connection";
import { decryptField, encryptField, getOrCreateDeviceKey } from "./crypto";

type PersistedProfile = Omit<Profile, "apiKey"> & {
  encryptedApiKey: { iv: string; ciphertext: string };
};

type PersistedState = {
  profiles: PersistedProfile[];
  activeProfileId: string | null;
};

// Pre-encryption format — apiKey stored as plaintext string
type LegacyProfile = Omit<Profile, "apiKey"> & { apiKey: string };

const STORAGE_KEY = "typesense:connection-profiles";

export async function readProfiles(): Promise<{
  profiles: Profile[];
  activeProfileId: string | null;
}> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { profiles: [], activeProfileId: null };

    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as Record<string, unknown>).profiles)
    ) {
      return { profiles: [], activeProfileId: null };
    }

    const data = parsed as { profiles: unknown[]; activeProfileId: string | null };
    const key = await getOrCreateDeviceKey();

    // One-time silent migration: if any profile still has a plaintext apiKey, encrypt and rewrite
    const hasLegacy = data.profiles.some(
      (p) => typeof (p as Record<string, unknown>).apiKey === "string",
    );

    if (hasLegacy) {
      const legacy = data.profiles as LegacyProfile[];
      const migrated: PersistedProfile[] = await Promise.all(
        legacy.map(async ({ apiKey, ...rest }) => ({
          ...rest,
          encryptedApiKey: await encryptField(apiKey, key),
        })),
      );
      const migratedState: PersistedState = {
        profiles: migrated,
        activeProfileId: data.activeProfileId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedState));

      // Return plaintext values — no need to decrypt what we just encrypted
      return {
        profiles: legacy,
        activeProfileId: data.activeProfileId,
      };
    }

    // Normal path: decrypt each profile's apiKey
    const persisted = data.profiles as PersistedProfile[];
    const profiles: Profile[] = await Promise.all(
      persisted.map(async ({ encryptedApiKey, ...rest }) => ({
        ...rest,
        apiKey: await decryptField(encryptedApiKey, key),
      })),
    );

    return { profiles, activeProfileId: data.activeProfileId };
  } catch {
    return { profiles: [], activeProfileId: null };
  }
}

export async function writeProfiles(state: {
  profiles: Profile[];
  activeProfileId: string | null;
}): Promise<void> {
  const key = await getOrCreateDeviceKey();
  const profiles: PersistedProfile[] = await Promise.all(
    state.profiles.map(async ({ apiKey, ...rest }) => ({
      ...rest,
      encryptedApiKey: await encryptField(apiKey, key),
    })),
  );
  const persisted: PersistedState = {
    profiles,
    activeProfileId: state.activeProfileId,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}
