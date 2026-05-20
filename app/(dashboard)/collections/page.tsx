"use client";

import { Fragment, useEffect, useState, type ElementType } from "react";
import Link from "next/link";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarArrowDown,
  CalendarArrowUp,
  Copy,
  LayoutGrid,
  LayoutList,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useConnectionStore, selectActiveProfile, selectActions } from "@/lib/stores/connection";
import { listCollections, deleteCollection, type Collection } from "@/lib/typesense-client";
import { CollectionCard } from "@/components/collections/collection-card";
import { CreateCollectionDialog } from "@/components/collections/create-collection-dialog";
import { CloneCollectionDialog } from "@/components/collections/clone-collection-dialog";
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
import { cn } from "@/lib/utils";

const fmt = new Intl.NumberFormat();
const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

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

function CollectionsSkeleton({ count, view }: { count: number; view: "card" | "table" }) {
  if (view === "table") {
    return (
      <>
        <div className="hidden md:block overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {["Name", "Documents", "Fields", "Default Sort", "Created"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: count }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden grid grid-cols-1 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}

function CollectionTableRow({
  collection,
  onDelete,
  onClone,
}: {
  collection: Collection;
  onDelete?: () => Promise<void>;
  onClone?: (newName: string) => void;
}) {
  const { name, num_documents, fields, default_sorting_field, created_at } = collection;
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloneOpen, setCloneOpen] = useState(false);

  async function handleDelete() {
    if (!onDelete) return;
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
    <>
      <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
        <td className="px-4 py-3 font-medium">
          <Link
            href={`/collections/${encodeURIComponent(name)}`}
            className="hover:underline underline-offset-2"
          >
            {name}
          </Link>
        </td>
        <td className="px-4 py-3 text-muted-foreground">{fmt.format(num_documents)}</td>
        <td className="px-4 py-3 text-muted-foreground">{fields.length}</td>
        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
          {default_sorting_field ?? <span className="not-italic">—</span>}
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          {created_at ? dateFmt.format(new Date(created_at * 1000)) : "—"}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-0.5">
            <button
              className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label={`Clone ${name}`}
              onClick={() => setCloneOpen(true)}
            >
              <Copy className="h-4 w-4" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label={`Delete ${name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete collection?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete{" "}
                    <span className="font-mono font-medium text-foreground">{name}</span> and all{" "}
                    {fmt.format(num_documents)} {num_documents === 1 ? "document" : "documents"}.
                    This action cannot be undone.
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
      <CloneCollectionDialog
        sourceName={name}
        open={cloneOpen}
        onOpenChange={setCloneOpen}
        onCloned={(newName) => onClone?.(newName)}
      />
    </>
  );
}

export default function CollectionsPage() {
  const activeProfile = useConnectionStore(selectActiveProfile);
  const status = useConnectionStore((s) => s.status);
  const actions = useConnectionStore(selectActions);
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [skeletonCount, setSkeletonCount] = useState(3);
  const [createOpen, setCreateOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name-asc");
  const [viewMode, setViewMode] = useState<"card" | "table">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("collections-view") as "card" | "table") ?? "card";
    }
    return "card";
  });

  function changeView(mode: "card" | "table") {
    setViewMode(mode);
    localStorage.setItem("collections-view", mode);
  }

  async function fetchCollections() {
    if (!activeProfile) return;
    setLoading(true);
    setError(null);

    const fetchPromise = listCollections(activeProfile);
    const timeoutPromise = new Promise<null>((r) => setTimeout(() => r(null), 1000));
    const quick = await Promise.race([fetchPromise.catch(() => null), timeoutPromise]);
    if (quick !== null && quick.length > 0) setSkeletonCount(quick.length);

    try {
      const data = await fetchPromise;
      setCollections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "connected" && activeProfile) fetchCollections();
  }, [activeProfile?.id, status]);

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
              <Button
                variant="outline"
                size="icon"
                onClick={fetchCollections}
                disabled={loading}
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            )}
            {activeProfile && (
              <Button size="icon" onClick={() => setCreateOpen(true)} title="New Collection">
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {collections && collections.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              {(
                [
                  ["card", LayoutGrid, "Card view"],
                  ["table", LayoutList, "Table view"],
                ] as const
              ).map(([mode, Icon, label]) => (
                <Button
                  key={mode}
                  variant="ghost"
                  size="icon"
                  title={label}
                  className={cn(
                    "h-8 w-8",
                    mode === "table" && "hidden md:flex",
                    viewMode === mode
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => changeView(mode)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
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

      {activeProfile && status === "connecting" && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm font-medium">Connecting to server…</p>
          <p className="text-xs text-muted-foreground mt-1">This may take a moment.</p>
        </div>
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

      {activeProfile && status === "connected" && loading && (
        <CollectionsSkeleton count={skeletonCount} view={viewMode} />
      )}

      {activeProfile && status === "connected" && error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load collections</p>
          <p className="text-xs text-muted-foreground mt-1">
            {error.includes("Not Ready or Lagging") || error.includes("unavailable after retries")
              ? "Server unavailable. Click Try again to retry."
              : error}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchCollections}>
            Try again
          </Button>
        </div>
      )}

      {activeProfile && !loading && !error && collections?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm font-medium">No collections yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create your first collection in the Typesense instance.
          </p>
        </div>
      )}

      {activeProfile &&
        !loading &&
        !error &&
        collections &&
        collections.length > 0 &&
        (viewMode === "table" ? (
          <>
            <div className="hidden md:block overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Documents
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Fields
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Default Sort
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Created
                    </th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {sortCollections(collections, sortKey).map((c) => (
                    <CollectionTableRow
                      key={c.name}
                      collection={c}
                      onDelete={async () => {
                        await deleteCollection(activeProfile!, c.name);
                        setCollections(
                          (prev) => prev?.filter((col) => col.name !== c.name) ?? null,
                        );
                      }}
                      onClone={fetchCollections}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden grid grid-cols-1 gap-4">
              {sortCollections(collections, sortKey).map((c) => (
                <CollectionCard
                  key={c.name}
                  collection={c}
                  onDelete={async () => {
                    await deleteCollection(activeProfile!, c.name);
                    setCollections((prev) => prev?.filter((col) => col.name !== c.name) ?? null);
                  }}
                  onClone={fetchCollections}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortCollections(collections, sortKey).map((c) => (
              <CollectionCard
                key={c.name}
                collection={c}
                onDelete={async () => {
                  await deleteCollection(activeProfile!, c.name);
                  setCollections((prev) => prev?.filter((col) => col.name !== c.name) ?? null);
                }}
                onClone={fetchCollections}
              />
            ))}
          </div>
        ))}

      <CreateCollectionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchCollections}
      />
    </div>
  );
}
