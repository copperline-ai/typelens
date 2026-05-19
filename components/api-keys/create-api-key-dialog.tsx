"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  TYPESENSE_KEY_ACTIONS,
  createApiKey,
  type ApiKey,
  type ApiKeyCreateSchema,
} from "@/lib/typesense-client";
import { useConnectionStore, selectActiveProfile } from "@/lib/stores/connection";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Phase = "form" | "reveal";

const EXPIRY_OPTIONS = [
  { label: "Never", value: "never" },
  { label: "1 hour", value: "1h" },
  { label: "24 hours", value: "24h" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "1 year", value: "1y" },
] as const;

type ExpiryValue = (typeof EXPIRY_OPTIONS)[number]["value"];

function expiryToUnix(value: ExpiryValue): number | undefined {
  const now = Math.floor(Date.now() / 1000);
  switch (value) {
    case "1h":
      return now + 60 * 60;
    case "24h":
      return now + 24 * 60 * 60;
    case "7d":
      return now + 7 * 24 * 60 * 60;
    case "30d":
      return now + 30 * 24 * 60 * 60;
    case "90d":
      return now + 90 * 24 * 60 * 60;
    case "1y":
      return now + 365 * 24 * 60 * 60;
    default:
      return undefined;
  }
}

function ActionCheckbox({
  action,
  checked,
  onChange,
}: {
  action: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm select-none">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border border-input accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="font-mono text-xs">{action}</span>
    </label>
  );
}

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (key: ApiKey) => void;
}) {
  const activeProfile = useConnectionStore(selectActiveProfile);

  const [phase, setPhase] = useState<Phase>("form");
  const [description, setDescription] = useState("");
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set(["*"]));
  const [collections, setCollections] = useState("*");
  const [expiry, setExpiry] = useState<ExpiryValue>("never");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setPhase("form");
    setDescription("");
    setSelectedActions(new Set(["*"]));
    setCollections("*");
    setExpiry("never");
    setSaving(false);
    setError(null);
    setCreatedKey(null);
    setCopied(false);
  }

  function handleOpenChange(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  function toggleAction(action: string, checked: boolean) {
    setSelectedActions((prev) => {
      const next = new Set(prev);
      if (action === "*") {
        return checked ? new Set(["*"]) : new Set();
      }
      next.delete("*");
      if (checked) next.add(action);
      else next.delete(action);
      return next;
    });
  }

  async function handleCreate() {
    if (!activeProfile) return;
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (selectedActions.size === 0) {
      setError("Select at least one action");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const expiresAt = expiryToUnix(expiry);
      const schema: ApiKeyCreateSchema = {
        description: description.trim(),
        actions: Array.from(selectedActions),
        collections: collections
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        ...(expiresAt !== undefined && { expires_at: expiresAt }),
      };
      const key = await createApiKey(activeProfile, schema);
      setCreatedKey(key);
      setPhase("reveal");
      onCreated(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setSaving(false);
    }
  }

  async function copyKey() {
    if (!createdKey?.value) return;
    await navigator.clipboard.writeText(createdKey.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isWildcard = selectedActions.has("*");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        {phase === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="key-description">Description</Label>
                <Input
                  id="key-description"
                  placeholder="e.g. Search-only frontend key"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Actions</Label>
                <div className="rounded-md border p-3 space-y-2 max-h-56 overflow-y-auto">
                  <ActionCheckbox
                    action="* (all actions)"
                    checked={isWildcard}
                    onChange={(c) => toggleAction("*", c)}
                  />
                  {!isWildcard && (
                    <div className="border-t pt-2 space-y-2">
                      {TYPESENSE_KEY_ACTIONS.filter((a) => a !== "*").map((action) => (
                        <ActionCheckbox
                          key={action}
                          action={action}
                          checked={selectedActions.has(action)}
                          onChange={(c) => toggleAction(action, c)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="key-collections">Collections (comma-separated, * for all)</Label>
                <Input
                  id="key-collections"
                  placeholder="* or collection1, collection2"
                  value={collections}
                  onChange={(e) => setCollections(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Expires at <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Select value={expiry} onValueChange={(v) => setExpiry(v as ExpiryValue)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map(({ label, value }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? "Creating…" : "Create Key"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>API Key Created</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Copy this key now — it will not be shown again.
              </p>
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                <code className="flex-1 text-xs font-mono break-all">
                  {createdKey?.value ?? "—"}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={copyKey}
                  title="Copy key"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {createdKey && (
                <dl className="text-sm space-y-1">
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-28">Description</dt>
                    <dd>{createdKey.description}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-28">Actions</dt>
                    <dd className="font-mono text-xs">{createdKey.actions.join(", ")}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-28">Collections</dt>
                    <dd className="font-mono text-xs">{createdKey.collections.join(", ")}</dd>
                  </div>
                  {createdKey.expires_at && createdKey.expires_at > 0 && (
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground w-28">Expires</dt>
                      <dd>{new Date(createdKey.expires_at * 1000).toLocaleString()}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
