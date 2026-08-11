import { cn } from "@/lib/utils";
import { WalletCards } from "lucide-react";

/** App wordmark — a small accent tile + the "Fluxo" wordmark. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/25">
        <WalletCards className="size-4" aria-hidden />
      </span>
      <span className="font-display text-lg font-medium tracking-tight">
        Fluxo
      </span>
    </span>
  );
}
