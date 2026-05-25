"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useConnectionStore, selectActiveProfile, selectActions } from "@/lib/stores/connection";
import { ConnectingState } from "@/components/connecting-state";
import { listAliases, deleteAlias, type CollectionAlias } from "@/lib/typesense-client";
import { CreateAliasDialog } from "@/components/aliases/create-alias-dialog";
import { Skeleton } from "@/components/async-boundary";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function AliasesSkeleton() {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {["Alias Name", "Collection"].map((h) => (
              <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">
                {h}
              </th>
            ))}
            <th className="w-16" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 3 }).map((_, i) => (
            <tr key={i} className="border-b last:border-0">
              {Array.from({ length: 3 }).map((__, j) => (
                <td key={j} className="px-4 py-3">
                  <Skeleton className="h-4 w-32" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AliasRow({ alias, onDelete }: { alias: CollectionAlias; onDelete: () => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 font-mono text-sm font-medium">{alias.name}</td>
      <td className="px-4 py-3 text-muted-foreground font-mono text-sm">{alias.collection_name}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-0.5">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label={`Delete alias ${alias.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete alias?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the alias{" "}
                  <span className="font-mono font-medium text-foreground">{alias.name}</span>{" "}
                  pointing to <span className="font-mono">{alias.collection_name}</span>. Any
                  application using this alias will immediately lose access to the collection. This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </td>
    </tr>
  );
}

export default function AliasesPage() {
  const activeProfile = useConnectionStore(selectActiveProfile);
  const status = useConnectionStore((s) => s.status);
  const actions = useConnectionStore(selectActions);
  const [aliases, setAliases] = useState<CollectionAlias[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  async function fetchAliases() {
    if (!activeProfile) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listAliases(activeProfile);
      setAliases(data.aliases);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "connected" && activeProfile) fetchAliases();
  }, [activeProfile?.id, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Aliases</h1>
          {aliases && (
            <p className="text-sm text-muted-foreground mt-1">
              {aliases.length} {aliases.length === 1 ? "alias" : "aliases"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeProfile && (
            <Button
              variant="outline"
              size="icon"
              onClick={fetchAliases}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          )}
          {activeProfile && (
            <Button size="icon" onClick={() => setCreateOpen(true)} title="New Alias">
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {!activeProfile && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm font-medium">No connection active</p>
          <p className="text-xs text-muted-foreground mt-1">
            Go to{" "}
            <Link href="/settings/connection" className="underline underline-offset-2">
              Settings
            </Link>{" "}
            to add and activate a Typesense connection.
          </p>
        </div>
      )}

      {activeProfile && status === "connecting" && <ConnectingState profile={activeProfile} />}

      {activeProfile && status === "error" && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-12 text-center">
          <p className="text-sm font-medium text-destructive">Connection failed</p>
          <p className="text-xs text-muted-foreground mt-1">
            Could not reach the Typesense server.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              if (activeProfile) actions.testConnection(activeProfile);
            }}
          >
            Retry connection
          </Button>
        </div>
      )}

      {activeProfile && status === "connected" && loading && <AliasesSkeleton />}

      {activeProfile && status === "connected" && error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load aliases</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchAliases}>
            Try again
          </Button>
        </div>
      )}

      {activeProfile && !loading && !error && aliases?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm font-medium">No aliases yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create an alias to point to a collection for zero-downtime migration.
          </p>
        </div>
      )}

      {activeProfile && !loading && !error && aliases && aliases.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Alias Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Collection
                </th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {aliases.map((alias) => (
                <AliasRow
                  key={alias.name}
                  alias={alias}
                  onDelete={async () => {
                    await deleteAlias(activeProfile!, alias.name);
                    setAliases((prev) => prev?.filter((a) => a.name !== alias.name) ?? null);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateAliasDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(alias) => {
          setAliases((prev) => (prev ? [alias, ...prev] : [alias]));
        }}
      />
    </div>
  );
}
