"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  Edit2,
  LayoutGrid,
  LayoutList,
  Lock,
  Loader2,
  Plus,
  Trash2,
  Wifi,
  XCircle,
} from "lucide-react";
import {
  type Profile,
  selectActions,
  selectActiveProfileId,
  selectProfiles,
  useConnectionStore,
} from "@/lib/stores/connection";
import { ProfileFormDialog } from "@/components/settings/connection-form";
import { ProfileCard } from "@/components/settings/profile-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "success"; latencyMs: number }
  | { status: "error"; error: string };

function ProfileRow({
  profile,
  isActive,
  onEdit,
}: {
  profile: Profile;
  isActive: boolean;
  onEdit: () => void;
}) {
  const { removeProfile, setActiveProfile, testConnection } = useConnectionStore(selectActions);
  const [testState, setTestState] = useState<TestState>({ status: "idle" });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isReadOnly = profile.id === "env-config";

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
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 border-b last:border-0 transition-colors",
          isActive ? "bg-primary/5" : "hover:bg-muted/30",
        )}
      >
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{profile.name}</span>
            {isActive && <Badge className="h-5 px-1.5 text-[10px]">Active</Badge>}
            {isReadOnly && (
              <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px]">
                <Lock className="h-2.5 w-2.5" />
                Pre-configured
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {profile.protocol}://{profile.host}:{profile.port}
          </p>
          {testState.status !== "idle" && (
            <div className="mt-0.5">
              {testState.status === "testing" && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Testing…
                </span>
              )}
              {testState.status === "success" && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle className="h-3 w-3" /> {testState.latencyMs}ms
                </span>
              )}
              {testState.status === "error" && (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <XCircle className="h-3 w-3" /> {testState.error}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <Button
            size="icon"
            variant="outline"
            onClick={handleTest}
            disabled={testState.status === "testing"}
            title="Test connection"
            className="h-8 w-8"
          >
            <Wifi className="h-3.5 w-3.5" />
          </Button>
          {!isActive && (
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => setActiveProfile(profile.id)}
            >
              Set Active
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={onEdit}
            title="Edit"
            disabled={isReadOnly}
            className="h-8 w-8"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
            title="Delete"
            disabled={isReadOnly}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {!isReadOnly && (
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
      )}
    </>
  );
}

export default function ConnectionSettingsPage() {
  const profiles = useConnectionStore(selectProfiles);
  const activeProfileId = useConnectionStore(selectActiveProfileId);
  const { hydrateFromStorage } = useConnectionStore(selectActions);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"card" | "list">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("connections-view") as "card" | "list") ?? "card";
    }
    return "card";
  });

  function changeView(mode: "card" | "list") {
    setViewMode(mode);
    localStorage.setItem("connections-view", mode);
  }

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  function handleEdit(profile: Profile) {
    setEditingProfile(profile);
    setFormOpen(true);
  }

  function handleAddOpen() {
    setEditingProfile(undefined);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingProfile(undefined);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Connections</h1>
        </div>
        <Button size="icon" onClick={handleAddOpen} title="Add Connection">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {profiles.length > 0 && (
        <div className="flex items-center gap-0.5">
          {(["card", "list"] as const).map((mode) => (
            <Button
              key={mode}
              variant="ghost"
              size="icon"
              title={mode === "card" ? "Card view" : "List view"}
              className={cn(
                "h-8 w-8",
                viewMode === mode
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => changeView(mode)}
            >
              {mode === "card" ? (
                <LayoutGrid className="h-4 w-4" />
              ) : (
                <LayoutList className="h-4 w-4" />
              )}
            </Button>
          ))}
        </div>
      )}

      {profiles.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">No connections yet.</p>
          <Button variant="outline" className="mt-4" onClick={handleAddOpen}>
            Add your first connection
          </Button>
        </div>
      ) : viewMode === "list" ? (
        <div className="rounded-lg border overflow-hidden">
          {profiles.map((profile) => (
            <ProfileRow
              key={profile.id}
              profile={profile}
              isActive={profile.id === activeProfileId}
              onEdit={() => handleEdit(profile)}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isActive={profile.id === activeProfileId}
              onEdit={() => handleEdit(profile)}
            />
          ))}
        </div>
      )}

      <ProfileFormDialog open={formOpen} onOpenChange={handleFormClose} profile={editingProfile} />
    </div>
  );
}
