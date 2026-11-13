"use client";
/** Ícones de estado de reserva (sempre acompanhados de texto; o ícone é reforço visual, `aria-hidden`). */
import { cn } from "@/components/ui";

export function LockIcon({ locked, className }: { locked: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cn("inline-block size-4 shrink-0 align-[-0.15em]", className)}>
      <rect x={3} y={7} width={10} height={7.5} rx={1.5} className="fill-current" />
      <path d={locked ? "M5.5 7 V5 a2.5 2.5 0 0 1 5 0 V7" : "M5.5 7 V5 a2.5 2.5 0 0 1 4.6 -1.3"} className="fill-none stroke-current" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

export function SparkMark({ className }: { className?: string }) {
  return <span aria-hidden className={cn("text-ws-ai-spark-ink", className)}>✦</span>;
}
