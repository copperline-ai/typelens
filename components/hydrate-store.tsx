"use client";

import { useEffect } from "react";
import { useConnectionStore, selectActions } from "@/lib/stores/connection";

export function HydrateStore() {
  const { hydrateFromStorage } = useConnectionStore(selectActions);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  return null;
}
