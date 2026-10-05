"use client";
import * as RTo from "@radix-ui/react-toast";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/useI18n";
import { cn } from "./cn";
import { Moji } from "./glyphs/Glyph";

/** Toast (radix): tons sucesso · erro · aviso · ia · info com borda por token; região aria-live; fecha com Esc/swipe. */
export type ToastTone = "sucesso" | "erro" | "aviso" | "ia" | "info";
export interface ToastInput { title: string; description?: string; tone?: ToastTone; duration?: number }
interface ToastItem extends ToastInput { id: number }

const Ctx = createContext<{ toast: (t: ToastInput) => void } | null>(null);

const TONE: Record<ToastTone, string> = {
  sucesso: "border-l-ws-success", erro: "border-l-ws-danger", aviso: "border-l-ws-warning", ia: "border-l-ws-ai-spark", info: "border-l-ws-info",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const { t } = useI18n();
  const toast = useCallback((input: ToastInput) => setItems((l) => [...l.slice(-3), { ...input, id: Date.now() + Math.random() }]), []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <Ctx.Provider value={value}>
      <RTo.Provider swipeDirection="right" label={t("toast.region")}>
        {children}
        {items.map((it) => (
          <RTo.Root
            key={it.id}
            duration={it.duration ?? 6000}
            onOpenChange={(o) => { if (!o) setItems((l) => l.filter((x) => x.id !== it.id)); }}
            className={cn("flex items-start gap-3 rounded-[var(--ws-radius-md)] border border-ws-border border-l-4 bg-ws-surface-1 p-3 text-ws-text shadow-ws-2", TONE[it.tone ?? "info"])}
          >
            <Moji name={it.tone === "erro" ? "erro" : it.tone === "sucesso" ? "ok" : it.tone === "ia" ? "inovador" : "util"} size={28} decorative />
            <div className="min-w-0 flex-1">
              <RTo.Title className="text-[length:var(--ws-text-body-sm)] font-semibold">{it.title}</RTo.Title>
              {it.description ? <RTo.Description className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{it.description}</RTo.Description> : null}
            </div>
            <RTo.Close aria-label={t("common.close")} className="cursor-pointer rounded px-1 text-ws-text-muted hover:text-ws-text focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]">×</RTo.Close>
          </RTo.Root>
        ))}
        <RTo.Viewport className="fixed bottom-[calc(var(--ws-shell-bottomnav)+var(--ws-space-3))] right-[var(--ws-space-3)] z-[var(--ws-z-toast)] flex w-[min(92vw,22rem)] flex-col gap-2 outline-none lg:bottom-[var(--ws-space-4)]" />
      </RTo.Provider>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast fora do ToastProvider");
  return ctx;
}
