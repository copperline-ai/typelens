import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/stores/connection";

export function ConnectingState({
  profile,
  fullPage = false,
  className,
}: {
  profile?: Profile | null;
  fullPage?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center justify-center", fullPage ? "h-full" : "py-16", className)}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 animate-pulse rounded-full bg-yellow-500" />
          <p className="text-sm text-muted-foreground">Connecting…</p>
        </div>
        {profile && (
          <p className="text-xs text-muted-foreground">
            {profile.protocol}://{profile.host}:{profile.port}
          </p>
        )}
      </div>
    </div>
  );
}
