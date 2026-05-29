"use client";

import { useEffect, useMemo, useState } from "react";
import type { Collection } from "@/lib/typesense-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "create" | "edit";

type Props = {
  open: boolean;
  mode: Mode;
  collection: Collection;
  document?: Record<string, unknown>;
  onOpenChange: (open: boolean) => void;
  onSaved: (document: Record<string, unknown>) => void;
  onSubmit: (document: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

type FieldKind = "text" | "number" | "checkbox" | "json" | "readonly";

export function getFieldKind(type: string): FieldKind {
  if (type === "string" || type === "string[]") return "text";
  if (type === "int32" || type === "int64" || type === "float") return "number";
  if (type === "bool") return "checkbox";
  if (type === "float[]") return "readonly";
  if (type === "object" || type === "object[]" || type.includes("[]")) return "json";
  return "text";
}

export function formatFieldValue(type: string, value: unknown): string | boolean {
  if (type === "bool") return value === true;
  if (type === "string[]") {
    return Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value);
  }
  if (type === "object" || type === "object[]" || type.includes("[]")) {
    if (value == null) return type === "object[]" ? "[]" : "{}";
    return JSON.stringify(value, null, 2);
  }
  if (type === "float" || type === "int32" || type === "int64") {
    return value == null ? "" : String(value);
  }
  return value == null ? "" : String(value);
}

export function parseFieldValue(type: string, rawValue: string | boolean): unknown {
  if (type === "bool") return rawValue === true;
  if (type === "float") return rawValue === "" ? undefined : Number(rawValue);
  if (type === "int32" || type === "int64") return rawValue === "" ? undefined : Number(rawValue);
  if (type === "string[]") {
    const text = String(rawValue).trim();
    return text
      ? text
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
      : undefined;
  }
  if (type === "object" || type === "object[]" || type.includes("[]")) {
    const text = String(rawValue).trim();
    return text ? JSON.parse(text) : undefined;
  }
  const text = String(rawValue);
  return text === "" ? undefined : text;
}

export function normalizeInitialValues(
  collection: Collection,
  document?: Record<string, unknown>,
): Record<string, string | boolean> {
  return Object.fromEntries(
    collection.fields.map((field) => [
      field.name,
      formatFieldValue(field.type, document?.[field.name]),
    ]),
  );
}

export function buildDocumentPayload(
  collection: Collection,
  values: Record<string, string | boolean>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const field of collection.fields) {
    const kind = getFieldKind(field.type);
    if (kind === "readonly") continue;
    const parsed = parseFieldValue(field.type, values[field.name] ?? "");
    if (parsed !== undefined) payload[field.name] = parsed;
  }

  return payload;
}

export function DocumentEditorDialog({
  open,
  mode,
  collection,
  document,
  onOpenChange,
  onSaved,
  onSubmit,
}: Props) {
  const initialValues = useMemo(
    () => normalizeInitialValues(collection, document),
    [collection, document],
  );
  const [values, setValues] = useState<Record<string, string | boolean>>(initialValues);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setSubmitError(null);
      setSaving(false);
    }
  }, [initialValues, open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSubmitError(null);

    try {
      const payload = buildDocumentPayload(collection, values);
      const saved = await onSubmit(payload);
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create document" : "Edit document"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? `Add a new document to ${collection.name}.`
              : `Update document fields in ${collection.name}.`}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {collection.fields.map((field) => {
              const kind = getFieldKind(field.type);

              return (
                <div key={field.name} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={field.name}>{field.name}</Label>
                    <span className="text-xs text-muted-foreground font-mono">{field.type}</span>
                  </div>

                  {kind === "text" && (
                    <Input
                      id={field.name}
                      type="text"
                      value={String(values[field.name] ?? "")}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.name]: event.target.value }))
                      }
                    />
                  )}

                  {kind === "number" && (
                    <Input
                      id={field.name}
                      type="number"
                      value={String(values[field.name] ?? "")}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.name]: event.target.value }))
                      }
                    />
                  )}

                  {kind === "checkbox" && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        id={field.name}
                        type="checkbox"
                        checked={values[field.name] === true}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [field.name]: event.target.checked,
                          }))
                        }
                      />
                      <span>Enabled</span>
                    </label>
                  )}

                  {kind === "json" && (
                    <textarea
                      id={field.name}
                      value={String(values[field.name] ?? "")}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.name]: event.target.value }))
                      }
                      rows={5}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  )}

                  {kind === "readonly" && (
                    <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                      Vector fields are not editable here.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {mode === "create" ? "Create document" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
