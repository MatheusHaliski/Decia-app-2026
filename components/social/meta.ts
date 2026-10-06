/**
 * Metadados visuais da rede social: classes por tom (sempre token --ws-*), símbolos das ações (sempre acompanhados de
 * texto ou aria-label — nunca só ícone/cor, RF38.CA01) e chaves i18n. Os glifos oficiais (components/ui/glyphs) ainda não
 * têm curtir/comentar/salvar/compartilhar/remixar como Glyph; as reações qualitativas usam os WS Moji existentes.
 */
import type { MojiName } from "@/components/ui";
import type { Tone } from "@/lib/social/view-model";
import type { QualitativeReaction, ReactionType } from "@/lib/social/types";

export const TONE_SOFT: Record<Tone, string> = {
  neutral: "bg-ws-surface-2 text-ws-text-muted",
  accent: "bg-ws-accent-soft text-ws-accent-ink",
  success: "bg-ws-success-soft text-ws-success-ink",
  warning: "bg-ws-warning-soft text-ws-warning-ink",
  danger: "bg-ws-danger-soft text-ws-danger-ink",
  info: "bg-ws-info-soft text-ws-info-ink",
  spark: "bg-ws-ai-spark-soft text-ws-ai-spark-ink",
  red: "bg-ws-node-red-soft text-ws-node-red-ink",
  yellow: "bg-ws-node-yellow-soft text-ws-node-yellow-ink",
  green: "bg-ws-node-green-soft text-ws-node-green-ink",
  blue: "bg-ws-node-blue-soft text-ws-node-blue-ink",
  brown: "bg-ws-node-brown-soft text-ws-node-brown-ink",
  orange: "bg-ws-node-orange-soft text-ws-node-orange-ink",
};

/** Borda do card na cor do departamento (RF38.CA09). */
export const NODE_BORDER: Record<string, string> = {
  red: "border-ws-node-red", yellow: "border-ws-node-yellow", green: "border-ws-node-green", blue: "border-ws-node-blue", brown: "border-ws-node-brown", orange: "border-ws-node-orange",
};

export const ACTION_SYMBOL = {
  like: "♡", liked: "♥", comment: "❝", save: "☆", saved: "★", share: "⤴", remix: "⇄", delegate: "➜", giveBack: "↩", react: "✚", more: "⋯",
} as const;

export const REACTION_MOJI: Record<QualitativeReaction, MojiName> = { UTIL: "util", BEM_FUNDAMENTADO: "bem-fundamentado", INOVADOR: "inovador", CONFORME: "conforme" };
export const REACTION_SYMBOL: Record<ReactionType, string> = { CURTIR: "♥", UTIL: "✓", BEM_FUNDAMENTADO: "§", INOVADOR: "✦", CONFORME: "⚖" };

export const formatDay = (iso: string, intl: string) => new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso));
export const formatDateTime = (iso: string, intl: string) => new Intl.DateTimeFormat(intl, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
export function relativeTime(iso: string, now: Date, intl: string): string {
  const diff = (new Date(iso).getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(intl, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86_400), "day");
}
