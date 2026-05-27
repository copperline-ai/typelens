"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, ArrowRight, Plus, Trash2 } from "lucide-react";
import {
  TYPESENSE_FIELD_TYPES,
  TypesenseAuthError,
  updateCollectionSchema,
  createCollection,
  upsertAlias,
  deleteCollection,
  exportDocuments,
  importDocumentsWithOptions,
  type Collection,
  type CollectionField,
  type SchemaFieldPatch,
  type ImportProgress,
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
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ── Zod schema ────────────────────────────────────────────────────────────────

const fieldRowSchema = z.object({
  name: z.string().min(1, "Required"),
  type: z.enum(TYPESENSE_FIELD_TYPES),
  facet: z.boolean().default(false),
  optional: z.boolean().default(false),
  index: z.boolean().default(true),
  _originalName: z.string().optional(),
});

const formSchema = z.object({
  collectionName: z.string().min(1, "Required"),
  fields: z.array(fieldRowSchema),
});
type FormValues = z.infer<typeof formSchema>;

type ChangeClassification = "add-only" | "modifying";

// ── Helpers ───────────────────────────────────────────────────────────────────

function classifyChanges(
  original: CollectionField[],
  updated: FormValues["fields"],
): ChangeClassification {
  const updatedOriginalNames = new Set(updated.map((f) => f._originalName ?? f.name));
  for (const orig of original) {
    if (!updatedOriginalNames.has(orig.name)) return "modifying";
  }
  const originalMap = new Map(original.map((f) => [f.name, f]));
  for (const upd of updated) {
    const orig = originalMap.get(upd._originalName ?? upd.name);
    if (!orig) continue;
    if (orig.type !== upd.type) return "modifying";
    if ((orig.facet ?? false) !== upd.facet) return "modifying";
    if ((orig.optional ?? false) !== upd.optional) return "modifying";
    if ((orig.index ?? true) !== upd.index) return "modifying";
  }
  return "add-only";
}

function buildPatchOps(
  original: CollectionField[],
  updated: FormValues["fields"],
): SchemaFieldPatch[] {
  const originalMap = new Map(original.map((f) => [f.name, f]));
  const ops: SchemaFieldPatch[] = [];

  const updatedOriginalNames = new Set(updated.map((f) => f._originalName ?? f.name));
  for (const orig of original) {
    if (!updatedOriginalNames.has(orig.name)) ops.push({ name: orig.name, drop: true });
  }

  for (const upd of updated) {
    const origName = upd._originalName ?? upd.name;
    const orig = originalMap.get(origName);
    const fieldDef: SchemaFieldPatch = {
      name: upd.name,
      type: upd.type,
      ...(upd.facet ? { facet: true } : {}),
      ...(upd.optional ? { optional: true } : {}),
      ...(!upd.index ? { index: false } : {}),
    };
    if (orig) {
      const changed =
        orig.type !== upd.type ||
        (orig.facet ?? false) !== upd.facet ||
        (orig.optional ?? false) !== upd.optional ||
        (orig.index ?? true) !== upd.index;
      if (changed) {
        ops.push({ name: origName, drop: true });
        ops.push(fieldDef);
      }
    } else {
      ops.push(fieldDef);
    }
  }
  return ops;
}

// ── Checkbox ──────────────────────────────────────────────────────────────────

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-center cursor-pointer" title={label}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
        aria-label={label}
      />
    </label>
  );
}

// ── Main Dialog ───────────────────────────────────────────────────────────────

type SubmitState =
  | { status: "idle" }
  | { status: "patching" }
  | { status: "migrating"; step: string }
  | { status: "error"; message: string };

interface Props {
  collection: Collection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  onRenamed?: (newName: string) => void;
}

export function EditSchemaDialog({ collection, open, onOpenChange, onUpdated, onRenamed }: Props) {
  const activeProfile = useConnectionStore(selectActiveProfile);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [deleteOriginal, setDeleteOriginal] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      collectionName: collection.name,
      fields: collection.fields.map((f) => ({
        name: f.name,
        type: f.type as (typeof TYPESENSE_FIELD_TYPES)[number],
        facet: f.facet ?? false,
        optional: f.optional ?? false,
        index: f.index ?? true,
        _originalName: f.name,
      })),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        collectionName: collection.name,
        fields: collection.fields.map((f) => ({
          name: f.name,
          type: f.type as (typeof TYPESENSE_FIELD_TYPES)[number],
          facet: f.facet ?? false,
          optional: f.optional ?? false,
          index: f.index ?? true,
          _originalName: f.name,
        })),
      });
    }
  }, [open]);

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "fields" });
  const watchedFields = form.watch("fields");
  const watchedName = form.watch("collectionName");
  const isRename = watchedName !== collection.name;
  const changeType = classifyChanges(collection.fields, watchedFields);
  const needsMigration = isRename || changeType === "modifying";

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset({
        collectionName: collection.name,
        fields: collection.fields.map((f) => ({
          name: f.name,
          type: f.type as (typeof TYPESENSE_FIELD_TYPES)[number],
          facet: f.facet ?? false,
          optional: f.optional ?? false,
          index: f.index ?? true,
          _originalName: f.name,
        })),
      });
      setSubmitState({ status: "idle" });
      setDeleteOriginal(false);
    }
    onOpenChange(next);
  }

  async function handleDirectPatch(data: FormValues) {
    if (!activeProfile) return;
    setSubmitState({ status: "patching" });
    try {
      const ops = buildPatchOps(collection.fields, data.fields);
      await updateCollectionSchema(activeProfile, collection.name, ops);
      onUpdated();
      handleOpenChange(false);
    } catch (err) {
      setSubmitState({
        status: "error",
        message:
          err instanceof TypesenseAuthError
            ? err.status === 401
              ? "Your Typesense API key is invalid."
              : "Your Typesense API key lacks the required permissions for this operation."
            : err instanceof Error
              ? err.message
              : String(err),
      });
    }
  }

  async function handleMigration(data: FormValues) {
    if (!activeProfile) return;
    const renaming = data.collectionName !== collection.name;
    // For rename: use the exact name the user specified.
    // For schema-only migration: use a timestamped temp name until the alias is swapped in.
    const newName = renaming ? data.collectionName : `${collection.name}_${Date.now()}`;

    try {
      setSubmitState({ status: "migrating", step: "Creating new collection…" });
      await createCollection(activeProfile, {
        name: newName,
        fields: data.fields.map((f) => ({
          name: f.name,
          type: f.type,
          ...(f.facet ? { facet: true } : {}),
          ...(f.optional ? { optional: true } : {}),
          ...(!f.index ? { index: false } : {}),
        })),
        ...(collection.default_sorting_field &&
        data.fields.some((f) => f.name === collection.default_sorting_field)
          ? { default_sorting_field: collection.default_sorting_field }
          : {}),
      });

      setSubmitState({ status: "migrating", step: "Exporting documents…" });
      const jsonl = await exportDocuments(activeProfile, collection.name);
      const records = jsonl
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l) as Record<string, unknown>);

      if (records.length > 0) {
        setSubmitState({
          status: "migrating",
          step: `Importing 0 / ${records.length.toLocaleString()} documents…`,
        });
        await importDocumentsWithOptions(
          activeProfile,
          newName,
          records,
          "upsert",
          ({ imported, total }: ImportProgress) =>
            setSubmitState({
              status: "migrating",
              step: `Importing ${imported.toLocaleString()} / ${total.toLocaleString()} documents…`,
            }),
        );
      }

      if (renaming) {
        // Rename path: no alias involved — the new collection has its own name.
        if (deleteOriginal) {
          setSubmitState({ status: "migrating", step: "Removing original collection…" });
          await deleteCollection(activeProfile, collection.name);
        }
        if (onRenamed) {
          onRenamed(newName);
        } else {
          onUpdated();
        }
        handleOpenChange(false);
      } else {
        // Schema-only migration path: delete original first (required so the alias
        // can reuse the original name), then point the alias at the new collection.
        if (deleteOriginal) {
          setSubmitState({ status: "migrating", step: "Removing original collection…" });
          await deleteCollection(activeProfile, collection.name);
        }

        setSubmitState({ status: "migrating", step: "Creating alias…" });
        try {
          await upsertAlias(activeProfile, collection.name, newName);
        } catch (aliasErr) {
          if (!deleteOriginal) {
            // Original still exists — can't alias with the same name.
            setSubmitState({
              status: "error",
              message: `Migration complete but alias could not be created: "${collection.name}" still exists. Check "Delete original and create alias" to enable alias creation, or create it manually. New collection: ${newName}`,
            });
            onUpdated();
            return;
          }
          throw aliasErr;
        }

        onUpdated();
        handleOpenChange(false);
      }
    } catch (err) {
      setSubmitState({
        status: "error",
        message:
          err instanceof TypesenseAuthError
            ? err.status === 401
              ? "Your Typesense API key is invalid."
              : "Your Typesense API key lacks the required permissions for this operation."
            : err instanceof Error
              ? err.message
              : String(err),
      });
    }
  }

  async function onSubmit(data: FormValues) {
    if (data.fields.length === 0) {
      form.setError("fields", { type: "manual", message: "At least one field is required" });
      return;
    }
    const renaming = data.collectionName !== collection.name;
    if (!renaming && changeType === "add-only") {
      await handleDirectPatch(data);
    } else {
      await handleMigration(data);
    }
  }

  const isSubmitting = submitState.status === "patching" || submitState.status === "migrating";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>Edit Schema</DialogTitle>
        </DialogHeader>

        {needsMigration && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {isRename && changeType !== "modifying"
                  ? "Rename requires data migration"
                  : isRename
                    ? "Rename + schema changes require data migration"
                    : "Destructive schema changes require data migration"}
              </p>
              <p className="text-amber-700 dark:text-amber-300 text-xs">
                {isRename
                  ? `All documents will be copied to "${watchedName}". Check the box to remove the original collection afterwards.`
                  : `A new collection will be created and documents migrated. Check the box below to delete the original and create a Typesense alias pointing to the new collection.`}
              </p>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={deleteOriginal}
                  onChange={(e) => setDeleteOriginal(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border accent-primary"
                />
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  {isRename
                    ? "Delete original collection after rename"
                    : "Delete original and create alias (required for alias to work)"}
                </span>
              </label>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="collectionName"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium w-24 shrink-0">Name</label>
                    <FormControl>
                      <Input className="font-mono" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage className="text-xs ml-28" />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Fields</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    append({
                      name: "",
                      type: "string",
                      facet: false,
                      optional: false,
                      index: true,
                      _originalName: undefined,
                    })
                  }
                  title="Add Field"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Name
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground w-36">
                          Type
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground w-16">
                          Facet
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground w-20">
                          Optional
                        </th>
                        <th className="px-3 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {fields.map((field, i) => {
                        const upd = watchedFields[i];
                        const orig = collection.fields.find(
                          (f) => f.name === (field._originalName ?? ""),
                        );
                        const isModified =
                          orig &&
                          (orig.type !== upd?.type ||
                            (orig.facet ?? false) !== upd?.facet ||
                            (orig.optional ?? false) !== upd?.optional ||
                            (orig.index ?? true) !== upd?.index ||
                            orig.name !== upd?.name);

                        return (
                          <tr
                            key={field.id}
                            className={cn(
                              "transition-colors",
                              isModified
                                ? "bg-amber-50/50 dark:bg-amber-950/20"
                                : "hover:bg-muted/20",
                            )}
                          >
                            <td className="px-3 py-1.5">
                              <FormField
                                control={form.control}
                                name={`fields.${i}.name`}
                                render={({ field: f }) => (
                                  <FormItem className="space-y-0">
                                    <FormControl>
                                      <Input
                                        placeholder="field_name"
                                        className="h-8 font-mono text-xs"
                                        {...f}
                                      />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                  </FormItem>
                                )}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <FormField
                                control={form.control}
                                name={`fields.${i}.type`}
                                render={({ field: f }) => (
                                  <FormItem className="space-y-0">
                                    <Select onValueChange={f.onChange} value={f.value}>
                                      <FormControl>
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {TYPESENSE_FIELD_TYPES.map((t) => (
                                          <SelectItem
                                            key={t}
                                            value={t}
                                            className="text-xs font-mono"
                                          >
                                            {t}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <FormField
                                control={form.control}
                                name={`fields.${i}.facet`}
                                render={({ field: f }) => (
                                  <Checkbox checked={f.value} onChange={f.onChange} label="Facet" />
                                )}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <FormField
                                control={form.control}
                                name={`fields.${i}.optional`}
                                render={({ field: f }) => (
                                  <Checkbox
                                    checked={f.value}
                                    onChange={f.onChange}
                                    label="Optional"
                                  />
                                )}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <button
                                type="button"
                                onClick={() => remove(i)}
                                className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                aria-label="Remove field"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {typeof form.formState.errors.fields?.message === "string" && (
              <p className="text-xs text-destructive">{form.formState.errors.fields.message}</p>
            )}

            {submitState.status === "migrating" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowRight className="h-4 w-4 animate-pulse" />
                {submitState.step}
              </div>
            )}

            {submitState.status === "error" && (
              <div>
                <p className="text-sm text-destructive">{submitState.message}</p>
                {(submitState.message.includes("API key is invalid") ||
                  submitState.message.includes("lacks the required permissions")) && (
                  <Link
                    href="/settings/connection"
                    className="inline-block text-xs underline underline-offset-2 text-primary mt-1"
                  >
                    Update API key in Settings
                  </Link>
                )}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !activeProfile}>
                {submitState.status === "patching"
                  ? "Updating…"
                  : submitState.status === "migrating"
                    ? "Migrating…"
                    : isRename && changeType === "modifying"
                      ? "Rename & Migrate"
                      : isRename
                        ? "Rename Collection"
                        : changeType === "modifying"
                          ? "Migrate & Update"
                          : "Update Schema"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
