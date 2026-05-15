"use client";

import {
  useConnectionStore,
  selectActiveProfile,
  type ConnectionStatus,
} from "@/lib/stores/connection";
import { cn } from "@/lib/utils";

const statusDot: Record<ConnectionStatus, string> = {
  connected: "bg-green-500",
  connecting: "bg-yellow-500 animate-pulse",
  error: "bg-red-500",
  idle: "bg-muted-foreground/50",
};

export function Header() {
  const activeProfile = useConnectionStore(selectActiveProfile);
  const status = useConnectionStore((s) => s.status);

  return (
    <header className="flex h-14 items-center border-b bg-background px-4 gap-3">
      <div className="flex-1" />
      <div className="flex items-center gap-2 text-sm">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            activeProfile ? statusDot[status] : "bg-muted-foreground",
          )}
          aria-label={`Connection status: ${activeProfile ? status : "no profile"}`}
        />
        <span className="text-muted-foreground">
          {activeProfile ? activeProfile.name : "No connection"}
        </span>
      </div>
    </header>
  );
}
