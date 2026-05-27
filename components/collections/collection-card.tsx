"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Trash2 } from "lucide-react";
import { TypesenseAuthError, type Collection } from "@/lib/typesense-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { CloneCollectionDialog } from "@/components/collections/clone-collection-dialog";

const fmt = new Intl.NumberFormat();

interface Props {
  collection: Collection;
  /** Accurate document count from a `q=*` search; falls back to `num_documents`. */
  count?: number;
  onDelete?: () => Promise<void>;
  onClone?: (newName: string) => void;
}

export function CollectionCard({ collection, count, onDelete, onClone }: Props) {
  const { name, num_documents, fields, default_sorting_field } = collection;
  const docCount = count ?? num_documents;
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [cloneOpen, setCloneOpen] = useState(false);

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err);
      setDeleting(false);
    }
  }

  return (
    <div className="group relative">
      <Link href={`/collections/${encodeURIComponent(name)}`}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
          <CardHeader className="pb-2 min-w-0">
            <CardTitle className="text-base truncate pr-16" title={name}>
              {name}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5 min-w-0">
            <Badge variant="secondary">
              {fmt.format(docCount)} {docCount === 1 ? "doc" : "docs"}
            </Badge>
            <Badge variant="secondary">{fields.length} fields</Badge>
            {default_sorting_field && (
              <Badge
                variant="secondary"
                className="max-w-full truncate"
                title={`sort: ${default_sorting_field}`}
              >
                sort: {default_sorting_field}
              </Badge>
            )}
          </CardContent>
        </Card>
      </Link>

      <div className="absolute right-2 top-2 flex items-center gap-0.5">
        <button
          className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label={`Clone ${name}`}
          onClick={(e) => {
            e.preventDefault();
            setCloneOpen(true);
          }}
        >
          <Copy className="h-4 w-4" />
        </button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label={`Delete ${name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete collection?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete{" "}
                <span className="font-mono font-medium text-foreground">{name}</span> and all{" "}
                {fmt.format(docCount)} {docCount === 1 ? "document" : "documents"}. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              {error instanceof TypesenseAuthError ? (
                <div className="px-6 pb-2">
                  <p className="text-xs text-destructive">
                    {error.status === 401
                      ? "Your Typesense API key is invalid."
                      : "Your Typesense API key lacks the required permissions for this operation."}
                  </p>
                  <Link
                    href="/settings/connection"
                    className="inline-block text-xs underline underline-offset-2 text-primary mt-1"
                  >
                    Update API key in Settings
                  </Link>
                </div>
              ) : error ? (
                <p className="px-6 pb-2 text-xs text-destructive">
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

      <CloneCollectionDialog
        sourceName={name}
        open={cloneOpen}
        onOpenChange={setCloneOpen}
        onCloned={(newName) => onClone?.(newName)}
      />
    </div>
  );
}
