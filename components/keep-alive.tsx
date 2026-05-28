"use client";

import { useEffect } from "react";
import { useConnectionStore, selectActiveProfile } from "@/lib/stores/connection";

const PING_INTERVAL_MS = 25_000;
const FAST_PING_INTERVAL_MS = 3_000;

export function KeepAlive() {
  const activeProfile = useConnectionStore(selectActiveProfile);
  const status = useConnectionStore((s) => s.status);
  const actions = useConnectionStore((s) => s.actions);

  useEffect(() => {
    if (!activeProfile) return;
    const profile = activeProfile;
    const interval = status === "error" ? FAST_PING_INTERVAL_MS : PING_INTERVAL_MS;

    function ping() {
      fetch("/api/typesense/collections", {
        headers: {
          "X-Ts-Host": profile.host,
          "X-Ts-Port": String(profile.port),
          "X-Ts-Protocol": profile.protocol,
          "X-Ts-Api-Key": profile.apiKey,
        },
        signal: AbortSignal.timeout(10_000),
      })
        .then((res) => {
          if (!res.ok && status === "error") {
            actions.refreshHealth();
          }
        })
        .catch(() => {
          if (status === "error") {
            actions.testConnectionIfNeeded();
          }
        });
    }

    ping();
    const id = setInterval(ping, interval);
    return () => clearInterval(id);
  }, [activeProfile?.id, status]);

  return null;
}
