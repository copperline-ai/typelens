"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const POLL_INTERVAL = 5 * 60 * 1000;

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

        if (baseline.current === null) {
          baseline.current = v;
          setVersion(v);
        } else if (v !== baseline.current) {
          toast("Update available", {
            description: `v${v} is ready. Refresh to load the latest version.`,
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
    return () => clearInterval(id);
  }, []);

  return version;
}
