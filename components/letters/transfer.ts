/**
 * Apoio das telas de importação/exportação do Letters: baixar arquivo, abrir a versão para impressão e montar os
 * rótulos traduzidos do cabeçalho de metadados.
 */
import type { ExportablePiece, ExportedFile, ExportLabels } from "@/lib/letters/io/export";

type T = (key: string, vars?: Record<string, string | number>) => string;

export function saveFile(file: ExportedFile) {
  const blob = new Blob([typeof file.data === "string" ? file.data : new Uint8Array(file.data)], { type: file.mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.fileName;
  a.rel = "noopener";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Abre a versão para impressão numa aba (o navegador oferece "Salvar como PDF"); com a janela bloqueada, baixa o HTML. */
export function openPrintVersion(html: string, fileName: string): "aberta" | "baixada" {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const w = typeof window.open === "function" ? window.open(url, "_blank") : null;
  if (w) {
    w.addEventListener("load", () => {
      w.focus();
      w.print();
    }, { once: true });
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return "aberta";
  }
  URL.revokeObjectURL(url);
  saveFile({ fileName, mime: "text/html;charset=utf-8", data: html });
  return "baixada";
}

export function exportLabels(piece: ExportablePiece, t: T, intl: string): ExportLabels {
  return {
    docType: t("letters.io.meta.docType"),
    docTypeValue: t(`letters.docType.${piece.docType}`),
    genre: t("letters.io.meta.genre"),
    genreValue: t(`letters.genre.${piece.genre}`),
    language: t("letters.io.meta.language"),
    languageValue: t(`letters.language.${piece.language}`),
    revision: t("letters.io.meta.revision"),
    updated: t("letters.io.meta.updated"),
    updatedValue: new Intl.DateTimeFormat(intl, { dateStyle: "long", timeStyle: "short" }).format(new Date(piece.updatedAt)),
    references: t("letters.io.meta.references"),
  };
}

/** Lê o arquivo escolhido como bytes (File.arrayBuffer, com recuo para FileReader). */
export async function fileBytes(file: Blob): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === "function") return new Uint8Array(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(new Uint8Array(r.result as ArrayBuffer));
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(file);
  });
}
