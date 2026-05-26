"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useMobile } from "@/lib/hooks/use-mobile";

type Release = {
  tag_name: string;
  name: string | null;
  body: string | null;
  published_at: string | null;
  html_url: string;
};

function ReleaseNotesList({
  releases,
  loading,
  error,
}: {
  releases: Release[];
  loading: boolean;
  error: string | null;
}) {
  return (
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
              <div className="text-xs text-muted-foreground [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1 [&_h3]:font-semibold [&_h3]:mb-0.5 [&_p]:mb-2 [&_p]:leading-relaxed [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-0.5 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:overflow-x-auto [&_pre]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_hr]:border-border [&_hr]:my-2">
                <ReactMarkdown>{release.body}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No release notes provided.</p>
            )}
          </div>
        ))}
      {!loading && !error && releases.length === 0 && (
        <p className="text-sm text-muted-foreground">No releases found.</p>
      )}
    </div>
  );
}

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
  const isMobile = useMobile();

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

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] flex flex-col px-4 pb-6">
          <DrawerHeader className="text-left px-0">
            <DrawerTitle>Release Notes</DrawerTitle>
          </DrawerHeader>
          <ReleaseNotesList releases={releases} loading={loading} error={error} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[80vh]" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Release Notes</DialogTitle>
        </DialogHeader>
        <ReleaseNotesList releases={releases} loading={loading} error={error} />
      </DialogContent>
    </Dialog>
  );
}
