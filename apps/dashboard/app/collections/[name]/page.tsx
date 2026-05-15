"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useConnectionStore, selectActiveProfile } from "@/lib/stores/connection";
import {
  getCollection,
  sampleDocuments,
  type Collection,
  type SearchHit,
} from "@/lib/typesense-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        {!open && summary && <span className="text-xs text-muted-foreground ml-1">{summary}</span>}
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

// ── DocumentPreview ───────────────────────────────────────────────────────────

function DocumentPreview({ hit }: { hit: SearchHit }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-muted/50 px-4 py-3 text-xs leading-relaxed">
      {JSON.stringify(hit.document, null, 2)}
    </pre>
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
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [found, setFound] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await sampleDocuments(profile, collectionName, fields);
      setFound(result.found);
      setHits(result.hits ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-3">
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-center">
          <p className="text-xs text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={load}>
            Retry
          </Button>
        </div>
      )}
      {!loading && !error && hits !== null && (
        <>
          <p className="text-xs text-muted-foreground">
            Showing {hits.length} of {fmt.format(found ?? 0)} documents
          </p>
          {hits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No documents yet.</p>
          ) : (
            <div className="space-y-2">
              {hits.map((hit, i) => (
                <DocumentPreview key={i} hit={hit} />
              ))}
            </div>
          )}
        </>
      )}
      {/* Trigger load on mount */}
      <LoadOnMount onLoad={load} />
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
  const [collection, setCollection] = useState<Collection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Collections
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
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold font-mono">{collection.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {fmt.format(collection.num_documents)}{" "}
                {collection.num_documents === 1 ? "document" : "documents"}
                {collection.created_at && (
                  <> · created {new Date(collection.created_at * 1000).toLocaleDateString()}</>
                )}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchCollection} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
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
            title={`Fields (${collection.fields.length})`}
            summary={[
              `${collection.fields.length} fields`,
              facetCount > 0 && `${facetCount} faceted`,
              collection.default_sorting_field && `sort: ${collection.default_sorting_field}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          >
            <FieldsTable fields={collection.fields} />
          </CollapsibleSection>

          {activeProfile && (
            <CollapsibleSection title="Documents" summary="click to preview" onFirstOpen={() => {}}>
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
