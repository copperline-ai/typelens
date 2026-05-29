import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AddDocumentButton({
  onClick,
  disabled = false,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      title="Add document"
      aria-label="Add document"
    >
      <Plus className="h-4 w-4" />
    </Button>
  );
}
