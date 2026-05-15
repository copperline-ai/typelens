import { AsyncBoundary, PageSkeleton } from "@/components/async-boundary";

export default function CollectionsPage() {
  return (
    <AsyncBoundary loading={<PageSkeleton />}>
      <div>
        <h1 className="text-2xl font-semibold mb-2">Collections</h1>
        <p className="text-sm text-muted-foreground">
          Manage your Typesense collections here. Connect to a Typesense instance first.
        </p>
      </div>
    </AsyncBoundary>
  );
}
