import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-6xl font-bold text-muted-foreground/30">401</p>
      <h1 className="text-xl font-semibold">Unauthorized</h1>
      <p className="text-sm text-muted-foreground">You need to be signed in to access this page.</p>
      <Button asChild variant="outline" size="sm">
        <Link href="/login">Go to Login</Link>
      </Button>
    </div>
  );
}
