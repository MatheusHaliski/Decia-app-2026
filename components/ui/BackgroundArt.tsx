"use client";
import type { ReactNode } from "react";
import { AURA_ARTS } from "./backgrounds/aura.gen";
import { cn } from "./cn";

/**
 * BackgroundArt (docs/design-system/backgrounds/README.md; RF23/RF3, D-34): arte de fundo do shell/Mesa pelo catálogo tipado.
 * As 6 artes finais do dono ("Aura Geometry", public/brand/RF23) entram como `aura-geometry-01…06` com variantes otimizadas
 * (scripts/brand/gerar-fundos.mjs → public/brand/backgrounds/<id>-{1280,640}.webp + thumb) e tom medido pela luminância
 * média: dark → scrim escuro + texto creme; light → vidro claro + texto do tema. Os placeholders SVG só com tokens continuam
 * como opções/fallback. `skin` cobre as 4 skins da Mesa (TAXONOMIA DeskSkin).
 */
export type BackgroundTone = "light" | "dark";
export type WsThemeId = "claro" | "escuro" | "contraste" | "terminal";

export interface WsBackground {
  id: string;
  labelKey: string;
  descriptionKey?: string;
  /** arte final (webp 1280) relativa a /public; vazio = sem fundo */
  file: string;
  /** variante 640 px (srcset) */
  file640?: string;
  /** miniatura 320×180 para o seletor */
  thumb: string;
  tone: BackgroundTone;
  /** 0–100 (artes reais, medido); placeholders não têm */
  luminance?: number;
  recommendedTheme: WsThemeId;
  /** true = SVG gerado só com tokens (até a arte final); false = arte do dono */
  placeholder: boolean;
  /** origem da arte (rastreabilidade) */
  source?: string;
}

const AURA_THEME: Record<string, WsThemeId> = { "aura-geometry-01": "escuro", "aura-geometry-02": "escuro", "aura-geometry-03": "terminal", "aura-geometry-04": "claro", "aura-geometry-05": "terminal", "aura-geometry-06": "contraste" };

const AURA: WsBackground[] = AURA_ARTS.map((a) => ({
  id: a.id,
  labelKey: `background.${a.id}`,
  descriptionKey: `background.${a.id}.description`,
  file: `/brand/backgrounds/${a.id}-1280.webp`,
  file640: `/brand/backgrounds/${a.id}-640.webp`,
  thumb: `/brand/backgrounds/${a.id}-thumb.webp`,
  tone: a.tone,
  luminance: a.luminance,
  recommendedTheme: AURA_THEME[a.id] ?? (a.tone === "dark" ? "escuro" : "claro"),
  placeholder: false,
  source: a.source,
}));

const PLACEHOLDER = (id: string, tone: BackgroundTone, recommendedTheme: WsThemeId): WsBackground => ({
  id, labelKey: `background.${id}`, file: `/backgrounds/placeholders/${id}.svg`, thumb: `/backgrounds/placeholders/${id}.svg`, tone, recommendedTheme, placeholder: true,
});

export const WS_BACKGROUNDS: readonly WsBackground[] = [
  { id: "sem-arte", labelKey: "background.sem-arte", file: "", thumb: "", tone: "light", recommendedTheme: "claro", placeholder: false },
  ...AURA,
  PLACEHOLDER("malha-laranja", "dark", "escuro"),
  PLACEHOLDER("nos-multicolor", "light", "claro"),
  PLACEHOLDER("terminal-noturno", "dark", "terminal"),
  PLACEHOLDER("disco-creme", "light", "claro"),
  PLACEHOLDER("blueprint-de-rede", "dark", "escuro"),
  PLACEHOLDER("grade-minima", "light", "contraste"),
];

export type WsBackgroundId = (typeof WS_BACKGROUNDS)[number]["id"];

export function backgroundUrl(bg: WsBackground): string | null {
  return bg.file || null;
}
export const backgroundById = (id: string) => WS_BACKGROUNDS.find((b) => b.id === id) ?? WS_BACKGROUNDS[0]!;
/** `image-set()` para o navegador escolher 640/1280 conforme largura e densidade. */
export function backgroundImageCss(bg: WsBackground): string | undefined {
  if (!bg.file) return undefined;
  if (bg.file640) return `image-set(url("${bg.file640}") 1x, url("${bg.file}") 2x)`;
  return `url("${bg.file}")`;
}

/** Skins da Mesa (RF22, RF38.CA08): padrões só com tokens (gradientes e grades), sem imagem. */
export const DESK_SKIN_CLASS: Record<"papel" | "cortica" | "blueprint" | "papel-timbrado", string> = {
  papel: "bg-ws-surface-1",
  cortica: "bg-ws-node-brown-soft [background-image:radial-gradient(var(--ws-node-brown)_0.6px,transparent_0.6px)] [background-size:9px_9px]",
  blueprint: "bg-ws-node-blue-soft [background-image:linear-gradient(var(--ws-border)_1px,transparent_1px),linear-gradient(90deg,var(--ws-border)_1px,transparent_1px)] [background-size:24px_24px]",
  "papel-timbrado": "bg-ws-surface-1 border-t-8 border-t-ws-accent",
};

export interface BackgroundArtProps {
  backgroundId?: string;
  skin?: keyof typeof DESK_SKIN_CLASS;
  children?: ReactNode;
  className?: string;
  /** altura mínima da área */
  minHeight?: string;
  /** sem scrim/vidro em volta do conteúdo (quem chama cuida do contraste) */
  bare?: boolean;
}

export function BackgroundArt({ backgroundId = "sem-arte", skin, children, className, minHeight = "12rem", bare = false }: BackgroundArtProps) {
  const bg = backgroundById(backgroundId);
  const image = backgroundImageCss(bg);
  return (
    <div
      data-background={bg.id}
      data-tone={bg.tone}
      className={cn("relative overflow-hidden rounded-[var(--ws-radius-lg)] border border-ws-border", skin ? DESK_SKIN_CLASS[skin] : "bg-ws-surface-0", className)}
      style={{ minHeight, backgroundImage: image, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {children ? (
        <div className={cn("relative h-full p-[var(--ws-space-4)]", !bare && image && (bg.tone === "dark" ? "ws-scrim text-ws-cream" : "ws-glass text-ws-text"))}>{children}</div>
      ) : null}
    </div>
  );
}
