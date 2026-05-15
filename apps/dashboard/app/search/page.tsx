import { AsyncBoundary, PageSkeleton } from "@/components/async-boundary";

export default function SearchPage() {
  return (
    <AsyncBoundary loading={<PageSkeleton />}>
      <div>
        <h1 className="text-2xl font-semibold mb-2">Search</h1>
        <p className="text-sm text-muted-foreground">
          Run searches across your collections. Connect to a Typesense instance first.
        </p>
      </div>
    </AsyncBoundary>
  );
}
