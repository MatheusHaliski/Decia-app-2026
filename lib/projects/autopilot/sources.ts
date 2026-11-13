/**
 * Entrada do Autopiloto (RF30): texto colado ou arquivo .txt, .eml, .md ou .pdf lido NO NAVEGADOR — nada é enviado a servidor.
 * Limite de tamanho do arquivo e do texto lido; .txt e .md em UTF-8 (com recuo para Windows-1252, comum em documentos do
 * governo); .eml pelo leitor MIME (`eml.ts`); .pdf pelo leitor de texto (`pdf.ts`), que recusa PDF cifrado ou sem camada de texto.
 */
import { emlToText, parseEml } from "./eml";
import { browserInflate, extractPdfText, type Inflate } from "./pdf";

export const SOURCE_KINDS = ["COLAR", "TXT", "EML", "MD", "PDF"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const AUTOPILOT_LIMITS = { fileBytes: 5 * 1024 * 1024, textChars: 100_000 } as const;
export const ACCEPTED_FILES = ".txt,.eml,.md,.markdown,.pdf,text/plain,text/markdown,message/rfc822,application/pdf";

export type ReadFailure = "FORMATO" | "GRANDE_DEMAIS" | "VAZIO" | "PDF_SEM_TEXTO" | "PDF_CIFRADO" | "PDF_INVALIDO";
export type ReadResult =
  | { ok: true; text: string; kind: SourceKind; pages?: number; truncated: boolean }
  | { ok: false; reason: ReadFailure };

export function sourceKindOf(fileName: string, mime = ""): Exclude<SourceKind, "COLAR"> | null {
  const ext = /\.([a-z0-9]+)$/i.exec(fileName)?.[1]?.toLowerCase() ?? "";
  if (ext === "pdf" || mime === "application/pdf") return "PDF";
  if (ext === "eml" || mime === "message/rfc822") return "EML";
  if (ext === "md" || ext === "markdown" || mime === "text/markdown") return "MD";
  if (ext === "txt" || mime === "text/plain") return "TXT";
  return null;
}

/** UTF-8 (estrito) e, se não for, Windows-1252; sem BOM. */
export function decodeText(bytes: Uint8Array): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder("windows-1252").decode(bytes);
  }
  return text.replace(/^﻿/, "");
}

/** Markdown → texto simples: tira a marcação de título, ênfase, links e código, mantém as listas (são entregas). */
export function markdownToText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(?<![\w*])\*(?!\s)([^*\n]+?)\*(?!\w)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*([-*_])\1{2,}\s*$/gm, "");
}

function finish(text: string, kind: SourceKind, pages?: number): ReadResult {
  const clean = text.trim();
  if (!clean) return { ok: false, reason: kind === "PDF" ? "PDF_SEM_TEXTO" : "VAZIO" };
  const truncated = clean.length > AUTOPILOT_LIMITS.textChars;
  return { ok: true, text: truncated ? clean.slice(0, AUTOPILOT_LIMITS.textChars) : clean, kind, pages, truncated };
}

/** Lê os bytes de um arquivo de demanda (já no navegador). */
export async function readDemandBytes(fileName: string, bytes: Uint8Array, mime = "", inflate: Inflate = browserInflate): Promise<ReadResult> {
  const kind = sourceKindOf(fileName, mime);
  if (!kind) return { ok: false, reason: "FORMATO" };
  if (bytes.length > AUTOPILOT_LIMITS.fileBytes) return { ok: false, reason: "GRANDE_DEMAIS" };
  if (!bytes.length) return { ok: false, reason: "VAZIO" };
  if (kind === "PDF") {
    const r = await extractPdfText(bytes, inflate);
    if (!r.ok) return { ok: false, reason: r.reason === "CIFRADO" ? "PDF_CIFRADO" : r.reason === "NAO_E_PDF" ? "PDF_INVALIDO" : "PDF_SEM_TEXTO" };
    return finish(r.text, "PDF", r.pages);
  }
  if (kind === "EML") return finish(emlToText(parseEml(bytes)), "EML");
  const text = decodeText(bytes);
  return finish(kind === "MD" ? markdownToText(text) : text, kind);
}

/** Bytes de um `File`/`Blob` (com recuo para `FileReader` nos navegadores e ambientes sem `arrayBuffer()`). */
export async function fileBytes(file: Blob): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === "function") return new Uint8Array(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
