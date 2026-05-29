"use client";

import { useEffect, useState } from "react";
import { TypesenseAuthError, upsertAlias, type CollectionAlias } from "@/lib/typesense-client";
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

const ALIAS_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

export function AliasDialog({
  open,
  onOpenChange,
  alias,
  collections,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alias?: CollectionAlias | null;
  collections: string[];
  onSaved: () => Promise<void> | void;
}) {
  const activeProfile = useConnectionStore(selectActiveProfile);
  const [name, setName] = useState("");
  const [targetCollection, setTargetCollection] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!alias;

  useEffect(() => {
    if (!open) return;
    setName(alias?.name ?? "");
    setTargetCollection(alias?.collection_name ?? collections[0] ?? "");
    setSaving(false);
    setError(null);
  }, [alias, collections, open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setError(null);
      setSaving(false);
    }
    onOpenChange(nextOpen);
  }

  async function handleSave() {
    if (!activeProfile) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Alias name is required.");
      return;
    }
    if (!ALIAS_NAME_PATTERN.test(trimmedName)) {
      setError("Alias name must start with a letter or _ and only use letters, numbers, _ and -.");
      return;
    }
    if (!targetCollection) {
      setError("Select a target collection.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await upsertAlias(activeProfile, trimmedName, targetCollection);
      await onSaved();
      handleOpenChange(false);
    } catch (err) {
      setError(
        err instanceof TypesenseAuthError
          ? err.status === 401
            ? "Your Typesense API key is invalid."
            : "Your Typesense API key lacks the required permissions for this operation."
          : err instanceof Error
            ? err.message
            : "Failed to save alias.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Alias" : "Create Alias"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="alias-name">Alias name</Label>
            <Input
              id="alias-name"
              placeholder="products"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isEditing || saving}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Target collection</Label>
            <Select value={targetCollection} onValueChange={setTargetCollection} disabled={saving}>
              <SelectTrigger>
                <SelectValue placeholder="Select collection" />
              </SelectTrigger>
              <SelectContent>
                {collections.map((collectionName) => (
                  <SelectItem key={collectionName} value={collectionName}>
                    {collectionName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || collections.length === 0}>
            {saving ? "Saving…" : isEditing ? "Save Alias" : "Create Alias"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
