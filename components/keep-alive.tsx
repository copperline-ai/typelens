"use client";

import { useEffect } from "react";
import { useConnectionStore, selectActiveProfile } from "@/lib/stores/connection";

const PING_INTERVAL_MS = 25_000;

export function KeepAlive() {
  const activeProfile = useConnectionStore(selectActiveProfile);

  useEffect(() => {
    if (!activeProfile) return;
    const profile = activeProfile;

    function ping() {
      const url = `${profile.protocol}://${profile.host}:${profile.port}/collections`;
      fetch(url, {
        headers: { "X-TYPESENSE-API-KEY": profile.apiKey },
        signal: AbortSignal.timeout(10_000),
      }).catch(() => {});
    }

    ping();
    const id = setInterval(ping, PING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [activeProfile?.id]);

  return null;
}
