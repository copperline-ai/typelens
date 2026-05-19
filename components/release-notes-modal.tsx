"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Release = {
  tag_name: string;
  name: string | null;
  body: string | null;
  published_at: string | null;
  html_url: string;
};

export function ReleaseNotesModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch("/api/releases")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch releases");
        return res.json() as Promise<Release[]>;
      })
      .then(setReleases)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to fetch releases"),
      )
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Release Notes</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 space-y-6 pr-1 py-2">
          {loading && <p className="text-sm text-muted-foreground">Loading releases…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!loading &&
            !error &&
            releases.map((release) => (
              <div key={release.tag_name} className="space-y-2 border-b pb-6 last:border-0">
                <div className="flex items-baseline justify-between gap-2">
                  <a
                    href={release.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold hover:underline"
                  >
                    {release.name || release.tag_name}
                  </a>
                  {release.published_at && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(release.published_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {release.body ? (
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                    {release.body}
                  </pre>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No release notes provided.</p>
                )}
              </div>
            ))}
          {!loading && !error && releases.length === 0 && (
            <p className="text-sm text-muted-foreground">No releases found.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
