"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  deleteSynonym,
  listSynonyms,
  type SynonymDefinition,
  TypesenseAuthError,
  upsertSynonym,
} from "@/lib/typesense-client";
import type { Profile } from "@/lib/stores/connection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function normalizeTerms(value: string): string[] {
  return value
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);
}

export function slugifyId(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type SynonymType = "multi-way" | "one-way";

export function buildSynonymPayload(
  type: SynonymType,
  rootValue: string,
  termsValue: string,
  idValue = "",
) {
  const terms = normalizeTerms(termsValue);
  const root = rootValue.trim();
  const id = idValue.trim() || slugifyId(type === "one-way" ? root : (terms[0] ?? ""));

  if (!id || terms.length === 0 || (type === "one-way" && !root)) {
    throw new Error("Provide the required synonym fields before saving.");
  }

  return {
    id,
    body:
      type === "one-way"
        ? { root, synonyms: Array.from(new Set([root, ...terms])) }
        : { synonyms: terms },
  };
}

export function SynonymsSection({
  profile,
  collectionName,
}: {
  profile: Profile;
  collectionName: string;
}) {
  const [synonyms, setSynonyms] = useState<SynonymDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [type, setType] = useState<SynonymType>("one-way");
  const [idValue, setIdValue] = useState("");
  const [rootValue, setRootValue] = useState("");
  const [termsValue, setTermsValue] = useState("");

  async function loadSynonyms() {
    setLoading(true);
    setError(null);
    try {
      const result = await listSynonyms(profile, collectionName);
      setSynonyms(result.synonyms);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSynonyms();
  }, [profile, collectionName]);

  function resetForm() {
    setIdValue("");
    setRootValue("");
    setTermsValue("");
    setType("one-way");
    setFormOpen(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { id, body } = buildSynonymPayload(type, rootValue, termsValue, idValue);
      await upsertSynonym(profile, collectionName, id, body);
      await loadSynonyms();
      resetForm();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      await deleteSynonym(profile, collectionName, id);
      await loadSynonyms();
    } catch (err) {
      setError(err);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Synonym rules</p>
          <p className="text-xs text-muted-foreground">
            Handle equivalent terms, misspellings, and one-way expansions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setFormOpen((open) => !open)}>
          + Add Synonym
        </Button>
      </div>

      {formOpen && (
        <form className="rounded-lg border p-4 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="synonym-type">Type</Label>
            <select
              id="synonym-type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={type}
              onChange={(event) => setType(event.target.value as SynonymType)}
            >
              <option value="multi-way">Multi-way</option>
              <option value="one-way">One-way</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="synonym-id">Id</Label>
            <Input
              id="synonym-id"
              value={idValue}
              onChange={(event) => setIdValue(event.target.value)}
              placeholder="Auto-generated if left blank"
            />
          </div>

          {type === "one-way" && (
            <div className="grid gap-2">
              <Label htmlFor="synonym-root">Root term</Label>
              <Input
                id="synonym-root"
                value={rootValue}
                onChange={(event) => setRootValue(event.target.value)}
                placeholder="ipad"
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="synonym-terms">Terms</Label>
            <textarea
              id="synonym-terms"
              className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={termsValue}
              onChange={(event) => setTermsValue(event.target.value)}
              placeholder="iphone, apple phone, smartphone"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              Save Synonym
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {error instanceof TypesenseAuthError ? (
        <p className="text-xs text-destructive">
          {error.status === 401
            ? "Your Typesense API key is invalid."
            : "Your Typesense API key lacks the required permissions for synonyms."}
        </p>
      ) : error ? (
        <p className="text-xs text-destructive">
          {error instanceof Error ? error.message : String(error)}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading synonyms…</p>
      ) : synonyms.length === 0 ? (
        <p className="text-sm text-muted-foreground">No synonyms configured yet.</p>
      ) : (
        <div className="space-y-2">
          {synonyms.map((synonym) => {
            const kind = synonym.root ? "one-way" : "multi-way";

            return (
              <div
                key={synonym.id}
                className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm">{synonym.id}</span>
                    <Badge variant="outline">{kind}</Badge>
                    {synonym.root && <Badge variant="secondary">root: {synonym.root}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground break-words">
                    {synonym.synonyms.join(", ")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete synonym"
                  aria-label="Delete synonym"
                  disabled={deletingId === synonym.id}
                  onClick={() => void handleDelete(synonym.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
