"use client";

import { useEffect, useState } from "react";
import { cloneCollection, TypesenseAuthError } from "@/lib/typesense-client";
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

interface Props {
  sourceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloned: (newName: string) => void;
}

export function CloneCollectionDialog({ sourceName, open, onOpenChange, onCloned }: Props) {
  const activeProfile = useConnectionStore(selectActiveProfile);
  const [newName, setNewName] = useState(`${sourceName}_copy`);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNewName(`${sourceName}_copy`);
      setError(null);
    }
  }, [open, sourceName]);

  function validate(name: string): string | null {
    if (!name.trim()) return "Name is required";
    if (/\s/.test(name)) return "Name cannot contain spaces";
    if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name))
      return "Must start with a letter or _ and contain only letters, numbers, _ and -";
    return null;
  }

  async function handleClone() {
    if (!activeProfile) return;
    const validationError = validate(newName);
    if (validationError) {
      setError(validationError);
      return;
    }
    setCloning(true);
    setError(null);
    try {
      await cloneCollection(activeProfile, sourceName, newName.trim());
      onCloned(newName.trim());
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof TypesenseAuthError
          ? err.status === 401
            ? "Your Typesense API key is invalid."
            : "Your Typesense API key lacks the required permissions for this operation."
          : err instanceof Error
            ? err.message
            : "Clone failed",
      );
    } finally {
      setCloning(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Clone collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Clones the schema of{" "}
            <span className="font-mono font-medium text-foreground">{sourceName}</span> into a new
            collection. Documents are not copied.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="clone-name">New collection name</Label>
            <Input
              id="clone-name"
              className="font-mono"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !cloning) handleClone();
              }}
              disabled={cloning}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cloning}>
            Cancel
          </Button>
          <Button onClick={handleClone} disabled={cloning || !activeProfile}>
            {cloning ? "Cloning…" : "Clone"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
