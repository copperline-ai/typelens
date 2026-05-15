import { AsyncBoundary, PageSkeleton } from "@/components/async-boundary";

export default function ConnectionSettingsPage() {
  return (
    <AsyncBoundary loading={<PageSkeleton />}>
      <div>
        <h1 className="text-2xl font-semibold mb-2">Connection Settings</h1>
        <p className="text-sm text-muted-foreground">
          Add and manage your Typesense connection profiles.
        </p>
      </div>
    </AsyncBoundary>
  );
}
