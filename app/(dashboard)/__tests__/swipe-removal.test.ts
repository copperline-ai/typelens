import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = path.resolve(__dirname, "../../..");
const dashboardLayoutPath = path.join(rootDir, "app/(dashboard)/layout.tsx");
const searchPagePath = path.join(rootDir, "app/(dashboard)/search/page.tsx");
const swipeHookPath = path.join(rootDir, "hooks/use-swipe-navigation.ts");
const swipeComponentPath = path.join(rootDir, "components/swipe-nav.tsx");

describe("swipe navigation removal", () => {
  it("removes the shared swipe hook and wrapper component", () => {
    expect(existsSync(swipeHookPath)).toBe(false);
    expect(existsSync(swipeComponentPath)).toBe(false);
  });

  it("removes swipe navigation references from dashboard layout and search page", () => {
    const dashboardLayout = readFileSync(dashboardLayoutPath, "utf8");
    const searchPage = readFileSync(searchPagePath, "utf8");

    expect(dashboardLayout).not.toContain("SwipeNav");

    expect(searchPage).not.toContain("searchSwipeConsumedRef");
    expect(searchPage).not.toContain("function onTouchStart");
    expect(searchPage).not.toContain("function onTouchEnd");
    expect(searchPage).not.toContain('window.addEventListener("touchstart"');
    expect(searchPage).not.toContain('window.addEventListener("touchend"');
    expect(searchPage).not.toContain('window.removeEventListener("touchstart"');
    expect(searchPage).not.toContain('window.removeEventListener("touchend"');
  });
});
