"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cable, Database } from "lucide-react";
import {
  useConnectionStore,
  selectActiveProfile,
  type ConnectionStatus,
} from "@/lib/stores/connection";
import { StatusPopover } from "@/components/status-popover";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/collections", label: "Collections", icon: Database },
  { href: "/settings/connection", label: "Connections", icon: Cable },
];

const statusDot: Record<ConnectionStatus, string> = {
  connected: "bg-green-500",
  connecting: "bg-yellow-500 animate-pulse",
  error: "bg-red-500",
  idle: "bg-muted-foreground/50",
};

export function Header() {
  const pathname = usePathname();
  const activeProfile = useConnectionStore(selectActiveProfile);
  const status = useConnectionStore((s) => s.status);

  return (
    <header className="flex h-14 items-center border-b bg-background px-4 gap-3">
      <div className="flex md:hidden items-center gap-3">
        <Link href="/collections" className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt=""
            width={30}
            height={30}
            className="h-[30px] w-[30px] shrink-0"
            aria-hidden="true"
          />
          <span
            className="text-xl font-semibold leading-none tracking-tight"
            style={{ fontFamily: "'Space Grotesk', Inter, system-ui, sans-serif" }}
          >
            <span style={{ color: "#0067a3" }}>type</span>
            <span style={{ color: "#00d2da" }}>lens</span>
          </span>
        </Link>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-muted text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
      <div className="flex-1" />
      <StatusPopover
        trigger={
          <button
            className="flex items-center gap-2 text-sm rounded px-2 py-1 hover:bg-accent transition-colors"
            aria-label="Connection status — click for details"
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                activeProfile ? statusDot[status] : "bg-muted-foreground",
              )}
            />
            <span className="text-muted-foreground">
              {activeProfile ? activeProfile.name : "No connection"}
            </span>
          </button>
        }
      />
    </header>
  );
}
