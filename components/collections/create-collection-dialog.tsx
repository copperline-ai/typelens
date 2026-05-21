"use client";

import { useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Papa from "papaparse";
import { Plus, Trash2, Upload } from "lucide-react";
import { TYPESENSE_FIELD_TYPES, createCollection, importDocuments } from "@/lib/typesense-client";
import { inferFieldsFromRecords } from "@/lib/schema-utils";
import { useConnectionStore, selectActiveProfile } from "@/lib/stores/connection";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Schema ────────────────────────────────────────────────────────────────────

const fieldRowSchema = z.object({
  name: z.string().min(1, "Required"),
  type: z.enum(TYPESENSE_FIELD_TYPES),
  facet: z.boolean().default(false),
  optional: z.boolean().default(false),
  index: z.boolean().default(true),
});

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Required")
    .regex(
      /^[a-zA-Z_][a-zA-Z0-9_-]*$/,
      "Must start with a letter or _ and contain only letters, numbers, _ and -",
    ),
  default_sorting_field: z.string().optional(),
  fields: z.array(fieldRowSchema),
});

type FormValues = z.infer<typeof formSchema>;

// ── Sub-components ────────────────────────────────────────────────────────────

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

function FieldsTable({ form }: { form: ReturnType<typeof useForm<FormValues>> }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fields",
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Fields{" "}
          <a
            href="https://typesense.org/docs/30.2/api/collections.html#field-types"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-normal text-muted-foreground underline hover:text-foreground"
          >
            Learn more
          </a>
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() =>
            append({ name: "", type: "string", facet: false, optional: false, index: true })
          }
          title="Add Field"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
          No fields yet. Click "Add Field" to start.
        </p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
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
                {fields.map((field, i) => (
                  <tr key={field.id} className="hover:bg-muted/20 transition-colors">
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
                                  <SelectItem key={t} value={t} className="text-xs font-mono">
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
                          <Checkbox checked={f.value} onChange={f.onChange} label="Optional" />
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {form.formState.errors.fields?.root && (
        <p className="text-xs text-destructive">{form.formState.errors.fields.root.message}</p>
      )}
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

type Mode = "auto" | "manual" | "file";

type SubmitState =
  | { status: "idle" }
  | { status: "creating" }
  | { status: "importing"; total: number }
  | { status: "error"; message: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateCollectionDialog({ open, onOpenChange, onCreated }: Props) {
  const activeProfile = useConnectionStore(selectActiveProfile);
  const [mode, setMode] = useState<Mode>("auto");
  const [parsedRecords, setParsedRecords] = useState<Record<string, unknown>[]>([]);
  const [fileInfo, setFileInfo] = useState<{ name: string; count: number } | null>(null);
  const [importRecords, setImportRecords] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      default_sorting_field: "",
      fields: [],
    },
  });

  function resetDialog() {
    form.reset({ name: "", default_sorting_field: "", fields: [] });
    setMode("auto");
    setParsedRecords([]);
    setFileInfo(null);
    setImportRecords(false);
    setSubmitState({ status: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetDialog();
    onOpenChange(next);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      let records: Record<string, unknown>[] = [];

      if (file.name.endsWith(".jsonl") || file.name.endsWith(".ndjson")) {
        try {
          records = text
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => JSON.parse(line) as Record<string, unknown>);
        } catch {
          setSubmitState({ status: "error", message: "Failed to parse JSONL file." });
          return;
        }
      } else if (file.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            records = parsed as Record<string, unknown>[];
          } else if (typeof parsed === "object" && parsed !== null) {
            records = [parsed as Record<string, unknown>];
          }
        } catch {
          // fall back to JSONL in case the file contains newline-delimited JSON
          try {
            records = text
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => JSON.parse(line) as Record<string, unknown>);
          } catch {
            setSubmitState({ status: "error", message: "Failed to parse JSON file." });
            return;
          }
        }
      } else {
        const result = Papa.parse<Record<string, unknown>>(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
        });
        records = result.data;
      }

      if (records.length === 0) {
        setSubmitState({ status: "error", message: "No records found in file." });
        return;
      }

      setSubmitState({ status: "idle" });
      setParsedRecords(records);
      setFileInfo({ name: file.name, count: records.length });

      const inferred = inferFieldsFromRecords(records);
      const currentName = form.getValues("name");
      const currentSort = form.getValues("default_sorting_field");
      const inferredNames = new Set(inferred.map((f) => f.name));
      form.reset({
        name:
          currentName ||
          file.name.replace(/\.(jsonl|ndjson|json|csv)$/i, "").replace(/[^a-zA-Z0-9_-]/g, "_"),
        default_sorting_field: currentSort && inferredNames.has(currentSort) ? currentSort : "",
        fields: inferred,
      });
    };
    reader.readAsText(file);
  }

  async function onSubmit(data: FormValues) {
    if (!activeProfile) return;

    if (mode !== "auto" && data.fields.length === 0) {
      form.setError("fields", { type: "manual", message: "Add at least one field" });
      return;
    }

    const fields =
      mode === "auto"
        ? [{ name: ".*", type: "auto" }]
        : data.fields.map((f) => ({
            name: f.name,
            type: f.type,
            ...(f.facet ? { facet: true } : {}),
            ...(f.optional ? { optional: true } : {}),
            ...(!f.index ? { index: false } : {}),
          }));

    const schema = {
      name: data.name,
      fields,
      ...(data.default_sorting_field ? { default_sorting_field: data.default_sorting_field } : {}),
    };

    setSubmitState({ status: "creating" });
    try {
      await createCollection(activeProfile, schema);
    } catch (err) {
      setSubmitState({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    if (importRecords && parsedRecords.length > 0) {
      setSubmitState({ status: "importing", total: parsedRecords.length });
      let results;
      try {
        results = await importDocuments(activeProfile, data.name, parsedRecords);
      } catch (err) {
        setSubmitState({
          status: "error",
          message: `Collection created but import failed: ${err instanceof Error ? err.message : String(err)}`,
        });
        onCreated();
        return;
      }
      const failedResults = results.filter((r) => !r.success);
      if (failedResults.length > 0) {
        const succeeded = results.length - failedResults.length;
        const firstError = failedResults[0]?.error ?? "unknown error";
        setSubmitState({
          status: "error",
          message: `Collection created. ${succeeded.toLocaleString()} of ${results.length.toLocaleString()} records imported — ${failedResults.length.toLocaleString()} failed. First error: ${firstError}`,
        });
        onCreated();
        return;
      }
    }

    onCreated();
    handleOpenChange(false);
  }

  const isSubmitting = submitState.status === "creating" || submitState.status === "importing";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Collection</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {(["auto", "manual", "file"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors capitalize ${
                mode === m
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "auto" ? "Auto" : m === "manual" ? "Manual" : "File"}
            </button>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className={`grid grid-cols-1 gap-4 ${mode !== "auto" ? "sm:grid-cols-2" : ""}`}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection Name</FormLabel>
                    <FormControl>
                      <Input placeholder="my_collection" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {mode !== "auto" && (
                <FormField
                  control={form.control}
                  name="default_sorting_field"
                  render={({ field }) => {
                    const fieldNames = form
                      .watch("fields")
                      .map((f) => f.name)
                      .filter(Boolean);
                    return (
                      <FormItem>
                        <FormLabel>
                          Default Sort Field{" "}
                          <span className="text-muted-foreground font-normal">(optional)</span>{" "}
                          <a
                            href="https://typesense.org/docs/30.2/api/collections.html#schema-parameters"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-normal text-muted-foreground underline hover:text-foreground"
                          >
                            Learn more
                          </a>
                        </FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                          value={field.value || "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger className="font-mono">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__" className="text-muted-foreground italic">
                              None
                            </SelectItem>
                            {fieldNames.map((name) => (
                              <SelectItem key={name} value={name} className="font-mono">
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}
            </div>

            {mode === "auto" && (
              <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Auto schema detection</p>
                <p>
                  Typesense will automatically detect field types when documents are added. Every
                  field in your documents will be indexed for search and filtering.{" "}
                  <a
                    href="https://typesense.org/docs/30.2/api/collections.html#with-auto-schema-detection"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    Learn more
                  </a>
                </p>
              </div>
            )}

            {mode === "file" && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Upload File</label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    JSON, JSONL, NDJSON, or CSV — field names and types will be inferred from the
                    data
                  </p>
                </div>
                <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 cursor-pointer hover:border-muted-foreground/50 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {fileInfo
                      ? `${fileInfo.name} — ${fileInfo.count.toLocaleString()} records`
                      : "Click to choose a .json, .jsonl, .ndjson, or .csv file"}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.jsonl,.ndjson,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                {fileInfo && (
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={importRecords}
                      onChange={(e) => setImportRecords(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    Also import all {fileInfo.count.toLocaleString()} records into the collection
                  </label>
                )}
              </div>
            )}

            {mode !== "auto" && <FieldsTable form={form} />}

            {submitState.status === "error" && (
              <p className="text-sm text-destructive">{submitState.message}</p>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !activeProfile}>
                {submitState.status === "creating"
                  ? "Creating…"
                  : submitState.status === "importing"
                    ? `Importing ${submitState.total.toLocaleString()} records…`
                    : "Create Collection"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
