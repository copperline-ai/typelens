"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useConnectionStore, selectActiveProfile } from "@/lib/stores/connection";
import { listCollections, type Collection } from "@/lib/typesense-client";
import { CollectionCard } from "@/components/collections/collection-card";
import { Skeleton } from "@/components/async-boundary";
import { Button } from "@/components/ui/button";

function CollectionsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}

export default function CollectionsPage() {
  const activeProfile = useConnectionStore(selectActiveProfile);
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchCollections() {
    if (!activeProfile) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listCollections(activeProfile);
      setCollections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCollections();
  }, [activeProfile?.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Collections</h1>
          {collections && (
            <p className="text-sm text-muted-foreground mt-1">
              {collections.length} {collections.length === 1 ? "collection" : "collections"}
            </p>
          )}
        </div>
        {activeProfile && (
          <Button variant="outline" size="sm" onClick={fetchCollections} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
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

      {activeProfile && loading && <CollectionsSkeleton />}

      {activeProfile && error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load collections</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
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

      {activeProfile && !loading && !error && collections && collections.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <CollectionCard key={c.name} collection={c} />
          ))}
        </div>
      )}
    </div>
  );
}
