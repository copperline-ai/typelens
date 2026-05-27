"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  expiresAt: number;
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function DemoSessionBanner({ expiresAt }: Props) {
  const router = useRouter();
  const [now, setNow] = useState<number>(() => Date.now());
  const redirected = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = expiresAt - now;

  useEffect(() => {
    if (remainingMs > 0 || redirected.current) return;
    redirected.current = true;
    void fetch("/api/auth/logout", { method: "POST" }).finally(() => {
      router.replace("/login?expired=demo");
      router.refresh();
    });
  }, [remainingMs, router]);

  const warning = remainingMs <= 60_000;
  const label = formatRemaining(remainingMs);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex h-9 w-full shrink-0 items-center justify-between gap-3 border-b px-4 text-sm",
        warning
          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
          : "bg-muted/60 text-muted-foreground",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Clock className="h-4 w-4 shrink-0" />
        <span className="truncate">
          Demo session — expires in <span className="font-mono tabular-nums">{label}</span>
          <span className="hidden sm:inline">{" · "}Connections are read-only</span>
        </span>
      </div>
      <Link href="/login" className="shrink-0 font-medium text-foreground hover:underline">
        Sign in
      </Link>
    </div>
  );
}
