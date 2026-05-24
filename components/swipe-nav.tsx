"use client";
import { usePathname } from "next/navigation";
import { useSwipeNavigation } from "@/hooks/use-swipe-navigation";

export function SwipeNav() {
  const pathname = usePathname();
  useSwipeNavigation(pathname);
  return null;
}
