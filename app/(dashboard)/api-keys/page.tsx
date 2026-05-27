"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useConnectionStore, selectActiveProfile, selectActions } from "@/lib/stores/connection";
import { ConnectingState } from "@/components/connecting-state";
import { listApiKeys, deleteApiKey, type ApiKey } from "@/lib/typesense-client";
import { CreateApiKeyDialog } from "@/components/api-keys/create-api-key-dialog";
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

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function ApiKeysSkeleton() {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {["ID", "Description", "Actions", "Collections", "Created"].map((h) => (
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
              {Array.from({ length: 6 }).map((__, j) => (
                <td key={j} className="px-4 py-3">
                  <Skeleton className="h-4 w-20" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApiKeyRow({ apiKey, onDelete }: { apiKey: ApiKey; onDelete: () => Promise<void> }) {
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

  const actionsLabel =
    apiKey.actions.length === 1 && apiKey.actions[0] === "*"
      ? "All actions"
      : apiKey.actions.join(", ");

  const collectionsLabel =
    apiKey.collections.length === 1 && apiKey.collections[0] === "*"
      ? "All collections"
      : apiKey.collections.join(", ");

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{apiKey.id}</td>
      <td className="px-4 py-3 font-medium">
        {apiKey.description || <span className="text-muted-foreground italic">—</span>}
      </td>
      <td
        className="px-4 py-3 text-muted-foreground text-xs font-mono max-w-xs truncate"
        title={actionsLabel}
      >
        {actionsLabel}
      </td>
      <td className="px-4 py-3 text-muted-foreground text-xs font-mono" title={collectionsLabel}>
        {collectionsLabel}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {apiKey.expires_at ? dateFmt.format(new Date(apiKey.expires_at * 1000)) : "Never"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-0.5">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label={`Delete key ${apiKey.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete API key?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the key{" "}
                  <span className="font-mono font-medium text-foreground">
                    {apiKey.value_prefix ? `${apiKey.value_prefix}…` : String(apiKey.id)}
                  </span>
                  {apiKey.description ? ` (${apiKey.description})` : ""}. Any application using this
                  key will immediately lose access. This action cannot be undone.
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

export default function ApiKeysPage() {
  const activeProfile = useConnectionStore(selectActiveProfile);
  const status = useConnectionStore((s) => s.status);
  const actions = useConnectionStore(selectActions);
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  async function fetchKeys() {
    if (!activeProfile) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listApiKeys(activeProfile);
      setKeys(data.keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "connected" && activeProfile) fetchKeys();
  }, [activeProfile?.id, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">API Keys</h1>
          {keys && (
            <p className="text-sm text-muted-foreground mt-1">
              {keys.length} {keys.length === 1 ? "key" : "keys"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeProfile && (
            <Button
              variant="outline"
              size="icon"
              onClick={fetchKeys}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          )}
          {activeProfile && (
            <Button size="icon" onClick={() => setCreateOpen(true)} title="New API Key">
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

      {activeProfile && status === "connecting" && !keys && (
        <ConnectingState profile={activeProfile} />
      )}

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

      {activeProfile && status === "connected" && loading && <ApiKeysSkeleton />}

      {activeProfile && status === "connected" && error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load API keys</p>
          {error.includes("permissions") || error.includes("401") || error.includes("403") ? (
            <div className="mt-1 space-y-1">
              <p className="text-xs text-muted-foreground">
                Your Typesense API key lacks the required permissions to manage API keys.
              </p>
              <Link
                href="/settings/connection"
                className="inline-block text-xs underline underline-offset-2 text-primary"
              >
                Update API key in Settings
              </Link>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          )}
          {!error.includes("permissions") && !error.includes("401") && !error.includes("403") && (
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchKeys}>
              Try again
            </Button>
          )}
        </div>
      )}

      {activeProfile && !loading && !error && keys?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm font-medium">No API keys yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create a key to allow applications to access your Typesense instance.
          </p>
        </div>
      )}

      {activeProfile && !loading && !error && keys && keys.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Description
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Collections
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expires</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <ApiKeyRow
                  key={key.id}
                  apiKey={key}
                  onDelete={async () => {
                    await deleteApiKey(activeProfile!, key.id);
                    setKeys((prev) => prev?.filter((k) => k.id !== key.id) ?? null);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateApiKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(key) => {
          setKeys((prev) => (prev ? [key, ...prev] : [key]));
        }}
      />
    </div>
  );
}
