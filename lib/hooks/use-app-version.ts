"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const POLL_INTERVAL = 60 * 1000;

function normalizeVersion(v: string) {
  return v.replace(/^v/, "");
}

export function useAppVersion() {
  const [version, setVersion] = useState<string | null>(null);
  const baseline = useRef<string | null>(null);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/healthz");
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        const v = data.version;
        if (!v) return;

        const normalized = normalizeVersion(v);

        if (baseline.current === null) {
          baseline.current = normalized;
          setVersion(normalized);
        } else if (normalized !== baseline.current) {
          toast("Update available", {
            id: "app-update",
            description: `v${normalized} is ready. Refresh to load the latest version.`,
            action: { label: "Refresh", onClick: () => window.location.reload() },
            duration: Infinity,
          });
        }
      } catch {
        // network error — ignore silently
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        poll();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return version;
}
