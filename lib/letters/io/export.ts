/**
 * Exportação da peça (RF52.CA05): Markdown, HTML (escapado, com metadados e referências), texto e DOCX, mais a versão
 * para impressão (o navegador salva como PDF). Exportar não publica nem muda a peça. Blocos vazios (dicas de modelo)
 * não são exportados. Cada formato habilitado tem teste de ida e volta (`roundtrip.test.ts`).
 */
import type { LetterPiece } from "../pieces";
import { DOCX_MIME, exportDocx } from "./docx";
import { exportHtml } from "./html";
import { exportMarkdown, exportText } from "./markdown";
import type { ExportFormat } from "./model";

export type ExportablePiece = Pick<LetterPiece, "title" | "docType" | "genre" | "language" | "revision" | "updatedAt" | "blocks">;

/** Rótulos visíveis do cabeçalho de metadados (vêm do i18n da tela; os valores já traduzidos). */
export interface ExportLabels {
  docType: string;
  docTypeValue: string;
  genre: string;
  genreValue: string;
  language: string;
  languageValue: string;
  revision: string;
  updated: string;
  updatedValue: string;
  references: string;
}

export const MIME: Readonly<Record<ExportFormat, string>> = {
  md: "text/markdown;charset=utf-8",
  html: "text/html;charset=utf-8",
  txt: "text/plain;charset=utf-8",
  docx: DOCX_MIME,
};

/** Nome de arquivo seguro a partir do título (sem acentos, sem separadores de caminho). */
export function fileNameFor(title: string, ext: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
  return `${base || "peca"}.${ext}`;
}

export interface ExportedFile {
  fileName: string;
  mime: string;
  data: string | Uint8Array;
}

export async function exportPiece(piece: ExportablePiece, format: ExportFormat, labels: ExportLabels): Promise<ExportedFile> {
  const fileName = fileNameFor(piece.title, format);
  switch (format) {
    case "md":
      return { fileName, mime: MIME.md, data: exportMarkdown(piece) };
    case "txt":
      return { fileName, mime: MIME.txt, data: exportText(piece) };
    case "html":
      return { fileName, mime: MIME.html, data: exportHtml(piece, labels) };
    case "docx":
      return { fileName, mime: MIME.docx, data: await exportDocx(piece) };
  }
}

/** Versão para impressão: o mesmo HTML escapado (sem script), com CSS de página. */
export const printHtml = (piece: ExportablePiece, labels: ExportLabels) => exportHtml(piece, labels);
