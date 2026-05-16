"use client";

import { useState } from "react";
import { CheckCircle, Edit2, Loader2, Trash2, Wifi, XCircle } from "lucide-react";
import { type Profile, selectActions, useConnectionStore } from "@/lib/stores/connection";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "success"; latencyMs: number }
  | { status: "error"; error: string };

interface Props {
  profile: Profile;
  isActive: boolean;
  onEdit: () => void;
}

export function ProfileCard({ profile, isActive, onEdit }: Props) {
  const { removeProfile, setActiveProfile, testConnection } = useConnectionStore(selectActions);
  const [testState, setTestState] = useState<TestState>({ status: "idle" });
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleTest() {
    setTestState({ status: "testing" });
    const result = await testConnection(profile);
    if (result.ok) {
      setTestState({ status: "success", latencyMs: result.latencyMs });
    } else {
      setTestState({ status: "error", error: result.error });
    }
  }

  return (
    <>
      <Card className={isActive ? "border-primary/50 bg-primary/5" : ""}>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-medium">{profile.name}</span>
                {isActive && <Badge className="h-5 px-1.5 text-[10px]">Active</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {profile.protocol}://{profile.host}:{profile.port}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                API Key: {profile.apiKey.slice(0, 4)}
                {"•".repeat(8)}
              </p>
            </div>
          </div>

          {testState.status !== "idle" && (
            <div className="mt-3">
              {testState.status === "testing" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Testing connection…
                </div>
              )}
              {testState.status === "success" && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Connected in {testState.latencyMs}ms
                </div>
              )}
              {testState.status === "error" && (
                <div className="flex items-start gap-2 text-sm text-destructive">
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{testState.error}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleTest}
            disabled={testState.status === "testing"}
          >
            <Wifi className="h-3.5 w-3.5" />
            Test
          </Button>
          {!isActive && (
            <Button size="sm" variant="outline" onClick={() => setActiveProfile(profile.id)}>
              Set Active
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{profile.name}&rdquo;? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeProfile(profile.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
