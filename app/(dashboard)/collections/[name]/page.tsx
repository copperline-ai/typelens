"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  Download,
  Eraser,
  FileInput,
  FileJson,
  Layers,
  Pencil,
  Trash2,
} from "lucide-react";
import { useConnectionStore, selectActiveProfile, selectStatus } from "@/lib/stores/connection";
import { ConnectingState } from "@/components/connecting-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCollection } from "@/lib/hooks/use-collection";
import {
  TypesenseAuthError,
  deleteCollection,
  deleteDocument,
  exportDocuments,
  sampleDocuments,
  truncateDocuments,
  type Collection,
  type SearchHit,
} from "@/lib/typesense-client";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/async-boundary";
import { CloneCollectionDialog } from "@/components/collections/clone-collection-dialog";
import { EditSchemaDialog } from "@/components/collections/edit-schema-dialog";
import { ImportRecordsDialog } from "@/components/collections/import-records-dialog";
import { AddEmbeddingDialog } from "@/components/collections/add-embedding-dialog";
import { cn } from "@/lib/utils";
import { CopyButton, FieldValue } from "@/components/field-value";

const fmt = new Intl.NumberFormat();

// ── CollapsibleSection ────────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  onFirstOpen,
  children,
}: {
  title: string;
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  onFirstOpen?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const firedRef = useRef(false);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !firedRef.current) {
      firedRef.current = true;
      onFirstOpen?.();
    }
  }

  return (
    <div className="rounded-lg border">
      <button
        onClick={toggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />
        <span className="text-sm font-medium">{title}</span>
        {summary && <span className="text-xs text-muted-foreground ml-1">{summary}</span>}
      </button>
      {open && <div className="border-t">{children}</div>}
    </div>
  );
}

// ── FieldsTable ───────────────────────────────────────────────────────────────

function FieldsTable({ fields }: { fields: Collection["fields"] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50">
        <tr>
          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Flags</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {fields.map((field) => (
          <tr key={field.name} className="hover:bg-muted/30 transition-colors">
            <td className="px-4 py-2.5 font-mono">{field.name}</td>
            <td className="px-4 py-2.5 text-muted-foreground">{field.type}</td>
            <td className="px-4 py-2.5">
              <div className="flex flex-wrap gap-1">
                {field.facet && <Badge variant="secondary">facet</Badge>}
                {field.optional && <Badge variant="outline">optional</Badge>}
                {field.index === false && (
                  <Badge variant="outline" className="text-muted-foreground">
                    no-index
                  </Badge>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── DocumentCard ─────────────────────────────────────────────────────────────

function DocumentCard({
  hit,
  fields,
  collectionName,
  profile,
  onDeleted,
  prevId,
  nextId,
}: {
  hit: SearchHit;
  fields: Collection["fields"];
  collectionName: string;
  profile: NonNullable<ReturnType<typeof useConnectionStore.getState>["profiles"][number]>;
  onDeleted?: () => void;
  prevId?: string;
  nextId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);
  const doc = hit.document;
  const fieldMap = new Map(fields.map((f) => [f.name, f]));

  const entries = Object.entries(doc);
  const ordered: [string, unknown][] = [
    ...entries.filter(([k]) => k === "id"),
    ...fields
      .filter((f) => f.name !== "id" && f.name in doc)
      .map((f) => [f.name, doc[f.name]] as [string, unknown]),
    ...entries.filter(([k]) => k !== "id" && !fieldMap.has(k)),
  ];

  const docId = doc["id"] as string | undefined;

  const previewSnippet = ordered
    .filter(([k]) => k !== "id")
    .map(([, v]) => v)
    .find((v): v is string => typeof v === "string" && v.length > 0);

  async function handleDelete() {
    if (!docId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteDocument(profile, collectionName, docId);
      onDeleted?.();
    } catch (err) {
      setDeleteError(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-lg border overflow-hidden text-sm">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-90",
          )}
        />
        <span className="text-xs text-muted-foreground font-mono shrink-0">id</span>
        {docId ? (
          <Link
            href={(() => {
              const base = `/collections/${encodeURIComponent(collectionName)}/documents/${encodeURIComponent(docId)}`;
              const params = new URLSearchParams();
              if (prevId) params.set("prevId", prevId);
              if (nextId) params.set("nextId", nextId);
              const qs = params.toString();
              return qs ? `${base}?${qs}` : base;
            })()}
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-mono font-medium truncate text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            {docId}
          </Link>
        ) : (
          <span className="text-xs font-mono font-medium truncate">—</span>
        )}
        {!expanded && previewSnippet && (
          <span className="text-xs text-muted-foreground truncate ml-2 opacity-60">
            {previewSnippet.length > 80 ? previewSnippet.slice(0, 80) + "…" : previewSnippet}
          </span>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              disabled={deleting}
              className="shrink-0 ml-auto p-1 rounded text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
              title="Delete document"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete document?</AlertDialogTitle>
              <AlertDialogDescription>
                Permanently delete document{" "}
                <span className="font-mono font-medium text-foreground">{docId}</span>. This cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError instanceof TypesenseAuthError ? (
              <div className="px-6 pb-2">
                <p className="text-xs text-destructive">
                  {deleteError.status === 401
                    ? "Your Typesense API key is invalid."
                    : "Your Typesense API key lacks the required permissions."}
                </p>
                <Link
                  href="/settings/connection"
                  className="inline-block text-xs underline underline-offset-2 text-primary mt-1"
                >
                  Update API key in Settings
                </Link>
              </div>
            ) : deleteError ? (
              <p className="px-6 pb-2 text-xs text-destructive">
                {deleteError instanceof Error ? deleteError.message : String(deleteError)}
              </p>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
                disabled={deleting}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </button>
      {expanded && (
        <div className="border-t divide-y">
          {ordered.map(([key, value]) => {
            const fieldDef = fieldMap.get(key);
            return (
              <div
                key={key}
                className="flex items-start gap-3 px-4 py-2 hover:bg-muted/20 transition-colors"
              >
                <div className="w-36 shrink-0 pt-px">
                  <span className="text-xs font-mono text-muted-foreground">{key}</span>
                  {fieldDef && (
                    <span className="block text-[10px] text-muted-foreground/50 leading-none mt-0.5">
                      {fieldDef.type}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-px flex items-start gap-1.5">
                  <FieldValue value={value} fieldName={key} document={doc} />
                  {key === "id" && typeof value === "string" && <CopyButton text={value} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DocumentsSection({
  profile,
  collectionName,
  fields,
}: {
  profile: NonNullable<ReturnType<typeof useConnectionStore.getState>["profiles"][number]>;
  collectionName: string;
  fields: Collection["fields"];
}) {
  const isMobile = useIsMobile();
  const [perPage, setPerPage] = useState(50);
  useEffect(() => {
    if (isMobile !== undefined) setPerPage(isMobile ? 20 : 50);
  }, [isMobile]);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [found, setFound] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function load(p: number) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const result = await sampleDocuments(
        profile,
        collectionName,
        fields,
        p,
        perPage,
        controller.signal,
      );
      setFound(result.found);
      setHits(result.hits ?? []);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  function goTo(p: number) {
    setPage(p);
    load(p);
  }

  const totalPages = found !== null ? Math.ceil(found / perPage) : null;
  const start = (page - 1) * perPage + 1;
  const end = hits !== null ? (page - 1) * perPage + hits.length : 0;

  return (
    <div className="p-4 space-y-3">
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}
      {error != null && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-center">
          {error instanceof TypesenseAuthError ? (
            <div className="space-y-1">
              <p className="text-xs text-destructive">
                {error.status === 401
                  ? "Your Typesense API key is invalid."
                  : "Your Typesense API key lacks the required permissions for this operation."}
              </p>
              <Link
                href="/settings/connection"
                className="inline-block text-xs underline underline-offset-2 text-primary"
              >
                Update API key in Settings
              </Link>
            </div>
          ) : (
            <p className="text-xs text-destructive">
              {error instanceof Error ? error.message : String(error)}
            </p>
          )}
          {!(error instanceof TypesenseAuthError) && (
            <Button variant="outline" size="sm" className="mt-2" onClick={() => load(page)}>
              Retry
            </Button>
          )}
        </div>
      )}
      {!loading && !error && hits !== null && (
        <>
          {hits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No documents yet.</p>
          ) : (
            <div className="space-y-2">
              {hits.map((hit, i) => (
                <DocumentCard
                  key={i}
                  hit={hit}
                  fields={fields}
                  collectionName={collectionName}
                  profile={profile}
                  onDeleted={() => load(page)}
                  prevId={i > 0 ? (hits[i - 1]?.document["id"] as string | undefined) : undefined}
                  nextId={
                    i < hits.length - 1
                      ? (hits[i + 1]?.document["id"] as string | undefined)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
          {found !== null && found > 0 && (
            <div className="flex items-center justify-between pt-1 gap-2">
              <p className="text-xs text-muted-foreground whitespace-nowrap min-w-0 truncate">
                {fmt.format(start)}–{fmt.format(end)} of {fmt.format(found)} documents
              </p>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 whitespace-nowrap"
                  disabled={page <= 1}
                  onClick={() => goTo(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground px-2 whitespace-nowrap">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 whitespace-nowrap"
                  disabled={totalPages === null || page >= totalPages}
                  onClick={() => goTo(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      <LoadOnMount onLoad={() => load(1)} />
    </div>
  );
}

function LoadOnMount({ onLoad }: { onLoad: () => void }) {
  useEffect(() => {
    onLoad();
  }, []);
  return null;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CollectionDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const collectionName = decodeURIComponent(name);
  const activeProfile = useConnectionStore(selectActiveProfile);
  const status = useConnectionStore(selectStatus);
  const router = useRouter();
  const { data: collection, isLoading, isError, error, refetch } = useCollection(collectionName);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<unknown>(null);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [editSchemaOpen, setEditSchemaOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [addEmbeddingOpen, setAddEmbeddingOpen] = useState(false);
  const [truncating, setTruncating] = useState(false);
  const [truncateError, setTruncateError] = useState<unknown>(null);

  const errorMessage = error instanceof Error ? error.message : String(error);

  function handleExportSchema() {
    if (!collection) return;
    const schema = {
      name: collection.name,
      fields: collection.fields,
      ...(collection.default_sorting_field
        ? { default_sorting_field: collection.default_sorting_field }
        : {}),
    };
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collectionName}-schema.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExport() {
    if (!activeProfile || !collection) return;
    setExporting(true);
    setExportError(null);
    try {
      const jsonl = await exportDocuments(activeProfile, collectionName);
      const blob = new Blob([jsonl], { type: "application/x-ndjson" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${collectionName}.jsonl`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err);
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (!activeProfile) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCollection(activeProfile, collectionName);
      router.push("/collections");
    } catch (err) {
      setDeleteError(err);
      setDeleting(false);
    }
  }

  async function handleTruncate() {
    if (!activeProfile) return;
    setTruncating(true);
    setTruncateError(null);
    try {
      await truncateDocuments(activeProfile, collectionName);
      refetch();
    } catch (err) {
      setTruncateError(err);
    } finally {
      setTruncating(false);
    }
  }

  const facetCount = collection?.fields.filter((f) => f.facet).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/collections">
          <Button variant="ghost" size="icon" title="Back to Collections">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {status === "connecting" && !collection && <ConnectingState profile={activeProfile} />}

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load collection</p>
          {error instanceof TypesenseAuthError ? (
            <div className="mt-1 space-y-1">
              <p className="text-xs text-muted-foreground">
                {error.status === 401
                  ? "Your Typesense API key is invalid."
                  : "Your Typesense API key lacks the required permissions for this operation."}
              </p>
              <Link
                href="/settings/connection"
                className="inline-block text-xs underline underline-offset-2 text-primary"
              >
                Update API key in Settings
              </Link>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>
          )}
          {!(error instanceof TypesenseAuthError) && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          )}
        </div>
      )}

      {!isLoading && !isError && collection && (
        <>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-semibold font-mono">{collection.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {fmt.format(collection.num_documents)}{" "}
                {collection.num_documents === 1 ? "document" : "documents"}
                {collection.created_at && (
                  <> · created {new Date(collection.created_at * 1000).toLocaleString()}</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleExportSchema}
                disabled={!collection}
                title="Export schema as JSON"
              >
                <FileJson className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={handleExport}
                disabled={exporting}
                title="Export documents as JSONL"
              >
                <Download className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setCloneOpen(true)}
                title="Clone collection"
              >
                <Copy className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setEditSchemaOpen(true)}
                title="Edit schema"
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setImportOpen(true)}
                title="Import records"
              >
                <FileInput className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setAddEmbeddingOpen(true)}
                title="Add embedding field"
              >
                <Layers className="h-4 w-4" />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-amber-600 hover:text-amber-600 hover:bg-amber-50 border-amber-200 dark:border-amber-800 dark:hover:bg-amber-950/30"
                    disabled={truncating}
                    title="Truncate collection (delete all records)"
                  >
                    <Eraser className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Truncate collection?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {fmt.format(collection.num_documents)}{" "}
                      {collection.num_documents === 1 ? "document" : "documents"} from{" "}
                      <span className="font-mono font-medium text-foreground">
                        {collection.name}
                      </span>{" "}
                      without deleting the collection or its schema. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {truncateError instanceof TypesenseAuthError ? (
                    <div className="space-y-1">
                      <p className="text-xs text-destructive">
                        {truncateError.status === 401
                          ? "Your Typesense API key is invalid."
                          : "Your Typesense API key lacks the required permissions."}
                      </p>
                      <Link
                        href="/settings/connection"
                        className="inline-block text-xs underline underline-offset-2 text-primary"
                      >
                        Update API key in Settings
                      </Link>
                    </div>
                  ) : truncateError ? (
                    <p className="text-xs text-destructive">
                      {truncateError instanceof Error
                        ? truncateError.message
                        : String(truncateError)}
                    </p>
                  ) : null}
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-amber-600 text-white hover:bg-amber-700"
                      onClick={handleTruncate}
                      disabled={truncating}
                    >
                      Truncate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    disabled={deleting}
                    title="Delete collection"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete collection?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete{" "}
                      <span className="font-mono font-medium text-foreground">
                        {collection.name}
                      </span>{" "}
                      and all {fmt.format(collection.num_documents)}{" "}
                      {collection.num_documents === 1 ? "document" : "documents"}. This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {deleteError instanceof TypesenseAuthError ? (
                    <div className="px-6 pb-2">
                      <p className="text-xs text-destructive">
                        {deleteError.status === 401
                          ? "Your Typesense API key is invalid."
                          : "Your Typesense API key lacks the required permissions."}
                      </p>
                      <Link
                        href="/settings/connection"
                        className="inline-block text-xs underline underline-offset-2 text-primary mt-1"
                      >
                        Update API key in Settings
                      </Link>
                    </div>
                  ) : deleteError ? (
                    <p className="text-xs text-destructive">
                      {deleteError instanceof Error ? deleteError.message : String(deleteError)}
                    </p>
                  ) : null}
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {exportError instanceof TypesenseAuthError ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-2 text-sm">
              <p className="text-xs text-destructive">
                {exportError.status === 401
                  ? "Your Typesense API key is invalid."
                  : "Your Typesense API key lacks the required permissions."}
              </p>
              <Link
                href="/settings/connection"
                className="inline-block text-xs underline underline-offset-2 text-primary mt-0.5"
              >
                Update API key in Settings
              </Link>
            </div>
          ) : exportError ? (
            <p className="text-xs text-destructive">
              {exportError instanceof Error ? exportError.message : String(exportError)}
            </p>
          ) : null}

          {collection.default_sorting_field && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Default sort:</span>
              <Badge variant="outline" className="font-mono">
                {collection.default_sorting_field}
              </Badge>
            </div>
          )}

          <CollapsibleSection
            title="Schema"
            summary={[
              `${collection.fields.length} fields`,
              facetCount > 0 && `${facetCount} faceted`,
              collection.default_sorting_field && `sort: ${collection.default_sorting_field}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          >
            <div className="overflow-x-auto">
              <FieldsTable fields={collection.fields} />
            </div>
          </CollapsibleSection>

          {activeProfile && (
            <CollapsibleSection
              title="Documents"
              summary={`${fmt.format(collection.num_documents)} ${collection.num_documents === 1 ? "document" : "documents"}`}
              onFirstOpen={() => {}}
            >
              <DocumentsSection
                profile={activeProfile}
                collectionName={collection.name}
                fields={collection.fields}
              />
            </CollapsibleSection>
          )}
        </>
      )}

      {collection && (
        <CloneCollectionDialog
          sourceName={collection.name}
          open={cloneOpen}
          onOpenChange={setCloneOpen}
          onCloned={(newName) => router.push(`/collections/${encodeURIComponent(newName)}`)}
        />
      )}

      {collection && activeProfile && (
        <EditSchemaDialog
          collection={collection}
          open={editSchemaOpen}
          onOpenChange={setEditSchemaOpen}
          onUpdated={() => refetch()}
          onRenamed={(newName) => router.push(`/collections/${encodeURIComponent(newName)}`)}
        />
      )}

      {collection && activeProfile && (
        <ImportRecordsDialog
          collection={collection}
          open={importOpen}
          onOpenChange={setImportOpen}
          onImported={() => refetch()}
        />
      )}

      {collection && activeProfile && (
        <AddEmbeddingDialog
          collection={collection}
          open={addEmbeddingOpen}
          onOpenChange={setAddEmbeddingOpen}
          onAdded={() => refetch()}
        />
      )}
    </div>
  );
}
