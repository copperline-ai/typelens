import ky, { type KyInstance } from "ky";
import { useMemo } from "react";
import { selectActiveProfile, useConnectionStore } from "@/lib/stores/connection";

export function useKy(): KyInstance | null {
  const profile = useConnectionStore(selectActiveProfile);

  return useMemo(() => {
    if (!profile) return null;
    return ky.create({
      prefix: "/api/typesense/",
      headers: {
        "X-Ts-Host": profile.host,
        "X-Ts-Port": String(profile.port),
        "X-Ts-Protocol": profile.protocol,
        "X-Ts-Api-Key": profile.apiKey,
      },
      timeout: 10_000,
    });
  }, [profile?.id, profile?.host, profile?.port, profile?.protocol, profile?.apiKey]);
}
