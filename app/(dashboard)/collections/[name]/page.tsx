"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronRight, Copy, RefreshCw, Trash2 } from "lucide-react";
import { useConnectionStore, selectActiveProfile } from "@/lib/stores/connection";
import {
  getCollection,
  deleteCollection,
  deleteDocument,
  sampleDocuments,
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
import { cn } from "@/lib/utils";

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

function isUrl(s: string) {
  try {
    const url = new URL(s);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseDate(s: string): Date | null {
  // Unix timestamp (10 or 13 digit number-string)
  if (/^\d{10}$/.test(s)) return new Date(parseInt(s, 10) * 1000);
  if (/^\d{13}$/.test(s)) return new Date(parseInt(s, 10));
  // ISO 8601 / RFC 3339
  if (/^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseNumericDate(n: number): Date | null {
  if (!Number.isInteger(n) || n <= 0) return null;
  const s = String(n);
  if (s.length === 10) {
    const d = new Date(n * 1000);
    const y = d.getFullYear();
    return y >= 2001 && y <= 2100 ? d : null;
  }
  if (s.length === 13) {
    const d = new Date(n);
    const y = d.getFullYear();
    return y >= 2001 && y <= 2100 ? d : null;
  }
  return null;
}

function FieldValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-xs text-muted-foreground italic">null</span>;
  }
  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "default" : "outline"} className="text-xs">
        {String(value)}
      </Badge>
    );
  }
  if (typeof value === "number") {
    const parsed = parseNumericDate(value);
    if (parsed) {
      return (
        <span
          className="text-xs font-mono text-violet-600 dark:text-violet-400"
          title={String(value)}
        >
          {parsed.toLocaleString()}
        </span>
      );
    }
    return <span className="text-xs font-mono text-blue-600 dark:text-blue-400">{value}</span>;
  }
  if (typeof value === "string") {
    if (isUrl(value)) {
      const display = value.length > 80 ? value.slice(0, 80) + "…" : value;
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-blue-600 dark:text-blue-400 underline underline-offset-2 break-all hover:opacity-80"
          title={value}
        >
          {display}
        </a>
      );
    }
    const parsed = parseDate(value);
    if (parsed) {
      return (
        <span className="text-xs font-mono text-violet-600 dark:text-violet-400" title={value}>
          {parsed.toLocaleString()}
        </span>
      );
    }
    const display = value.length > 120 ? value.slice(0, 120) + "…" : value;
    return (
      <span className="text-xs font-mono break-all" title={value.length > 120 ? value : undefined}>
        {display}
      </span>
    );
  }
  if (Array.isArray(value)) {
    if (value.length === 0)
      return <span className="text-xs text-muted-foreground italic">[ ]</span>;
    if (value.every((v) => typeof v === "string" || typeof v === "number")) {
      return (
        <div className="flex flex-wrap gap-1">
          {(value as (string | number)[]).slice(0, 8).map((v, i) => (
            <Badge key={i} variant="secondary" className="text-xs font-mono">
              {String(v)}
            </Badge>
          ))}
          {value.length > 8 && (
            <span className="text-xs text-muted-foreground">+{value.length - 8} more</span>
          )}
        </div>
      );
    }
    return <span className="text-xs text-muted-foreground italic">[{value.length} items]</span>;
  }
  if (typeof value === "object") {
    return <span className="text-xs text-muted-foreground italic">{"{ … }"}</span>;
  }
  return <span className="text-xs font-mono">{String(value)}</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={copy}
      className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
      title="Copy ID"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function DocumentCard({
  hit,
  fields,
  collectionName,
  profile,
  onDeleted,
}: {
  hit: SearchHit;
  fields: Collection["fields"];
  collectionName: string;
  profile: NonNullable<ReturnType<typeof useConnectionStore.getState>["profiles"][number]>;
  onDeleted?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
  const bodyFields = ordered.filter(([k]) => k !== "id");

  const previewSnippet = bodyFields
    .map(([, v]) => v)
    .find((v): v is string => typeof v === "string" && v.length > 0);

  async function handleDelete() {
    if (!docId) return;
    setDeleting(true);
    try {
      await deleteDocument(profile, collectionName, docId);
      onDeleted?.();
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
        <span className="text-xs font-mono font-medium truncate">{docId ?? "—"}</span>
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
          {docId && (
            <div className="flex items-center gap-3 px-4 py-2 hover:bg-muted/20 transition-colors">
              <div className="w-36 shrink-0">
                <span className="text-xs font-mono text-muted-foreground">id</span>
              </div>
              <div className="flex flex-1 min-w-0 items-center gap-1.5">
                <span className="text-xs font-mono break-all">{docId}</span>
                <CopyButton text={docId} />
              </div>
            </div>
          )}
          {bodyFields.map(([key, value]) => {
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
                <div className="flex-1 min-w-0 pt-px">
                  <FieldValue value={value} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PER_PAGE = 10;

function DocumentsSection({
  profile,
  collectionName,
  fields,
}: {
  profile: NonNullable<ReturnType<typeof useConnectionStore.getState>["profiles"][number]>;
  collectionName: string;
  fields: Collection["fields"];
}) {
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [found, setFound] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
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
        PER_PAGE,
        controller.signal,
      );
      setFound(result.found);
      setHits(result.hits ?? []);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function goTo(p: number) {
    setPage(p);
    load(p);
  }

  const totalPages = found !== null ? Math.ceil(found / PER_PAGE) : null;
  const start = (page - 1) * PER_PAGE + 1;
  const end = hits !== null ? (page - 1) * PER_PAGE + hits.length : 0;

  return (
    <div className="p-4 space-y-3">
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-center">
          <p className="text-xs text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => load(page)}>
            Retry
          </Button>
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
                />
              ))}
            </div>
          )}
          {found !== null && found > 0 && (
            <div className="flex items-center justify-between pt-1 gap-2">
              <p className="text-xs text-muted-foreground whitespace-nowrap min-w-0 truncate">
                {fmt.format(start)}–{fmt.format(end)} of {fmt.format(found)} docs
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
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!activeProfile) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCollection(activeProfile, collectionName);
      router.push("/collections");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
    }
  }

  async function fetchCollection() {
    if (!activeProfile) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getCollection(activeProfile, collectionName);
      setCollection(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCollection();
  }, [activeProfile?.id, collectionName]);

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

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load collection</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchCollection}>
            Try again
          </Button>
        </div>
      )}

      {!loading && !error && collection && (
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
                onClick={fetchCollection}
                disabled={loading}
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

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
                  {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
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
    </div>
  );
}
