"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  useConnectionStore,
  selectActiveProfile,
  selectActions,
  selectLastLatencyMs,
  selectLastCollectionCount,
  selectLastTestedAt,
} from "@/lib/stores/connection";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type TestState = "idle" | "testing" | "pass" | "fail";

interface StatusPopoverProps {
  trigger: React.ReactNode;
}

export function StatusPopover({ trigger }: StatusPopoverProps) {
  const activeProfile = useConnectionStore(selectActiveProfile);
  const actions = useConnectionStore(selectActions);
  const lastLatencyMs = useConnectionStore(selectLastLatencyMs);
  const lastCollectionCount = useConnectionStore(selectLastCollectionCount);
  const lastTestedAt = useConnectionStore(selectLastTestedAt);

  const [testState, setTestState] = React.useState<TestState>("idle");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const flashTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleTest() {
    if (!activeProfile) return;
    setTestState("testing");
    setErrorMsg(null);
    const result = await actions.testConnectionOnce(activeProfile);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    if (result.ok) {
      setTestState("pass");
    } else {
      setTestState("fail");
      setErrorMsg(result.error);
    }
    flashTimerRef.current = setTimeout(() => {
      setTestState("idle");
      setErrorMsg(null);
    }, 3_000);
  }

  React.useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const formattedTime = lastTestedAt
    ? lastTestedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Connection Status
        </p>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          {activeProfile?.name && (
            <>
              <dt className="text-muted-foreground">Server</dt>
              <dd className="truncate font-medium">{activeProfile.name}</dd>
            </>
          )}

          <dt className="text-muted-foreground">Host</dt>
          <dd className="font-mono text-xs truncate">
            {activeProfile ? `${activeProfile.host}:${activeProfile.port}` : "—"}
          </dd>

          <dt className="text-muted-foreground">Latency</dt>
          <dd>{lastLatencyMs !== null ? `${lastLatencyMs} ms` : "—"}</dd>

          <dt className="text-muted-foreground">Collections</dt>
          <dd>{lastCollectionCount !== null ? lastCollectionCount : "—"}</dd>

          <dt className="text-muted-foreground">Last tested</dt>
          <dd className="text-xs">{formattedTime ?? "—"}</dd>
        </dl>

        {testState === "fail" && errorMsg && (
          <p className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">{errorMsg}</p>
        )}

        <Button
          size="sm"
          variant="outline"
          className={cn(
            "w-full",
            testState === "pass" && "border-green-500 text-green-600",
            testState === "fail" && "border-destructive text-destructive",
          )}
          disabled={testState === "testing" || !activeProfile}
          onClick={handleTest}
        >
          {testState === "testing" && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          {testState === "pass"
            ? "Connection OK"
            : testState === "fail"
              ? "Connection failed"
              : "Test Connection"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
