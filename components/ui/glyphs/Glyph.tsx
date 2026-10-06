"use client";
/**
 * WS Glyphs (docs/design-system/GLYPHS.md): ícones próprios nascidos do monitor do logo. Variantes `outline`
 * (currentColor; navegação, botões, listas) e `clay` (carcaça --ws-ink, brilho, nós coloridos; heróis e estados vazios,
 * ≥ 32 px). O ícone nunca aparece sem rótulo (RF38.CA01): ou `decorative` (aria-hidden, o texto está ao lado) ou recebe
 * o rótulo i18n do catálogo (`labelKey`) como aria-label. Miolo SVG gerado em sprite.gen.ts (sem cor literal).
 */
import { useI18n } from "@/lib/i18n/useI18n";
import { cn } from "../cn";
import { GLYPHS, MOJIS, type GlyphName, type MojiName } from "./sprite.gen";

export interface GlyphProps {
  name: GlyphName;
  variant?: "outline" | "clay";
  /** px; mínimo 20 (outline) / 32 (clay) */
  size?: number;
  /** o texto ao lado já descreve o ícone */
  decorative?: boolean;
  /** rótulo alternativo (padrão: labelKey do catálogo) */
  label?: string;
  /** anel pulsando (só `notificacoes`) */
  live?: boolean;
  className?: string;
}

export function Glyph({ name, variant = "outline", size = 24, decorative = false, label, live = false, className }: GlyphProps) {
  const { t } = useI18n();
  const entry = GLYPHS[name];
  const title = label ?? t(entry.labelKey);
  return (
    <svg
      className={cn("ws-glyph shrink-0", className)}
      data-name={name}
      data-variant={variant}
      data-live={live || undefined}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: variant === "clay" ? entry.clay : entry.outline }}
    />
  );
}

export interface MojiProps {
  name: MojiName;
  size?: number;
  className?: string;
  decorative?: boolean;
}

/** WS Moji: rosto de monitor em sintaxe de terminal; sempre acompanhado de texto (o `face` é o alternativo). */
export function Moji({ name, size = 64, className, decorative = false }: MojiProps) {
  const { t } = useI18n();
  const entry = MOJIS[name];
  return (
    <svg
      className={cn("ws-moji shrink-0", className)}
      data-name={name}
      data-animated={entry.animated || undefined}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `${t(entry.labelKey)} ${entry.face}`}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: entry.svg }}
    />
  );
}

export { GLYPHS, MOJIS };
export type { GlyphName, MojiName };
export const GLYPH_NAMES = Object.keys(GLYPHS) as GlyphName[];
export const MOJI_NAMES = Object.keys(MOJIS) as MojiName[];
