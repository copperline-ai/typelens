import ky, { isHTTPError, type KyInstance } from "ky";
import { useMemo } from "react";
import { selectActiveProfile, useConnectionStore } from "@/lib/stores/connection";
import { TypesenseAuthError } from "@/lib/typesense-client";

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
      hooks: {
        beforeError: [
          (state) => {
            if (isHTTPError(state.error)) {
              const { status } = state.error.response;
              if (status === 401 || status === 403) {
                return new TypesenseAuthError(status, state.error.message);
              }
            }
            return state.error;
          },
        ],
      },
    });
  }, [profile?.id, profile?.host, profile?.port, profile?.protocol, profile?.apiKey]);
}
