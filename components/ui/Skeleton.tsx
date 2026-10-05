import { cn } from "./cn";

/** Esqueleto de carregamento (shimmer por token, parado com reduced-motion). Sempre dentro de um aria-busy. */
export function Skeleton({ className, lines }: { className?: string; lines?: number }) {
  if (lines && lines > 1) {
    return (
      <div className={cn("grid gap-2", className)} aria-hidden>
        {Array.from({ length: lines }).map((_, i) => (
          <span key={i} className={cn("ws-skeleton block h-3 rounded-[var(--ws-radius-sm)]", i === lines - 1 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    );
  }
  return <span aria-hidden className={cn("ws-skeleton block rounded-[var(--ws-radius-md)]", className)} />;
}
