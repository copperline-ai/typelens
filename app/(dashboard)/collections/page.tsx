"use client";

import { Fragment, useState, type ElementType } from "react";
import Link from "next/link";
import { ArrowDownAZ, ArrowUpAZ, CalendarArrowDown, CalendarArrowUp, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useConnectionStore, selectActiveProfile, selectActions } from "@/lib/stores/connection";
import { ConnectingState } from "@/components/connecting-state";
import { deleteCollection, type Collection } from "@/lib/typesense-client";
import { useCollections } from "@/lib/hooks/use-collections";
import { useCollectionCounts } from "@/lib/hooks/use-collection-counts";
import { queryKeys } from "@/lib/api/query-keys";
import { CollectionCard } from "@/components/collections/collection-card";
import { CreateCollectionDialog } from "@/components/collections/create-collection-dialog";
import { Skeleton } from "@/components/async-boundary";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SortKey = "name-asc" | "name-desc" | "created-desc" | "created-asc";

const SORT_OPTIONS: { key: SortKey; icon: ElementType; label: string; sep?: true }[] = [
  { key: "name-asc", icon: ArrowDownAZ, label: "Name A→Z" },
  { key: "name-desc", icon: ArrowUpAZ, label: "Name Z→A" },
  { key: "created-desc", icon: CalendarArrowDown, label: "Newest first", sep: true },
  { key: "created-asc", icon: CalendarArrowUp, label: "Oldest first" },
];

function sortCollections(cols: Collection[], key: SortKey): Collection[] {
  return [...cols].sort((a, b) => {
    switch (key) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "created-desc":
        return (b.created_at ?? 0) - (a.created_at ?? 0);
      case "created-asc":
        return (a.created_at ?? 0) - (b.created_at ?? 0);
    }
  });
}

function CollectionsSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}

export default function CollectionsPage() {
  const activeProfile = useConnectionStore(selectActiveProfile);
  const status = useConnectionStore((s) => s.status);
  const actions = useConnectionStore(selectActions);
  const queryClient = useQueryClient();
  const { data: collections, isLoading, isError, error, refetch } = useCollections();
  const { data: counts } = useCollectionCounts(collections?.map((c) => c.name) ?? []);
  const [createOpen, setCreateOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name-asc");

  const errorMessage = error instanceof Error ? error.message : String(error);

  function invalidateCollections() {
    queryClient.invalidateQueries({ queryKey: queryKeys.collections.list() });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Collections</h1>
            {collections && (
              <p className="text-sm text-muted-foreground mt-1">
                {collections.length} {collections.length === 1 ? "collection" : "collections"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeProfile && (
              <Button size="icon" onClick={() => setCreateOpen(true)} title="New Collection">
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {collections && collections.length > 0 && (
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-0.5">
              {collections.length > 1 &&
                SORT_OPTIONS.map(({ key, icon: Icon, label, sep }) => (
                  <Fragment key={key}>
                    {sep && <span className="mx-1 h-4 w-px bg-border" />}
                    <Button
                      variant="ghost"
                      size="icon"
                      title={label}
                      className={cn(
                        "h-8 w-8",
                        sortKey === key
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => setSortKey(key)}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  </Fragment>
                ))}
            </div>
          </div>
        )}
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

      {activeProfile && status === "connecting" && !(collections && collections.length > 0) && (
        <ConnectingState profile={activeProfile} />
      )}

      {activeProfile && status === "error" && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-12 text-center">
          <p className="text-sm font-medium text-destructive">Connection failed</p>
          <p className="text-xs text-muted-foreground mt-1">
            Could not reach the Typesense server. It may still be starting — click Retry to try
            again.
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

      {activeProfile && status === "connected" && isLoading && <CollectionsSkeleton count={3} />}

      {activeProfile && status === "connected" && isError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load collections</p>
          <p className="text-xs text-muted-foreground mt-1">
            {errorMessage.includes("Not Ready or Lagging") ||
            errorMessage.includes("unavailable after retries")
              ? "Server unavailable. Click Try again to retry."
              : errorMessage}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {activeProfile && !isLoading && !isError && collections?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm font-medium">No collections yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create your first collection in the Typesense instance.
          </p>
        </div>
      )}

      {activeProfile && !isLoading && !isError && collections && collections.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortCollections(collections, sortKey).map((c) => (
            <CollectionCard
              key={c.name}
              collection={c}
              count={counts?.[c.name]}
              onDelete={async () => {
                await deleteCollection(activeProfile!, c.name);
                invalidateCollections();
              }}
              onClone={invalidateCollections}
            />
          ))}
        </div>
      )}

      <CreateCollectionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={invalidateCollections}
      />
    </div>
  );
}
