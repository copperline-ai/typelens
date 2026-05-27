import { randomUUID } from "crypto";
import type { TypesenseProxyProfile } from "@/lib/api/proxy-typesense";

type Session = {
  profile: TypesenseProxyProfile;
  enqueue: (data: string) => void;
  createdAt: number;
};

const sessions = new Map<string, Session>();

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function createSession(
  profile: TypesenseProxyProfile,
  enqueue: (data: string) => void,
): string {
  const id = randomUUID();
  sessions.set(id, { profile, enqueue, createdAt: Date.now() });
  return id;
}

export function getSession(id: string): Session | undefined {
  const s = sessions.get(id);
  if (!s) return undefined;
  if (Date.now() - s.createdAt > SESSION_TTL_MS) {
    sessions.delete(id);
    return undefined;
  }
  return s;
}

export function deleteSession(id: string): void {
  sessions.delete(id);
}

// Prune expired sessions every 5 minutes in long-running processes
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [id, s] of sessions) {
        if (now - s.createdAt > SESSION_TTL_MS) {
          sessions.delete(id);
        }
      }
    },
    5 * 60 * 1000,
  ).unref?.();
}
