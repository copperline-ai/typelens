import { randomUUID } from "crypto";
import type { TypesenseProxyProfile } from "@/lib/api/proxy-typesense";

type Session = {
  profile: TypesenseProxyProfile;
  enqueue: (data: string) => void;
  createdAt: number;
  lastActivityAt: number;
};

const sessions = new Map<string, Session>();

export const SESSION_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function createSession(
  profile: TypesenseProxyProfile,
  enqueue: (data: string) => void,
): string {
  const id = randomUUID();
  const now = Date.now();
  sessions.set(id, { profile, enqueue, createdAt: now, lastActivityAt: now });
  return id;
}

export function getSession(id: string): Session | undefined {
  const s = sessions.get(id);
  if (!s) return undefined;
  if (Date.now() - s.lastActivityAt > SESSION_IDLE_TIMEOUT_MS) {
    sessions.delete(id);
    return undefined;
  }
  return s;
}

export function touchSession(id: string): void {
  const s = sessions.get(id);
  if (!s) return;
  s.lastActivityAt = Date.now();
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
        if (now - s.lastActivityAt > SESSION_IDLE_TIMEOUT_MS) {
          sessions.delete(id);
        }
      }
    },
    5 * 60 * 1000,
  ).unref?.();
}
