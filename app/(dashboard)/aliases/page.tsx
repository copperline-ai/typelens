"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useConnectionStore, selectActiveProfile, selectActions } from "@/lib/stores/connection";
import { ConnectingState } from "@/components/connecting-state";
import {
  TypesenseAuthError,
  deleteAlias,
  listAliases,
  listCollections,
  type Collection,
  type CollectionAlias,
} from "@/lib/typesense-client";
import { AliasDialog } from "@/components/aliases/alias-dialog";
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
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Alias Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Target Collection
            </th>
            <th className="w-24" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 3 }).map((_, index) => (
            <tr key={index} className="border-b last:border-0">
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-28" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-36" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="ml-auto h-8 w-16" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeleteAliasButton({
  alias,
  onDelete,
}: {
  alias: CollectionAlias;
  onDelete: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setDeleting(false);
      setError(err instanceof Error ? err.message : "Failed to delete alias.");
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Delete alias ${alias.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete alias?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove the alias{" "}
            <span className="font-mono font-medium text-foreground">{alias.name}</span> that
            currently points to{" "}
            <span className="font-mono font-medium text-foreground">{alias.collection_name}</span>.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {error && <p className="w-full px-0 pb-2 text-xs text-destructive">{error}</p>}
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
  );
}

export default function AliasesPage() {
  const activeProfile = useConnectionStore(selectActiveProfile);
  const status = useConnectionStore((state) => state.status);
  const actions = useConnectionStore(selectActions);
  const [aliases, setAliases] = useState<CollectionAlias[] | null>(null);
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAlias, setEditingAlias] = useState<CollectionAlias | null>(null);
  const authError = error instanceof TypesenseAuthError ? error : null;

  async function fetchData() {
    if (!activeProfile) return;
    setLoading(true);
    setError(null);
    try {
      const [aliasesResult, collectionsResult] = await Promise.all([
        listAliases(activeProfile),
        listCollections(activeProfile),
      ]);
      setAliases(aliasesResult.aliases);
      setCollections(collectionsResult);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "connected" && activeProfile) void fetchData();
  }, [activeProfile?.id, status]);

  const collectionNames = (collections ?? []).map((collection) => collection.name);
  const sortedAliases = [...(aliases ?? [])].sort((left, right) => left.name.localeCompare(right.name));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Aliases</h1>
          {aliases && (
            <p className="mt-1 text-sm text-muted-foreground">
              {aliases.length} {aliases.length === 1 ? "alias" : "aliases"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeProfile && (
            <Button variant="outline" size="icon" onClick={fetchData} disabled={loading} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          )}
          {activeProfile && (
            <Button
              onClick={() => {
                setEditingAlias(null);
                setDialogOpen(true);
              }}
              disabled={collectionNames.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Alias
            </Button>
          )}
        </div>
      </div>

      {!activeProfile && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm font-medium">No connection active</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Go to{" "}
            <Link href="/settings/connection" className="underline underline-offset-2">
              Settings
            </Link>{" "}
            to add and activate a Typesense connection.
          </p>
        </div>
      )}

      {activeProfile && status === "connecting" && !aliases && <ConnectingState profile={activeProfile} />}

      {activeProfile && status === "error" && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-12 text-center">
          <p className="text-sm font-medium text-destructive">Connection failed</p>
          <p className="mt-1 text-xs text-muted-foreground">Could not reach the Typesense server.</p>
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

      {activeProfile && status === "connected" && error != null && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load aliases</p>
          {authError ? (
            <div className="mt-1 space-y-1">
              <p className="text-xs text-muted-foreground">
                {authError.status === 401
                  ? "Your Typesense API key is invalid."
                  : "Your Typesense API key lacks the required permissions for this operation."}
              </p>
              <Link
                href="/settings/connection"
                className="inline-block text-xs text-primary underline underline-offset-2"
              >
                Update API key in Settings
              </Link>
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : String(error)}
            </p>
          )}
          {!authError && (
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>
              Try again
            </Button>
          )}
        </div>
      )}

      {activeProfile &&
        status === "connected" &&
        !loading &&
        !error &&
        collections &&
        collections.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <p className="text-sm font-medium">No collections available</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a collection before adding an alias.
            </p>
          </div>
        )}

      {activeProfile &&
        status === "connected" &&
        !loading &&
        !error &&
        collections &&
        collections.length > 0 &&
        aliases &&
        aliases.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <p className="text-sm font-medium">No aliases yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create an alias to point stable names at versioned collections.
            </p>
          </div>
        )}

      {activeProfile &&
        status === "connected" &&
        !loading &&
        !error &&
        aliases &&
        aliases.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Alias Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Target Collection
                  </th>
                  <th className="w-24 px-4 py-3 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAliases.map((alias) => (
                  <tr key={alias.name} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{alias.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {alias.collection_name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label={`Edit alias ${alias.name}`}
                          onClick={() => {
                            setEditingAlias(alias);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <DeleteAliasButton
                          alias={alias}
                          onDelete={async () => {
                            if (!activeProfile) return;
                            await deleteAlias(activeProfile, alias.name);
                            await fetchData();
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <AliasDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        alias={editingAlias}
        collections={collectionNames}
        onSaved={fetchData}
      />
    </div>
  );
}
