"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  selectActions,
  selectActiveProfileId,
  selectProfiles,
  useConnectionStore,
} from "@/lib/stores/connection";

type Props = {
  clientId: string;
  clientName: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string;
  scope: string;
};

export default function AuthorizeConsent(props: Props) {
  const profiles = useConnectionStore(selectProfiles);
  const activeProfileId = useConnectionStore(selectActiveProfileId);
  const actions = useConnectionStore(selectActions);

  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    actions.hydrateFromStorage().finally(() => setHydrated(true));
  }, [actions]);

  useEffect(() => {
    if (selectedId === null && profiles.length > 0) {
      setSelectedId(activeProfileId ?? profiles[0]!.id);
    }
  }, [profiles, activeProfileId, selectedId]);

  function denyUrl() {
    const qs = new URLSearchParams({ error: "access_denied" });
    if (props.state) qs.set("state", props.state);
    return `${props.redirectUri}?${qs.toString()}`;
  }

  async function approve() {
    const profile = profiles.find((p) => p.id === selectedId);
    if (!profile) {
      setError("Pick a connection to continue.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/oauth/authorize/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: props.clientId,
          redirect_uri: props.redirectUri,
          code_challenge: props.codeChallenge,
          code_challenge_method: props.codeChallengeMethod,
          state: props.state,
          scope: props.scope,
          profile: {
            id: profile.id,
            name: profile.name,
            host: profile.host,
            port: profile.port,
            protocol: profile.protocol,
            apiKey: profile.apiKey,
          },
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? `Authorization failed (HTTP ${res.status}).`);
        setSubmitting(false);
        return;
      }
      const data = (await res.json()) as { redirect: string };
      window.location.href = data.redirect;
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Connect to TypeLens</CardTitle>
        <CardDescription>
          <span className="font-medium">{props.clientName}</span> wants to access your Typesense
          data through TypeLens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hydrated ? (
          <p className="text-sm text-muted-foreground">Loading your connections…</p>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any saved Typesense connections yet. Add one in the dashboard first,
            then return to this page.
          </p>
        ) : (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Connection to share</label>
            <Select value={selectedId ?? undefined} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a connection" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.host})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The connector will query Typesense using this connection&apos;s API key.
            </p>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button
          variant="outline"
          disabled={submitting}
          onClick={() => {
            window.location.href = denyUrl();
          }}
        >
          Deny
        </Button>
        <Button onClick={approve} disabled={submitting || profiles.length === 0 || !hydrated}>
          {submitting ? "Connecting…" : "Approve"}
        </Button>
      </CardFooter>
    </Card>
  );
}
