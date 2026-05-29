"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Database, ListChecks, LogOut, Search, Server, Settings } from "lucide-react";
import {
  useConnectionStore,
  selectActiveProfile,
  type ConnectionStatus,
} from "@/lib/stores/connection";
import {
  getOnboardingState,
  useOnboardingChecklistStore,
} from "@/lib/stores/onboarding";
import { StatusPopover } from "@/components/status-popover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAppVersion } from "@/lib/hooks/use-app-version";
import { ReleaseNotesModal } from "@/components/release-notes-modal";

const navItems = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/collections", label: "Collections", icon: Database },
  { href: "/settings/connection", label: "Connections", icon: Server },
];

const statusDot: Record<ConnectionStatus, string> = {
  connected: "bg-green-500",
  connecting: "bg-yellow-500 animate-pulse",
  error: "bg-red-500",
  idle: "bg-muted-foreground/50",
};

export function Header({ authEnabled = false }: { authEnabled?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeProfile = useConnectionStore(selectActiveProfile);
  const status = useConnectionStore((s) => s.status);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const appVersion = useAppVersion();
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="flex h-14 items-center border-b bg-background px-4 gap-3">
      <div className="flex md:hidden items-center gap-3">
        <Link href="/search" className="flex items-center gap-2">
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
              title={label}
              className={cn(
                "flex items-center justify-center rounded-md p-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-muted text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
            </Link>
          );
        })}
      </div>
      <div className="flex-1" />
      <StatusPopover
        trigger={
          <button
            className="flex items-center justify-center h-8 w-8 rounded-md md:h-auto md:w-auto md:justify-start md:gap-2 md:text-sm md:px-2 md:py-1 hover:bg-accent transition-colors"
            aria-label="Connection status — click for details"
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                activeProfile ? statusDot[status] : "bg-muted-foreground",
              )}
            />
            <span className="hidden md:inline text-muted-foreground">
              {activeProfile ? activeProfile.name : "No connection"}
            </span>
          </button>
        }
      />
      <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
        <PopoverTrigger asChild>
          <button
            className="md:hidden flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="end"
            className="w-44 p-1"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {(() => {
              const onboardingState = getOnboardingState();
              const completedCount = Object.values(onboardingState.steps).filter(Boolean).length;
              return (
                <button
                  onClick={() => {
                    useOnboardingChecklistStore.getState().setForceOpen(true);
                    setSettingsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ListChecks className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">Getting started</span>
                  <span className="text-xs tabular-nums">{completedCount}/3</span>
                </button>
              );
            })()}
            <Link
              href="/settings"
              onClick={() => setSettingsOpen(false)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span>Settings</span>
            </Link>
            {authEnabled && (
              <button
                onClick={() => {
                  handleLogout();
                  setSettingsOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Log out</span>
              </button>
            )}
            <div className="border-t mt-1 pt-1 px-2 pb-0.5">
              <button
                onClick={() => {
                  setReleaseNotesOpen(true);
                  setSettingsOpen(false);
                }}
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                title="View release notes"
              >
                {appVersion ? `v${appVersion}` : ""}
              </button>
            </div>
          </PopoverContent>
      </Popover>
      <ReleaseNotesModal open={releaseNotesOpen} onOpenChange={setReleaseNotesOpen} />
    </header>
  );
}
