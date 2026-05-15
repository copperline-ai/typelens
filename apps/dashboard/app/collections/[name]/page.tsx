"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useConnectionStore, selectActiveProfile } from "@/lib/stores/connection";
import { getCollection, type Collection } from "@/lib/typesense-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/async-boundary";

const fmt = new Intl.NumberFormat();

function FieldsTable({ fields }: { fields: Collection["fields"] }) {
  return (
    <div className="rounded-lg border overflow-hidden">
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
    </div>
  );
}

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
          <Skeleton className="h-64 w-full" />
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
                  <>
                    {" · "}created {new Date(collection.created_at * 1000).toLocaleDateString()}
                  </>
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

          <div>
            <h2 className="text-sm font-medium mb-3">
              Fields{" "}
              <span className="text-muted-foreground font-normal">
                ({collection.fields.length})
              </span>
            </h2>
            <FieldsTable fields={collection.fields} />
          </div>
        </>
      )}
    </div>
  );
}
