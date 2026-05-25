"use client";

import { useState } from "react";
import { upsertAlias, type CollectionAlias } from "@/lib/typesense-client";
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

export function CreateAliasDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (alias: CollectionAlias) => void;
}) {
  const activeProfile = useConnectionStore(selectActiveProfile);

  const [aliasName, setAliasName] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setAliasName("");
    setCollectionName("");
    setSaving(false);
    setError(null);
  }

  function handleOpenChange(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  async function handleCreate() {
    if (!activeProfile) return;
    if (!aliasName.trim()) {
      setError("Alias name is required");
      return;
    }
    if (!collectionName.trim()) {
      setError("Collection name is required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const alias = await upsertAlias(activeProfile, aliasName.trim(), collectionName.trim());
      setAliasName("");
      setCollectionName("");
      onCreated(alias);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create alias");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Create Alias</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="alias-name">Alias name</Label>
            <Input
              id="alias-name"
              placeholder="e.g. products-live"
              value={aliasName}
              onChange={(e) => setAliasName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="collection-name">Collection name</Label>
            <Input
              id="collection-name"
              placeholder="e.g. products-v2"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? "Creating…" : "Create Alias"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
