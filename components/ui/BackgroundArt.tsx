"use client";
import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * BackgroundArt (docs/design-system/backgrounds/README.md): arte de fundo do shell/Mesa pelo catálogo tipado. Até o dono
 * entregar as artes finais, `placeholder: true` aponta para os SVGs gerados só com tokens em public/backgrounds/placeholders.
 * Texto sobre a arte sempre dentro de um scrim (`tone` decide a tinta). `skin` cobre as 4 skins da Mesa (TAXONOMIA DeskSkin).
 */
export type BackgroundTone = "light" | "dark";
export type WsThemeId = "claro" | "escuro" | "contraste" | "terminal";

export interface WsBackground {
  id: string;
  labelKey: string;
  file: string;
  thumb: string;
  tone: BackgroundTone;
  recommendedTheme: WsThemeId;
  placeholder: boolean;
}

export const WS_BACKGROUNDS: readonly WsBackground[] = [
  { id: "sem-arte", labelKey: "background.sem-arte", file: "", thumb: "sem-arte.png", tone: "light", recommendedTheme: "claro", placeholder: false },
  { id: "malha-laranja", labelKey: "background.malha-laranja", file: "malha-laranja.svg", thumb: "malha-laranja.png", tone: "dark", recommendedTheme: "escuro", placeholder: true },
  { id: "nos-multicolor", labelKey: "background.nos-multicolor", file: "nos-multicolor.svg", thumb: "nos-multicolor.png", tone: "light", recommendedTheme: "claro", placeholder: true },
  { id: "terminal-noturno", labelKey: "background.terminal-noturno", file: "terminal-noturno.svg", thumb: "terminal-noturno.png", tone: "dark", recommendedTheme: "terminal", placeholder: true },
  { id: "disco-creme", labelKey: "background.disco-creme", file: "disco-creme.svg", thumb: "disco-creme.png", tone: "light", recommendedTheme: "claro", placeholder: true },
  { id: "blueprint-de-rede", labelKey: "background.blueprint-de-rede", file: "blueprint-de-rede.svg", thumb: "blueprint-de-rede.png", tone: "dark", recommendedTheme: "escuro", placeholder: true },
  { id: "grade-minima", labelKey: "background.grade-minima", file: "grade-minima.svg", thumb: "grade-minima.png", tone: "light", recommendedTheme: "contraste", placeholder: true },
] as const;

export type WsBackgroundId = (typeof WS_BACKGROUNDS)[number]["id"];

export function backgroundUrl(bg: WsBackground): string | null {
  if (bg.id === "sem-arte") return null;
  return bg.placeholder ? `/backgrounds/placeholders/${bg.id}.svg` : `/backgrounds/${bg.file}`;
}
export const backgroundById = (id: string) => WS_BACKGROUNDS.find((b) => b.id === id) ?? WS_BACKGROUNDS[0]!;

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
}

export function BackgroundArt({ backgroundId = "sem-arte", skin, children, className, minHeight = "12rem" }: BackgroundArtProps) {
  const bg = backgroundById(backgroundId);
  const url = backgroundUrl(bg);
  return (
    <div
      data-background={bg.id}
      data-tone={bg.tone}
      className={cn("relative overflow-hidden rounded-[var(--ws-radius-lg)] border border-ws-border", skin ? DESK_SKIN_CLASS[skin] : "bg-ws-surface-0", className)}
      style={{ minHeight, backgroundImage: url ? `url("${url}")` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {children ? (
        <div className={cn("relative h-full p-[var(--ws-space-4)]", url && (bg.tone === "dark" ? "ws-scrim text-ws-cream" : "ws-glass"))}>{children}</div>
      ) : null}
    </div>
  );
}
