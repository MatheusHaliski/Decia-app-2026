"use client";
/**
 * Janela segmentada: duas metades lado a lado (telas largas) ou empilhadas (celular), com divisória arrastável e operável por
 * teclado (role="separator", setas ← →, Home/End). A proporção fica na preferência local do navegador (conveniência por pessoa).
 */
import { useCallback, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/components/ui";

const KEY = "ws.mesa.split";
const MIN = 0.3;
const MAX = 0.75;
const clamp = (v: number) => Math.max(MIN, Math.min(MAX, v));

function readRatio(fallback: number): number {
  try {
    const v = Number(window.localStorage.getItem(KEY));
    return v >= MIN && v <= MAX ? v : fallback;
  } catch {
    return fallback;
  }
}

export interface SplitViewProps {
  left: ReactNode;
  right: ReactNode;
  /** rótulo da divisória (leitores de tela) */
  label: string;
  initialRatio?: number;
  className?: string;
}

export function SplitView({ left, right, label, initialRatio = 0.58, className }: SplitViewProps) {
  const box = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(() => (typeof window === "undefined" ? initialRatio : readRatio(initialRatio)));
  const save = useCallback((v: number) => {
    const r = clamp(Math.round(v * 100) / 100);
    setRatio(r);
    try {
      window.localStorage.setItem(KEY, String(r));
    } catch {
      /* armazenamento indisponível: só não lembra */
    }
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    const move = (ev: PointerEvent) => save((ev.clientX - rect.left) / rect.width);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.1 : 0.05;
    if (e.key === "ArrowLeft") save(ratio - step);
    else if (e.key === "ArrowRight") save(ratio + step);
    else if (e.key === "Home") save(MIN);
    else if (e.key === "End") save(MAX);
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={box}
      className={cn("grid gap-[var(--ws-space-4)] lg:grid-cols-[minmax(0,var(--ws-split))_0.75rem_minmax(0,1fr)] lg:gap-0", className)}
      style={{ "--ws-split": `${ratio * 100}%` } as CSSProperties}
      data-split={ratio}
    >
      <div className="min-w-0 lg:pr-[var(--ws-space-3)]">{left}</div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        aria-valuemin={MIN * 100}
        aria-valuemax={MAX * 100}
        aria-valuenow={Math.round(ratio * 100)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onKeyDown={onKey}
        className="group hidden cursor-col-resize justify-center outline-none lg:flex"
      >
        <span className="h-full w-1 rounded-[var(--ws-radius-pill)] bg-ws-border transition-colors group-hover:bg-ws-accent group-focus-visible:bg-ws-accent group-focus-visible:[box-shadow:var(--ws-focus-ring)]" />
      </div>
      <div className="min-w-0 lg:sticky lg:top-[var(--ws-space-4)] lg:max-h-[calc(100dvh-var(--ws-space-8))] lg:self-start lg:overflow-auto lg:pl-[var(--ws-space-3)]">{right}</div>
    </div>
  );
}
