"use client";

import { useEffect, useState } from "react";
import { Moon, Monitor, Plus, RefreshCw, Sun, Trash2 } from "lucide-react";
import type { Theme } from "@/lib/store";
import { useThemeStore, selectTheme, selectThemeActions } from "@/lib/store";
import {
  type Profile,
  selectActions,
  selectActiveProfile,
  selectActiveProfileId,
  selectIsDemo,
  selectProfiles,
  useConnectionStore,
} from "@/lib/stores/connection";
import { ProfileFormDialog } from "@/components/settings/connection-form";
import { ProfileCard } from "@/components/settings/profile-card";
import { Button } from "@/components/ui/button";
import { ConnectingState } from "@/components/connecting-state";
import { listApiKeys, deleteApiKey, TypesenseAuthError, type ApiKey } from "@/lib/typesense-client";
import { CreateApiKeyDialog } from "@/components/api-keys/create-api-key-dialog";
import { Skeleton } from "@/components/async-boundary";
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

type Section = "connections" | "api-keys" | "theme";

const sections: { id: Section; label: string }[] = [
  { id: "connections", label: "Connections" },
  { id: "api-keys", label: "API Keys" },
  { id: "theme", label: "Theme" },
];

export default function UnifiedSettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>("connections");

  return (
    <div className="flex gap-8">
      <nav className="hidden md:flex w-48 shrink-0 flex-col gap-1">
        {sections.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors text-left ${
              activeSection === id
                ? "bg-muted text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="flex-1 min-w-0">
        <select
          className="md:hidden flex w-full mb-6 rounded-md border bg-background px-3 py-2 text-sm"
          value={activeSection}
          onChange={(e) => setActiveSection(e.target.value as Section)}
        >
          {sections.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>

        {activeSection === "connections" && <ConnectionsSection />}
        {activeSection === "api-keys" && <ApiKeysSection />}
        {activeSection === "theme" && <ThemeSection />}
      </div>
    </div>
  );
}

function ConnectionsSection() {
  const profiles = useConnectionStore(selectProfiles);
  const activeProfileId = useConnectionStore(selectActiveProfileId);
  const isDemo = useConnectionStore(selectIsDemo);
  const { hydrateFromStorage } = useConnectionStore(selectActions);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | undefined>(undefined);
  const [profileToCopy, setProfileToCopy] = useState<Profile | null>(null);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  function handleEdit(profile: Profile) {
    setEditingProfile(profile);
    setFormOpen(true);
  }

  function handleAddOpen() {
    setEditingProfile(undefined);
    setFormOpen(true);
  }

  function handleCopy(profile: Profile) {
    setEditingProfile(undefined);
    setProfileToCopy(profile);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) {
      setEditingProfile(undefined);
      setProfileToCopy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Connections</h1>
        </div>
        {!isDemo && (
          <Button size="icon" onClick={handleAddOpen} title="Add Connection">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">No connections yet.</p>
          {!isDemo && (
            <Button variant="outline" className="mt-4" onClick={handleAddOpen}>
              Add your first connection
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isActive={profile.id === activeProfileId}
              onEdit={() => handleEdit(profile)}
              onCopy={handleCopy}
            />
          ))}
        </div>
      )}

      <ProfileFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        profile={editingProfile}
        initialValues={
          profileToCopy
            ? {
                name: `${profileToCopy.name} (copy)`,
                host: profileToCopy.host,
                port: profileToCopy.port,
                protocol: profileToCopy.protocol,
                apiKey: profileToCopy.apiKey,
              }
            : undefined
        }
      />
    </div>
  );
}

function ApiKeysSection() {
  const activeProfile = useConnectionStore(selectActiveProfile);
  const status = useConnectionStore((s) => s.status);
  const actions = useConnectionStore(selectActions);
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [error, setError] = useState<unknown>(null);
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
      setError(err);
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
            Add and activate a connection to manage API keys.
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

      {activeProfile && status === "connected" && error != null && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load API keys</p>
          {error instanceof TypesenseAuthError ? (
            <div className="mt-1 space-y-1">
              <p className="text-xs text-muted-foreground">
                {error.status === 401
                  ? "Your Typesense API key is invalid."
                  : "Your Typesense API key lacks the required permissions to manage API keys."}
              </p>
              <p className="text-xs text-muted-foreground">
                Update your API key in the Connections section above.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              {error instanceof Error ? error.message : String(error)}
            </p>
          )}
          {!(error instanceof TypesenseAuthError) && (
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
  const [error, setError] = useState<unknown>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err);
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
        {apiKey.expires_at
          ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
              new Date(apiKey.expires_at * 1000),
            )
          : "Never"}
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
                {error instanceof TypesenseAuthError ? (
                  <div className="px-0 pb-2 w-full">
                    <p className="text-xs text-destructive">
                      {error.status === 401
                        ? "Your Typesense API key is invalid."
                        : "Your Typesense API key lacks the required permissions."}
                    </p>
                  </div>
                ) : error ? (
                  <p className="text-xs text-destructive">
                    {error instanceof Error ? error.message : String(error)}
                  </p>
                ) : null}
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

function ThemeSection() {
  const theme = useThemeStore(selectTheme);
  const { setTheme } = useThemeStore(selectThemeActions);

  const options: { value: Theme; label: string; icon: React.ElementType }[] = [
    { value: "system", label: "System", icon: Monitor },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Theme</h1>
        <p className="text-sm text-muted-foreground mt-1">Choose your preferred color scheme.</p>
      </div>
      <div className="flex gap-3">
        {options.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-6 min-w-[120px] transition-colors ${
              theme === value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <Icon
              className={`h-6 w-6 ${theme === value ? "text-primary" : "text-muted-foreground"}`}
            />
            <span className={`text-sm font-medium ${theme === value ? "text-primary" : ""}`}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
