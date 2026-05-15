import type { Collection } from "@/lib/typesense-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fmt = new Intl.NumberFormat();

export function CollectionCard({ collection }: { collection: Collection }) {
  const { name, num_documents, fields, default_sorting_field } = collection;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{name}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {fmt.format(num_documents)} {num_documents === 1 ? "document" : "documents"}
        </p>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{fields.length} fields</Badge>
        {default_sorting_field && <Badge variant="outline">sort: {default_sorting_field}</Badge>}
      </CardContent>
    </Card>
  );
}
