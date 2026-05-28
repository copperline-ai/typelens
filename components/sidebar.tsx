"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Database, LogOut, PanelLeftClose, Search, Server, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useSidebarStore, selectSidebarCollapsed, selectSidebarActions } from "@/lib/store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppVersion } from "@/lib/hooks/use-app-version";
import { ReleaseNotesModal } from "@/components/release-notes-modal";

const navItems = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/collections", label: "Collections", icon: Database },
  { href: "/settings/connection", label: "Connections", icon: Server },
];

export function Sidebar({ authEnabled = false }: { authEnabled?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useSidebarStore(selectSidebarCollapsed);
  const { toggleCollapsed, hydrateFromStorage } = useSidebarStore(selectSidebarActions);
  const appVersion = useAppVersion();
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "hidden md:flex h-full flex-col overflow-hidden border-r bg-background transition-[width] duration-200",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b",
          collapsed ? "justify-center px-3" : "justify-between px-4",
        )}
      >
        {!collapsed && (
          <span
            className="text-xl font-semibold leading-none tracking-tight"
            style={{ fontFamily: "'Space Grotesk', Inter, system-ui, sans-serif" }}
          >
            <span style={{ color: "#0067a3" }}>type</span>
            <span style={{ color: "#00d2da" }}>lens</span>
          </span>
        )}
        <button
          onClick={toggleCollapsed}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <span
              className="text-xl font-semibold leading-none tracking-tight"
              style={{ fontFamily: "'Space Grotesk', Inter, system-ui, sans-serif" }}
            >
              <span style={{ color: "#0067a3" }}>t</span>
              <span style={{ color: "#00d2da" }}>l</span>
            </span>
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center" : "gap-3",
                isActive
                  ? "bg-muted text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="flex-1">{label}</span>}
            </Link>
          );
        })}
      </nav>
      <div
        className={cn(
          "border-t pt-3",
          collapsed ? "flex justify-center px-2" : "flex items-center justify-between px-4",
        )}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {!collapsed && (
          <button
            onClick={() => setReleaseNotesOpen(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="View release notes"
          >
            {appVersion ? `v${appVersion}` : ""}
          </button>
        )}
        <ReleaseNotesModal open={releaseNotesOpen} onOpenChange={setReleaseNotesOpen} />
        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <button
              title="Settings"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align={collapsed ? "center" : "end"}
            className="w-44 p-1"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
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
      </div>
    </aside>
  );
}
