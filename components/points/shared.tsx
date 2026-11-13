"use client";
/**
 * Peças comuns às telas de DECIA Points, Loja, Balcão e Chancelas: selo DEMO com a explicação, montagem só no cliente (os dados DEMO
 * têm datas relativas ao agora), formatação de pontos e datas, chave de idempotência por ação e o rótulo dos eventos do razão.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Badge, Glyph, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";

/** O conteúdo DEMO é montado só no cliente: evita divergência de hidratação. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Selo DEMO do cabeçalho (os dados vivem só nesta aba do navegador; a API ainda não existe). */
export function DemoBadge({ hintKey = "points.demoHint" }: { hintKey?: string }) {
  const { t } = useI18n();
  return <Badge tone="neutral" title={t(hintKey)}>{t("points.demo")}</Badge>;
}

/** Aviso DEMO em texto (o título do selo não chega a quem usa só o teclado). */
export function DemoNote({ hintKey = "points.demoHint", className }: { hintKey?: string; className?: string }) {
  const { t } = useI18n();
  return <p className={cn("text-[length:var(--ws-text-caption)] text-ws-text-muted", className)}>{t(hintKey)}</p>;
}

export const formatNumber = (n: number, intl: string) => new Intl.NumberFormat(intl).format(n);
export const formatSigned = (n: number, intl: string) => new Intl.NumberFormat(intl, { signDisplay: "exceptZero" }).format(n);
export const formatDate = (iso: string, intl: string) => new Intl.DateTimeFormat(intl, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(iso));
export const formatDateTime = (iso: string, intl: string) => new Intl.DateTimeFormat(intl, { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
export const formatMonth = (month: string, intl: string) => new Intl.DateTimeFormat(intl, { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));

/** Valor em DECIA Points com o glifo (o número sempre em texto). */
export function Dp({ value, signed = false, className }: { value: number; signed?: boolean; className?: string }) {
  const { intl } = useI18n();
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap font-semibold", className)}>
      <Glyph name="decia-points" size={16} decorative />
      <span className="tabular-nums">{signed ? formatSigned(value, intl) : formatNumber(value, intl)}</span>
      <span className="text-ws-text-muted">DP</span>
    </span>
  );
}

let keySeq = 0;
/** Chave de idempotência de uma ação (uma por abertura de confirmação). */
export function newActionKey(prefix: string): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return `${prefix}-${Date.now().toString(36)}-${(++keySeq).toString(36)}-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Texto ✦ da IA simulada: sempre marcado e na cor da faísca. */
export function AiText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("text-ws-ai-spark-ink", className)}>
      <span aria-hidden>✦ </span>
      {children}
    </span>
  );
}
