/**
 * Citação curta de um trecho da Memória (RF33.CA02/CA03): "Portaria 12/2025 — SECID, art. 3º". Vai no `MemoryHit.citation`
 * (contrato lido pela sessão do DECIA) e no rótulo dos resultados de `/memory`. É dado, não texto de interface: não traduz.
 */
import type { MemoryDocument } from "./types";

const MAX_SECTION = 48;

export function shorten(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

export function citationOf(doc: Pick<MemoryDocument, "ref" | "title" | "department">, section: string | null): string {
  const base = doc.ref?.trim() || doc.title.trim();
  const dept = doc.department ? ` — ${doc.department}` : "";
  const sec = section && section !== base ? `, ${shorten(section, MAX_SECTION)}` : "";
  return `${base}${dept}${sec}`;
}

/** Endereço do leitor da Memória com o trecho marcado (`/memory?doc=<id>&trecho=<início>-<fim>`). */
export function readerHref(docId: string, span?: { start: number; end: number }): string {
  const q = new URLSearchParams({ doc: docId });
  if (span) q.set("trecho", `${span.start}-${span.end}`);
  return `/memory?${q.toString()}`;
}

/** Lê `trecho=<início>-<fim>` da URL; inválido → null. */
export function parseSpan(value: string | null | undefined, bodyLength: number): { start: number; end: number } | null {
  const m = /^(\d{1,7})-(\d{1,7})$/.exec(value ?? "");
  if (!m) return null;
  const start = Number(m[1]);
  const end = Number(m[2]);
  return start < end && end <= bodyLength ? { start, end } : null;
}
