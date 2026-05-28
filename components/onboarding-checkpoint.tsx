"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { selectStatus, useConnectionStore } from "@/lib/stores/connection";
import {
  completeOnboarding,
  getOnboardingState,
  markOnboardingStep,
  resetOnboarding,
  type OnboardingState,
} from "@/lib/stores/onboarding";

export function OnboardingCheckpoint() {
  const pathname = usePathname();
  const status = useConnectionStore(selectStatus);
  const [state, setState] = useState<OnboardingState | null>(null);

  useEffect(() => {
    setState(getOnboardingState());
  }, []);

  useEffect(() => {
    if (!state || state.completed) return;

    let changed = false;
    let next = state;

    if (status === "connected" && !state.steps.connectTypesense) {
      next = markOnboardingStep("connectTypesense", true);
      changed = true;
    }

    if (pathname === "/search" && !next.steps.openSearch) {
      next = markOnboardingStep("openSearch", true);
      changed = true;
    }

    if (changed) setState(next);
  }, [pathname, state, status]);

  const allDone = useMemo(
    () => !!state?.steps.connectTypesense && !!state?.steps.openSearch,
    [state],
  );

  if (!state || state.completed) return null;

  return (
    <Card className="mb-4 border-brand-blue/30 bg-brand-blue/[0.04]">
      <CardHeader>
        <CardTitle className="text-lg">Getting started</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Step done={state.steps.connectTypesense} label="Add and activate a Typesense connection" />
        <Step done={state.steps.openSearch} label="Open Search and run your first query" />
        {!state.steps.connectTypesense && status === "error" && (
          <p className="text-sm text-muted-foreground">
            Connection failed. Open Connections to test again and verify host, port, and API key.
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {!state.steps.connectTypesense && (
            <Button asChild size="sm" variant="outline">
              <Link href="/settings/connection">Go to Connections</Link>
            </Button>
          )}
          {!state.steps.openSearch && (
            <Button asChild size="sm" variant="outline">
              <Link href="/search">Open Search</Link>
            </Button>
          )}
          {allDone && (
            <Button
              size="sm"
              onClick={() => {
                setState(completeOnboarding());
              }}
            >
              Complete onboarding
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setState(resetOnboarding());
            }}
          >
            Reset checklist
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-brand-blue" aria-hidden="true" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      )}
      <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
