"use client";

import { useEffect } from "react";
import { useConnectionStore, selectActiveProfile, selectActions } from "@/lib/stores/connection";

const PING_INTERVAL_MS = 25_000;

export function KeepAlive() {
  const activeProfile = useConnectionStore(selectActiveProfile);
  const { testConnectionIfNeeded } = useConnectionStore(selectActions);

  useEffect(() => {
    if (!activeProfile) return;
    const profile = activeProfile;

    function ping() {
      fetch("/api/typesense/collections", {
        headers: {
          "X-Ts-Host": profile.host,
          "X-Ts-Port": String(profile.port),
          "X-Ts-Protocol": profile.protocol,
          "X-Ts-Api-Key": profile.apiKey,
        },
        signal: AbortSignal.timeout(10_000),
      }).catch(() => {
        testConnectionIfNeeded();
      });
    }

    ping();
    const id = setInterval(ping, PING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [activeProfile?.id]);

  return null;
}
