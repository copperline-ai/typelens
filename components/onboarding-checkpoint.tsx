"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  selectActiveProfile,
  selectLastCollectionCount,
  selectStatus,
  useConnectionStore,
} from "@/lib/stores/connection";
import {
  completeOnboarding,
  getOnboardingState,
  markOnboardingStep,
  resetOnboarding,
  useOnboardingChecklistStore,
  type LegacyOnboardingData,
} from "@/lib/stores/onboarding";

export function OnboardingCheckpoint() {
  const pathname = usePathname();
  const activeProfile = useConnectionStore(selectActiveProfile);
  const lastCollectionCount = useConnectionStore(selectLastCollectionCount);
  const connectionStatus = useConnectionStore(selectStatus);
  const forceOpen = useOnboardingChecklistStore((s) => s.forceOpen);
  const setForceOpen = useOnboardingChecklistStore((s) => s.setForceOpen);
  const [state, setState] = useState<LegacyOnboardingData | null>(null);

  useEffect(() => {
    setState(getOnboardingState());
  }, []);

  useEffect(() => {
    if (!state || state.completed) return;

    let changed = false;
    let next = state;

    if (activeProfile && !state.steps.connectTypesense) {
      next = markOnboardingStep("connectTypesense", true);
      changed = true;
    }

    if (pathname === "/search" && connectionStatus === "connected" && !next.steps.openSearch) {
      next = markOnboardingStep("openSearch", true);
      changed = true;
    }

    if (
      lastCollectionCount !== null &&
      lastCollectionCount > 0 &&
      !next.steps.createCollection
    ) {
      next = markOnboardingStep("createCollection", true);
      changed = true;
    }

    if (changed) {
      if (next.steps.connectTypesense && next.steps.openSearch && next.steps.createCollection) {
        setState(completeOnboarding());
      } else {
        setState(next);
      }
    }
  }, [activeProfile, pathname, lastCollectionCount, connectionStatus, forceOpen, state]);

  const allDone = useMemo(
    () =>
      !!state?.steps.connectTypesense &&
      !!state?.steps.openSearch &&
      !!state?.steps.createCollection,
    [state],
  );

  if (!forceOpen && (!state || state.completed)) return null;

  const isCompletedView = forceOpen && state?.completed;

  return (
    <Card className="mb-4 border-brand-blue/30 bg-brand-blue/[0.04]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Getting started</CardTitle>
        {forceOpen && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => setForceOpen(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <Step done={state.steps.connectTypesense} label="Add and activate a Typesense connection" />
        <Step done={state.steps.createCollection} label="Create your first collection" />
        <Step done={state.steps.openSearch} label="Open Search and run your first query" />

        {!isCompletedView && (
          <div className="flex flex-wrap gap-2 pt-1">
            {!state.steps.connectTypesense && (
              <Button asChild size="sm" variant="outline">
                <Link href="/settings/connection">Go to Connections</Link>
              </Button>
            )}
            {state.steps.connectTypesense && !state.steps.createCollection && (
              <Button asChild size="sm" variant="outline">
                <Link href="/collections">Create a Collection</Link>
              </Button>
            )}
            {state.steps.createCollection && !state.steps.openSearch && (
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
        )}
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
