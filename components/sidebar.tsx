"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, Moon, Monitor, PanelLeftClose, Search, Settings, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useThemeStore, selectTheme, selectThemeActions } from "@/lib/store";
import type { Theme } from "@/lib/store";

const navItems = [
  { href: "/collections", label: "Collections", icon: Database },
  { href: "/search", label: "Search", icon: Search },
  { href: "/settings/connection", label: "Settings", icon: Settings },
];

const themeIcons: Record<Theme, React.ElementType> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const themeOrder: Theme[] = ["system", "light", "dark"];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const theme = useThemeStore(selectTheme);
  const { setTheme } = useThemeStore(selectThemeActions);

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

  const ThemeIcon = themeIcons[theme];

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-background transition-[width] duration-200",
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
          <div className="flex items-center gap-2">
            <img
              src="/favicon.svg"
              alt=""
              width={24}
              height={24}
              className="h-6 w-6"
              aria-hidden="true"
            />
            <span className="text-sm font-semibold tracking-tight">
              <span style={{ color: "#0067a3" }}>type</span>
              <span style={{ color: "#00d2da" }}>lens</span>
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <img
              src="/favicon.svg"
              alt="TypeLens icon"
              width={24}
              height={24}
              className="h-6 w-6"
            />
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
          "border-t py-3",
          collapsed ? "flex justify-center px-2" : "flex items-center justify-between px-4",
        )}
      >
        {!collapsed && (
          <span className="text-xs text-muted-foreground">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
        )}
        <button
          onClick={cycleTheme}
          title={theme}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`Theme: ${theme}`}
        >
          <ThemeIcon className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
