"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Check, Plus, Upload } from "lucide-react";
import Papa from "papaparse";
import {
  importDocumentsWithOptions,
  updateCollectionSchema,
  type Collection,
  type ImportAction,
} from "@/lib/typesense-client";
import { inferFieldsFromRecords, diffSchemas, type SchemaDiff } from "@/lib/schema-utils";
import { useConnectionStore, selectActiveProfile } from "@/lib/stores/connection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types ─────────────────────────────────────────────────────────────────────

type FileState =
  | { status: "idle" }
  | { status: "parsed"; records: Record<string, unknown>[]; fileName: string; diff: SchemaDiff }
  | { status: "error"; message: string };

type SubmitState =
  | { status: "idle" }
  | { status: "patching-schema" }
  | { status: "importing"; total: number }
  | { status: "done"; imported: number; failed: number }
  | { status: "error"; message: string };

const ACTION_LABELS: Record<ImportAction, { label: string; description: string }> = {
  upsert: { label: "Upsert", description: "Create new or replace existing (full document)" },
  create: { label: "Create only", description: "Fail if document ID already exists" },
  update: { label: "Update only", description: "Partial update; fails if document doesn't exist" },
  emplace: { label: "Emplace", description: "Create or partial update — most flexible" },
};

// ── Main Dialog ───────────────────────────────────────────────────────────────

interface Props {
  collection: Collection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ImportRecordsDialog({ collection, open, onOpenChange, onImported }: Props) {
  const activeProfile = useConnectionStore(selectActiveProfile);
  const [fileState, setFileState] = useState<FileState>({ status: "idle" });
  const [action, setAction] = useState<ImportAction>("upsert");
  const [addNewFields, setAddNewFields] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFileState({ status: "idle" });
    setAction("upsert");
    setAddNewFields(false);
    setSubmitState({ status: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      let records: Record<string, unknown>[] = [];

      try {
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text) as unknown;
          records = Array.isArray(parsed)
            ? (parsed as Record<string, unknown>[])
            : [parsed as Record<string, unknown>];
        } else if (file.name.endsWith(".jsonl") || file.name.endsWith(".ndjson")) {
          records = text
            .split("\n")
            .filter((l) => l.trim())
            .map((l) => JSON.parse(l) as Record<string, unknown>);
        } else {
          const result = Papa.parse<Record<string, unknown>>(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
          });
          records = result.data;
        }
      } catch {
        setFileState({
          status: "error",
          message: "Failed to parse file. Ensure it is valid JSON, JSONL, or CSV.",
        });
        return;
      }

      if (records.length === 0) {
        setFileState({ status: "error", message: "No records found in file." });
        return;
      }

      const inferred = inferFieldsFromRecords(records);
      const diff = diffSchemas(collection.fields, inferred);
      setFileState({ status: "parsed", records, fileName: file.name, diff });
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!activeProfile || fileState.status !== "parsed") return;
    const { records, diff } = fileState;

    if (addNewFields && diff.newFields.length > 0) {
      setSubmitState({ status: "patching-schema" });
      try {
        await updateCollectionSchema(
          activeProfile,
          collection.name,
          diff.newFields.map((f) => ({ name: f.name, type: f.type, optional: true })),
        );
      } catch (err) {
        setSubmitState({
          status: "error",
          message: `Schema update failed: ${err instanceof Error ? err.message : String(err)}`,
        });
        return;
      }
    }

    setSubmitState({ status: "importing", total: records.length });
    try {
      const results = await importDocumentsWithOptions(
        activeProfile,
        collection.name,
        records,
        action,
      );
      const failed = results.filter((r) => !r.success).length;
      setSubmitState({ status: "done", imported: results.length - failed, failed });
      onImported();
    } catch (err) {
      setSubmitState({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const isSubmitting =
    submitState.status === "patching-schema" || submitState.status === "importing";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Records</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File upload */}
          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium">File</label>
              <p className="text-xs text-muted-foreground mt-0.5">JSON, JSONL/NDJSON, or CSV</p>
            </div>
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 cursor-pointer hover:border-muted-foreground/50 transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {fileState.status === "parsed"
                  ? `${fileState.fileName} — ${fileState.records.length.toLocaleString()} records`
                  : "Click to choose a file"}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.jsonl,.ndjson,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {fileState.status === "error" && (
              <p className="text-xs text-destructive">{fileState.message}</p>
            )}
          </div>

          {/* Schema diff */}
          {fileState.status === "parsed" && (
            <div className="space-y-3 rounded-lg border p-3 text-sm">
              <p className="font-medium text-sm">Schema comparison</p>

              {fileState.diff.newFields.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <Plus className="h-3 w-3" />
                    {fileState.diff.newFields.length} new field
                    {fileState.diff.newFields.length !== 1 ? "s" : ""} in file
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {fileState.diff.newFields.map((f) => (
                      <Badge key={f.name} variant="outline" className="font-mono text-xs">
                        {f.name}
                        <span className="ml-1 text-muted-foreground">{f.type}</span>
                      </Badge>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs mt-1">
                    <input
                      type="checkbox"
                      checked={addNewFields}
                      onChange={(e) => setAddNewFields(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-border accent-primary"
                    />
                    Add these fields to the collection schema before importing
                  </label>
                </div>
              )}

              {fileState.diff.typeConflicts.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                    <AlertTriangle className="h-3 w-3" />
                    {fileState.diff.typeConflicts.length} type conflict
                    {fileState.diff.typeConflicts.length !== 1 ? "s" : ""}
                  </div>
                  {fileState.diff.typeConflicts.map((c) => (
                    <p key={c.name} className="text-xs text-muted-foreground font-mono">
                      {c.name}: collection={c.existingType}, file suggests {c.incomingType}
                    </p>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Documents with incompatible types will fail unless type coercion applies.
                  </p>
                </div>
              )}

              {fileState.diff.newFields.length === 0 &&
                fileState.diff.typeConflicts.length === 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3 w-3" />
                    Schema is fully compatible — all fields match
                  </div>
                )}

              {fileState.diff.missingFromFile.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {fileState.diff.missingFromFile.length} collection field
                  {fileState.diff.missingFromFile.length !== 1 ? "s" : ""} not present in file (
                  {fileState.diff.missingFromFile.map((f) => f.name).join(", ")})
                </p>
              )}
            </div>
          )}

          {/* Import action */}
          {fileState.status === "parsed" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Import action</label>
              <Select value={action} onValueChange={(v) => setAction(v as ImportAction)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(ACTION_LABELS) as [
                      ImportAction,
                      { label: string; description: string },
                    ][]
                  ).map(([val, { label, description }]) => (
                    <SelectItem key={val} value={val}>
                      <span className="font-medium">{label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status */}
          {submitState.status === "done" && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
              {submitState.imported.toLocaleString()} imported
              {submitState.failed > 0 && (
                <span className="text-destructive">
                  , {submitState.failed.toLocaleString()} failed
                </span>
              )}
            </div>
          )}

          {submitState.status === "error" && (
            <p className="text-sm text-destructive">{submitState.message}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isSubmitting || fileState.status !== "parsed" || !activeProfile}
          >
            {submitState.status === "patching-schema"
              ? "Updating schema…"
              : submitState.status === "importing"
                ? `Importing ${submitState.total.toLocaleString()} records…`
                : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
