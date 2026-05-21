"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateCollectionSchema, type Collection } from "@/lib/typesense-client";
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

// ── Model presets ─────────────────────────────────────────────────────────────

const LOCAL_MODELS = [
  { value: "ts/all-MiniLM-L12-v2", label: "all-MiniLM-L12-v2 (local · 384d)" },
  {
    value: "ts/paraphrase-multilingual-mpnet-base-v2",
    label: "paraphrase-multilingual (local · 768d)",
  },
  { value: "ts/e5-small", label: "e5-small (local · 384d)" },
] as const;

const REMOTE_MODELS = [
  { value: "openai/text-embedding-3-small", label: "OpenAI text-embedding-3-small (1536d)" },
  { value: "openai/text-embedding-3-large", label: "OpenAI text-embedding-3-large (3072d)" },
  { value: "openai/text-embedding-ada-002", label: "OpenAI text-embedding-ada-002 (1536d)" },
  { value: "cohere/embed-english-v3.0", label: "Cohere embed-english-v3.0 (1024d)" },
  { value: "google/embedding-001", label: "Google embedding-001 (768d)" },
] as const;

// ── Zod schemas ───────────────────────────────────────────────────────────────

const fieldNameSchema = z
  .string()
  .min(1, "Required")
  .regex(
    /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    "Must start with a letter or _ and contain only letters, numbers, _",
  );

const autoSchema = z.object({
  mode: z.literal("auto"),
  fieldName: fieldNameSchema,
  sourceFields: z
    .array(z.object({ name: z.string().min(1, "Select a field") }))
    .min(1, "Add at least one source field"),
  model: z.string().min(1, "Select a model"),
  apiKey: z.string().optional(),
});

const manualSchema = z.object({
  mode: z.literal("manual"),
  fieldName: fieldNameSchema,
  numDim: z.coerce
    .number()
    .int("Must be a whole number")
    .min(1, "Must be at least 1")
    .max(65535, "Maximum 65535 dimensions"),
});

type AutoValues = z.infer<typeof autoSchema>;
type ManualValues = z.infer<typeof manualSchema>;
type Mode = "auto" | "manual";

// ── Main dialog ───────────────────────────────────────────────────────────────

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string };

interface Props {
  collection: Collection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

export function AddEmbeddingDialog({ collection, open, onOpenChange, onAdded }: Props) {
  const activeProfile = useConnectionStore(selectActiveProfile);
  const [mode, setMode] = useState<Mode>("auto");
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const stringFields = collection.fields.filter(
    (f) => f.type === "string" || f.type === "string[]",
  );

  // Two separate forms — one per mode — avoids discriminated union TypeScript pain with useFieldArray
  const autoForm = useForm<AutoValues>({
    resolver: zodResolver(autoSchema),
    defaultValues: {
      mode: "auto",
      fieldName: "embedding",
      sourceFields: stringFields.slice(0, 1).map((f) => ({ name: f.name })),
      model: "ts/all-MiniLM-L12-v2",
      apiKey: "",
    },
  });

  const manualForm = useForm<ManualValues>({
    resolver: zodResolver(manualSchema),
    defaultValues: {
      mode: "manual",
      fieldName: "embedding",
      numDim: 1536,
    },
  });

  const {
    fields: sourceFieldArray,
    append: appendSource,
    remove: removeSource,
  } = useFieldArray({
    control: autoForm.control,
    name: "sourceFields",
  });

  const watchedModel = autoForm.watch("model");
  const isLocal = watchedModel?.startsWith("ts/");

  function handleOpenChange(next: boolean) {
    if (!next) {
      autoForm.reset();
      manualForm.reset();
      setSubmitState({ status: "idle" });
    }
    onOpenChange(next);
  }

  async function handleAutoSubmit(data: AutoValues) {
    if (!activeProfile) return;
    setSubmitState({ status: "submitting" });
    try {
      const modelConfig: Record<string, string> = { model_name: data.model };
      if (!isLocal && data.apiKey) modelConfig.api_key = data.apiKey;

      await updateCollectionSchema(activeProfile, collection.name, [
        {
          name: data.fieldName,
          type: "float[]",
          optional: true,
          embed: {
            from: data.sourceFields.map((f) => f.name),
            model_config: modelConfig,
          },
        },
      ]);
      onAdded();
      handleOpenChange(false);
    } catch (err) {
      setSubmitState({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleManualSubmit(data: ManualValues) {
    if (!activeProfile) return;
    setSubmitState({ status: "submitting" });
    try {
      await updateCollectionSchema(activeProfile, collection.name, [
        { name: data.fieldName, type: "float[]", num_dim: data.numDim, optional: true },
      ]);
      onAdded();
      handleOpenChange(false);
    } catch (err) {
      setSubmitState({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const isSubmitting = submitState.status === "submitting";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>Add Embedding Field</DialogTitle>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {(["auto", "manual"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                mode === m
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "auto" ? "Auto-embed" : "Manual vector"}
            </button>
          ))}
        </div>

        {mode === "auto" ? (
          <Form {...autoForm}>
            <form onSubmit={autoForm.handleSubmit(handleAutoSubmit)} className="space-y-4">
              <FormField
                control={autoForm.control}
                name="fieldName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Embedding field name</FormLabel>
                    <FormControl>
                      <Input placeholder="embedding" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>Source fields to embed</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => appendSource({ name: stringFields[0]?.name ?? "" })}
                    title="Add source field"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {stringFields.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No string fields found in this collection. Auto-embedding requires at least one
                    string or string[] field.
                  </p>
                )}
                {sourceFieldArray.map((f, i) => (
                  <div key={f.id} className="flex gap-2">
                    <FormField
                      control={autoForm.control}
                      name={`sourceFields.${i}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-1 space-y-0">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="font-mono text-xs">
                                <SelectValue placeholder="Select a field…" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {stringFields.map((sf) => (
                                <SelectItem
                                  key={sf.name}
                                  value={sf.name}
                                  className="font-mono text-xs"
                                >
                                  {sf.name}
                                  <span className="ml-2 text-muted-foreground">{sf.type}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => removeSource(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1.5"
                      aria-label="Remove source field"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {autoForm.formState.errors.sourceFields && (
                  <p className="text-xs text-destructive">
                    {autoForm.formState.errors.sourceFields.message}
                  </p>
                )}
              </div>

              <FormField
                control={autoForm.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Embedding model</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="font-mono text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                          Local — no API key needed
                        </div>
                        {LOCAL_MODELS.map((m) => (
                          <SelectItem key={m.value} value={m.value} className="text-xs">
                            {m.label}
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground mt-1">
                          Remote
                        </div>
                        {REMOTE_MODELS.map((m) => (
                          <SelectItem key={m.value} value={m.value} className="text-xs">
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isLocal && (
                <FormField
                  control={autoForm.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="sk-…"
                          className="font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground mt-1">
                        Stored in the Typesense collection schema. Not stored by TypeLens.
                      </p>
                    </FormItem>
                  )}
                />
              )}

              {submitState.status === "error" && (
                <p className="text-sm text-destructive">{submitState.message}</p>
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
                  {isSubmitting ? "Adding…" : "Add Embedding Field"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <Form {...manualForm}>
            <form onSubmit={manualForm.handleSubmit(handleManualSubmit)} className="space-y-4">
              <FormField
                control={manualForm.control}
                name="fieldName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Embedding field name</FormLabel>
                    <FormControl>
                      <Input placeholder="embedding" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={manualForm.control}
                name="numDim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of dimensions</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1536" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">
                      Common values: 1536 (OpenAI ada-002 / 3-small), 3072 (OpenAI 3-large), 768
                      (BERT-base), 384 (MiniLM)
                    </p>
                  </FormItem>
                )}
              />

              <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Manual vector field</p>
                <p className="mt-1">
                  A <code className="font-mono">float[]</code> field will be added. You are
                  responsible for providing pre-computed vector values when inserting documents.
                </p>
              </div>

              {submitState.status === "error" && (
                <p className="text-sm text-destructive">{submitState.message}</p>
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
                  {isSubmitting ? "Adding…" : "Add Embedding Field"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
