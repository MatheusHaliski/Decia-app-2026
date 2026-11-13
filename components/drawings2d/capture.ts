/**
 * "Capturar PNG" da vista 2D (RF74): SVG autossuficiente (lib/drawings2d/export) → imagem → canvas na escala pedida →
 * PNG. Cores vêm dos tokens do tema resolvidos agora (`getComputedStyle`); fundo do tema ou transparente.
 */
import type { ExportColors } from "@/lib/drawings2d/export";
import { TONE, tokenColor } from "./tokens";

export type CaptureBackground = "tema" | "transparente";

/** Cores resolvidas do tema atual; token ilegível cai em `currentColor` (preto na imagem isolada). */
export function exportColors(background: CaptureBackground): ExportColors {
  const pick = (cssVar: string) => tokenColor(cssVar) || "currentColor";
  return {
    background: background === "tema" ? tokenColor("--ws-surface-1") || null : null,
    tone: { estrutura: pick(TONE.estrutura.cssVar), esquadria: pick(TONE.esquadria.cssVar), anotacao: pick(TONE.anotacao.cssVar), referencia: pick(TONE.referencia.cssVar) },
  };
}

export async function svgToPng(svg: string, width: number, height: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("SVG não carregou"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponível");
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG não gerado"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
