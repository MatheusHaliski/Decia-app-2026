/**
 * Prévia do produto (janela "Prévia"): decide COMO mostrar uma entrega, sempre do jeito mais seguro.
 *  • imagem (png, jpg, webp, gif) e svg → `<img>` a partir do conteúdo autenticado (svg NUNCA inline: como imagem não roda script);
 *  • página web (.html anexado) → iframe isolado, `sandbox` sem scripts por padrão; scripts só por botão e só para conteúdo da
 *    própria nuvem (o iframe nunca ganha `allow-same-origin`, então continua com origem opaca);
 *  • link https da tarefa → iframe com `sandbox` vazio (site externo nunca roda script aqui) e `referrerpolicy=no-referrer`;
 *  • planilha .xlsx → "fotografia" do topo (lib/cardviewer/xlsx.ts); .xlsm (macro) é recusada;
 *  • o resto → metadados e "abrir".
 * O MIME declarado e a extensão precisam concordar para imagem/svg/html; na dúvida, vira "outro".
 */
import { extensionOf, isHttpsUrl } from "./files";

export type PreviewKind = "IMAGEM" | "SVG" | "HTML" | "URL" | "XLSX" | "MACRO" | "OUTRO";

const RASTER_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const RASTER_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function previewKindOf(name: string | undefined, mime: string | undefined): PreviewKind {
  const ext = extensionOf(name);
  const m = (mime ?? "").toLowerCase().split(";")[0]!.trim();
  if (ext === "xlsm" || m === "application/vnd.ms-excel.sheet.macroenabled.12") return "MACRO";
  if (ext === "xlsx" && (!m || m === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || m === "application/octet-stream" || m === "application/zip")) return "XLSX";
  if (ext === "svg" && (!m || m === "image/svg+xml")) return "SVG";
  if (RASTER_EXT.has(ext) && (!m || RASTER_MIME.has(m))) return "IMAGEM";
  if (!ext && RASTER_MIME.has(m)) return "IMAGEM";
  if ((ext === "html" || ext === "htm") && (!m || m === "text/html")) return "HTML";
  return "OUTRO";
}

/** Fonte de uma prévia: anexo da nuvem (API), link da tarefa ou exemplo DEMO do laboratório. */
export type PreviewSource = "NUVEM" | "LINK" | "DEMO";

export interface PreviewCandidate {
  id: string;
  name: string;
  kind: PreviewKind;
  source: PreviewSource;
  mime?: string;
  size?: number;
  date?: string;
  attachmentId?: string;
  url?: string;
  /** só DEMO: conteúdo gerado no navegador */
  demo?: () => Promise<Blob>;
}

/** Candidatos de prévia a partir dos anexos e dos links da tarefa; imagens e páginas primeiro (o "produto compilado"). */
export function previewCandidates(
  attachments: readonly { id?: string; fileName?: string; mimeType?: string; sizeBytes?: number; createdAt?: string; available?: boolean }[],
  links: readonly { label?: string; url?: string }[] = [],
): PreviewCandidate[] {
  const order: Record<PreviewKind, number> = { IMAGEM: 0, SVG: 0, HTML: 1, XLSX: 2, URL: 3, MACRO: 4, OUTRO: 5 };
  const out: PreviewCandidate[] = [];
  for (const a of attachments) {
    if (!a.id || a.available === false) continue;
    out.push({ id: `a:${a.id}`, name: a.fileName || a.id, kind: previewKindOf(a.fileName, a.mimeType), source: "NUVEM", mime: a.mimeType, size: a.sizeBytes, date: a.createdAt, attachmentId: a.id });
  }
  const seen = new Set<string>();
  for (const l of links) {
    if (!isHttpsUrl(l.url) || seen.has(l.url)) continue;
    seen.add(l.url);
    out.push({ id: `u:${l.url}`, name: l.label?.trim() || l.url, kind: "URL", source: "LINK", url: l.url });
  }
  return out.sort((a, b) => order[a.kind] - order[b.kind]);
}

/**
 * `sandbox` do iframe. Página da nuvem: sem nada (nem scripts, nem formulários, nem popups) até a pessoa permitir scripts — e aí
 * só `allow-scripts`, nunca `allow-same-origin` (origem opaca: sem cookies, sem armazenamento, sem acesso à página do app).
 * Site externo: sempre vazio.
 */
export function iframeSandbox(source: PreviewSource, allowScripts: boolean): string {
  return source !== "LINK" && allowScripts ? "allow-scripts" : "";
}

/** Zoom da imagem: "ajustar" ou um fator entre 10 % e 800 %. */
export type Zoom = "fit" | number;
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 8;
export function stepZoom(z: Zoom, dir: 1 | -1, fitScale = 1): number {
  const base = z === "fit" ? fitScale : z;
  const next = dir > 0 ? base * 1.25 : base / 1.25;
  return Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next)) * 100) / 100;
}
