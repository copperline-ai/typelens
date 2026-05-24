"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";

const NAV_ROUTES = ["/search", "/collections", "/settings/connection"];
const EDGE_THRESHOLD = 0.25; // left/right 25% of screen
const MIN_SWIPE_PX = 60; // min horizontal distance

export function useSwipeNavigation(pathname: string) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const isMobileRef = useRef(isMobile);
  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      if (!touch) return;
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
    }

    function onTouchEnd(e: TouchEvent) {
      if (!isMobileRef.current) return;
      const touch = e.changedTouches[0];
      if (!touch) return;

      // Edge-only: ignore touches that started in the center 50%
      const screenW = window.innerWidth;
      const isEdge =
        touchStartX.current < screenW * EDGE_THRESHOLD ||
        touchStartX.current > screenW * (1 - EDGE_THRESHOLD);
      if (!isEdge) return;

      const dx = touch.clientX - touchStartX.current;
      const dy = touch.clientY - touchStartY.current;
      if (Math.abs(dx) < MIN_SWIPE_PX || Math.abs(dx) <= Math.abs(dy)) return;

      // Find current route index (match prefix for nested routes like /collections/[name])
      const currentIndex = NAV_ROUTES.findIndex(
        (r) => pathname === r || pathname.startsWith(r + "/"),
      );
      if (currentIndex === -1) return;

      if (dx < 0 && currentIndex < NAV_ROUTES.length - 1) {
        router.push(NAV_ROUTES[currentIndex + 1]!);
      } else if (dx > 0 && currentIndex > 0) {
        router.push(NAV_ROUTES[currentIndex - 1]!);
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pathname, router]);
}
