/**
 * Ingestão local na Memória DEMO (RF33.CA01): colar texto ou enviar arquivo .txt/.md, com tipo, unidade, exercício e classe de
 * acesso. Nada sai do navegador: o documento entra só no índice desta aba (recarregar volta ao corpus de exemplo). O texto é
 * guardado como veio (só BOM retirado e quebras de linha unificadas), para que a citação continue sendo trecho EXATO.
 */
import { MEMORY_KINDS, type MemoryKind } from "./search";
import { readerHref } from "./citation";
import type { AccessClass, MemoryDocument } from "./types";

export const INGEST_LIMITS = { titleMin: 3, titleMax: 160, bodyMax: 200_000, fileMaxBytes: 400_000, yearMin: 1990, yearMax: 2100, departmentMax: 24 } as const;
export const INGEST_EXTENSIONS = [".txt", ".md", ".markdown"] as const;

export interface IngestInput {
  title: string;
  kind: MemoryKind;
  department: string | null;
  year: number | null;
  accessClass: AccessClass;
  body: string;
  /** nome do arquivo enviado (para conferir a extensão); ausente = texto colado */
  fileName?: string | null;
}

export type IngestField = "title" | "kind" | "department" | "year" | "accessClass" | "body" | "file";
export type IngestErrorCode = "OBRIGATORIO" | "CURTO" | "LONGO" | "INVALIDO" | "FORMATO" | "CLASSE_NAO_PERMITIDA";

export type IngestResult =
  | { ok: true; doc: MemoryDocument }
  | { ok: false; errors: Partial<Record<IngestField, IngestErrorCode>> };

/** Texto pronto para indexar: sem BOM e com `\n` como única quebra de linha. */
export function normalizeIngestText(raw: string): string {
  return raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
}

export const hasAllowedExtension = (fileName: string) => INGEST_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext));

/** Identificador estável a partir do título (o repositório acrescenta o contador da aba). */
export function slugOf(title: string): string {
  return title.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "documento";
}

export function validateIngest(input: IngestInput, allowedClasses: readonly AccessClass[]): Partial<Record<IngestField, IngestErrorCode>> {
  const errors: Partial<Record<IngestField, IngestErrorCode>> = {};
  const title = input.title.trim();
  if (!title) errors.title = "OBRIGATORIO";
  else if (title.length < INGEST_LIMITS.titleMin) errors.title = "CURTO";
  else if (title.length > INGEST_LIMITS.titleMax) errors.title = "LONGO";
  if (!(MEMORY_KINDS as readonly string[]).includes(input.kind)) errors.kind = "INVALIDO";
  const dept = input.department?.trim() ?? "";
  if (dept && (dept.length > INGEST_LIMITS.departmentMax || !/^[\p{L}\d][\p{L}\d -]*$/u.test(dept))) errors.department = "INVALIDO";
  if (input.year !== null && (!Number.isInteger(input.year) || input.year < INGEST_LIMITS.yearMin || input.year > INGEST_LIMITS.yearMax)) errors.year = "INVALIDO";
  if (!allowedClasses.includes(input.accessClass)) errors.accessClass = "CLASSE_NAO_PERMITIDA";
  if (input.fileName != null && !hasAllowedExtension(input.fileName)) errors.file = "FORMATO";
  const body = normalizeIngestText(input.body);
  if (!body.trim()) errors.body = "OBRIGATORIO";
  else if (body.length > INGEST_LIMITS.bodyMax) errors.body = "LONGO";
  return errors;
}

/** Valida e monta o documento (o id vem de quem guarda, para não colidir entre ingestões da mesma aba). */
export function buildIngestedDoc(
  input: IngestInput,
  ctx: { id: string; addedBy: string | null; now: Date; allowedClasses: readonly AccessClass[] },
): IngestResult {
  const errors = validateIngest(input, ctx.allowedClasses);
  if (Object.keys(errors).length) return { ok: false, errors };
  const department = input.department?.trim() ? input.department.trim().toUpperCase() : null;
  return {
    ok: true,
    doc: {
      id: ctx.id,
      kind: input.kind,
      origin: "INGESTAO",
      title: input.title.trim(),
      department,
      year: input.year,
      date: ctx.now.toISOString().slice(0, 10),
      accessClass: input.accessClass,
      href: readerHref(ctx.id),
      body: normalizeIngestText(input.body),
      addedBy: ctx.addedBy,
    },
  };
}
