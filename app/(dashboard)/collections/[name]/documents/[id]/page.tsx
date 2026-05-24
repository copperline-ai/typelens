"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Clipboard, RefreshCw, Trash2 } from "lucide-react";
import { useConnectionStore, selectActiveProfile } from "@/lib/stores/connection";
import {
  getCollection,
  getDocument,
  deleteDocument,
  type Collection,
} from "@/lib/typesense-client";
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
import { CopyButton, FieldValue } from "@/components/field-value";

export default function DocumentViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string; id: string }>;
  searchParams: Promise<{ prevId?: string; nextId?: string }>;
}) {
  const { name, id } = use(params);
  const { prevId, nextId } = use(searchParams);
  const collectionName = decodeURIComponent(name);
  const documentId = decodeURIComponent(id);

  const router = useRouter();
  const activeProfile = useConnectionStore(selectActiveProfile);

  const [document, setDocument] = useState<Record<string, unknown> | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!activeProfile) return;
    setDeleting(true);
    try {
      await deleteDocument(activeProfile, collectionName, documentId);
      router.push(`/collections/${encodeURIComponent(collectionName)}`);
    } finally {
      setDeleting(false);
    }
  }

  function handleCopyJson() {
    if (!document) return;
    navigator.clipboard.writeText(JSON.stringify(document, null, 2));
  }

  async function fetchData() {
    if (!activeProfile) return;
    setLoading(true);
    setError(null);
    try {
      const [doc, col] = await Promise.all([
        getDocument(activeProfile, collectionName, documentId),
        getCollection(activeProfile, collectionName),
      ]);
      setDocument(doc);
      setCollection(col);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [activeProfile?.id, collectionName, documentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fieldMap = new Map(collection?.fields.map((f) => [f.name, f]) ?? []);

  const ordered: [string, unknown][] = document
    ? [
        ...Object.entries(document).filter(([k]) => k === "id"),
        ...(collection?.fields ?? [])
          .filter((f) => f.name !== "id" && f.name in document)
          .map((f) => [f.name, document[f.name]] as [string, unknown]),
        ...Object.entries(document).filter(([k]) => k !== "id" && !fieldMap.has(k)),
      ]
    : [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-1.5 min-w-0">
        <Link href={`/collections/${encodeURIComponent(collectionName)}`}>
          <Button variant="ghost" size="icon" title="Back to collection">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        {/* Export — left side */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopyJson}
          disabled={!document}
          title="Copy JSON"
        >
          <Clipboard className="h-4 w-4" />
        </Button>
        {/* Right side */}
        <div className="ml-auto shrink-0 flex items-center gap-1.5">
          <CopyButton text={documentId} label="Copy ID" />
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchData}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={deleting || !document}
                title="Delete document"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete document?</AlertDialogTitle>
                <AlertDialogDescription>
                  Permanently delete document{" "}
                  <span className="font-mono font-medium text-foreground">{documentId}</span>. This
                  cannot be undone.
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
          {prevId && (
            <Link
              href={`/collections/${encodeURIComponent(collectionName)}/documents/${encodeURIComponent(prevId)}`}
            >
              <Button variant="ghost" size="icon" title="Previous document">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
          {nextId && (
            <Link
              href={`/collections/${encodeURIComponent(collectionName)}/documents/${encodeURIComponent(nextId)}`}
            >
              <Button variant="ghost" size="icon" title="Next document">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load document</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>
            Try again
          </Button>
        </div>
      )}

      {/* Document fields */}
      {!loading && !error && document && (
        <div className="rounded-lg border overflow-hidden divide-y text-sm">
          {ordered.map(([key, value]) => {
            const fieldDef = fieldMap.get(key);
            return (
              <div
                key={key}
                className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
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
                  <FieldValue value={value} />
                  {key === "id" && typeof value === "string" && (
                    <CopyButton text={value} label="Copy ID" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
