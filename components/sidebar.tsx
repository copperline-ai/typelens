"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Cable,
  Database,
  Key,
  LogOut,
  Moon,
  Monitor,
  PanelLeftClose,
  Settings,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useThemeStore, selectTheme, selectThemeActions } from "@/lib/store";
import type { Theme } from "@/lib/store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppVersion } from "@/lib/hooks/use-app-version";

const navItems = [
  { href: "/collections", label: "Collections", icon: Database },
  { href: "/api-keys", label: "API Keys", icon: Key },
  { href: "/settings/connection", label: "Connections", icon: Cable },
];

const themeIcons: Record<Theme, React.ElementType> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const themeOrder: Theme[] = ["system", "light", "dark"];

export function Sidebar({ authEnabled = false }: { authEnabled?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const theme = useThemeStore(selectTheme);
  const { setTheme } = useThemeStore(selectThemeActions);
  const appVersion = useAppVersion();

  useEffect(() => {
    const check = () => {
      if (window.innerWidth < 768) setCollapsed(true);
    };
    check();
  }, []);

  function cycleTheme() {
    const idx = themeOrder.indexOf(theme);
    setTheme(themeOrder[(idx + 1) % themeOrder.length]!);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const ThemeIcon = themeIcons[theme];
  const themeLabel = theme === "system" ? "System" : theme === "light" ? "Light" : "Dark";

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
          onClick={() => setCollapsed((c) => !c)}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <img src="/logo.png" alt="typelens icon" width={36} height={36} className="h-9 w-9" />
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
          <span className="text-xs text-muted-foreground">
            {appVersion ? `v${appVersion}` : ""}
          </span>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <button
              title="Settings"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align={collapsed ? "center" : "end"} className="w-44 p-1">
            <button
              onClick={cycleTheme}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ThemeIcon className="h-4 w-4 shrink-0" />
              <span>Theme: {themeLabel}</span>
            </button>
            {authEnabled && (
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Log out</span>
              </button>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </aside>
  );
}
