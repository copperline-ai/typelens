"use client";

import { useEffect } from "react";
import { useConnectionStore, selectActions, selectIsDemo } from "@/lib/stores/connection";

interface Props {
  isDemo?: boolean;
}

export function HydrateStore({ isDemo = false }: Props) {
  const { hydrateFromStorage, setDemo } = useConnectionStore(selectActions);
  const currentIsDemo = useConnectionStore(selectIsDemo);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (isDemo && !currentIsDemo) {
      setDemo(true);
    }
  }, [isDemo, currentIsDemo, setDemo]);

  return null;
}
