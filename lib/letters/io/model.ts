/**
 * Importação e exportação do Letters (RF52.CA04, CA05, CA07; RF70.CA05, CA06 no que toca ao Letters): tipos comuns,
 * limites e a normalização final dos blocos lidos. Tudo roda no navegador; nada lido é executado nem renderizado como
 * HTML (o editor mostra o texto em campos de texto). O relatório de fidelidade lista o que foi descartado, aproximado
 * ou achatado ANTES do aceite — nada é aplicado à peça sem confirmação.
 */
import { MAX_BLOCK_CHARS } from "../pieces";
import type { BlockKind, DocType, LetterBlock, TextGenre, TextLanguage } from "../types";

export const IMPORT_FORMATS = ["txt", "md", "html", "docx"] as const;
export type ImportFormat = (typeof IMPORT_FORMATS)[number];
export const EXPORT_FORMATS = ["md", "html", "txt", "docx"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const IMPORT_LIMITS = {
  /** tamanho do arquivo recebido */
  maxBytes: 8 * 1024 * 1024,
  /** blocos resultantes */
  maxBlocks: 3_000,
  /** caracteres somados dos blocos */
  maxChars: 1_500_000,
} as const;

/** Tipo da perda (RF70.CA06): descartado (some), aproximado (vira algo parecido) ou achatado (estrutura vira texto). */
export type LossKind = "DESCARTADO" | "APROXIMADO" | "ACHATADO";

export type LossCode =
  | "FORMATACAO_CARACTERE"
  | "FORMATACAO_PARAGRAFO"
  | "LINK"
  | "IMAGEM"
  | "TABELA"
  | "CODIGO"
  | "TITULO_NIVEL"
  | "LISTA_NUMERADA"
  | "LISTA_ANINHADA"
  | "HTML_EMBUTIDO"
  | "SCRIPT"
  | "ESTILO"
  | "MIDIA_EMBUTIDA"
  | "FORMULARIO"
  | "NOTA_RODAPE"
  | "COMENTARIO"
  | "REVISAO_RASTREADA"
  | "CABECALHO_RODAPE"
  | "MACRO"
  | "QUEBRA"
  | "METADADO"
  | "BLOCO_LONGO"
  | "CAIXA_TEXTO"
  | "CAMPO";

export const LOSS_KIND: Readonly<Record<LossCode, LossKind>> = {
  FORMATACAO_CARACTERE: "ACHATADO",
  FORMATACAO_PARAGRAFO: "ACHATADO",
  LINK: "APROXIMADO",
  IMAGEM: "DESCARTADO",
  TABELA: "ACHATADO",
  CODIGO: "ACHATADO",
  TITULO_NIVEL: "APROXIMADO",
  LISTA_NUMERADA: "APROXIMADO",
  LISTA_ANINHADA: "ACHATADO",
  HTML_EMBUTIDO: "DESCARTADO",
  SCRIPT: "DESCARTADO",
  ESTILO: "DESCARTADO",
  MIDIA_EMBUTIDA: "DESCARTADO",
  FORMULARIO: "DESCARTADO",
  NOTA_RODAPE: "DESCARTADO",
  COMENTARIO: "DESCARTADO",
  REVISAO_RASTREADA: "APROXIMADO",
  CABECALHO_RODAPE: "DESCARTADO",
  MACRO: "DESCARTADO",
  QUEBRA: "DESCARTADO",
  METADADO: "DESCARTADO",
  BLOCO_LONGO: "APROXIMADO",
  CAIXA_TEXTO: "ACHATADO",
  CAMPO: "APROXIMADO",
};

export interface FidelityLoss {
  code: LossCode;
  kind: LossKind;
  count: number;
}

/** Acumulador de perdas (conta ocorrências por código). */
export class LossLog {
  private readonly counts = new Map<LossCode, number>();
  add(code: LossCode, n = 1) {
    if (n > 0) this.counts.set(code, (this.counts.get(code) ?? 0) + n);
  }
  list(): FidelityLoss[] {
    return [...this.counts].map(([code, count]) => ({ code, kind: LOSS_KIND[code], count }));
  }
}

export type DraftBlock = Omit<LetterBlock, "id" | "hintKey">;

/** Metadados que o próprio exportador grava e o importador sabe ler de volta. */
export interface DocMeta {
  title?: string;
  docType?: DocType;
  genre?: TextGenre;
  language?: TextLanguage;
}

export interface ImportedDocument {
  format: ImportFormat;
  fileName: string;
  /** codificação usada para ler o texto (DOCX: utf-8 do XML) */
  encoding: "utf-8" | "windows-1252";
  meta: DocMeta;
  blocks: DraftBlock[];
  losses: FidelityLoss[];
  /** contagens para o relatório */
  stats: { blocks: number; chars: number; byKind: Partial<Record<BlockKind, number>> };
}

export type ImportRejection =
  | "VAZIO"
  | "GRANDE_DEMAIS"
  | "FORMATO_NAO_SUPORTADO"
  | "TIPO_DIVERGENTE"
  | "TEXTO_INVALIDO"
  | "BINARIO"
  | "DOCX_INVALIDO"
  | "DOCX_CRIPTOGRAFADO"
  | "DOCX_MACROS"
  | "XML_MALFORMADO"
  | "CONTEUDO_EXCESSIVO"
  | "SEM_CONTEUDO"
  | "LEITOR_INDISPONIVEL";

export type ImportResult = { ok: true; doc: ImportedDocument } | { ok: false; reason: ImportRejection; detail?: string };

/* ── Normalização comum ────────────────────────────────────────────────────────────────────────────────── */

const REFERENCES_HEADING = /^\s*(\d+(\.\d+)*\.?\s+)?(refer[eê]ncias|bibliografia|references|referencias|bibliography)\b/i;
export const isReferencesHeading = (text: string) => REFERENCES_HEADING.test(text);

/**
 * Passo final de todo importador: descarta blocos vazios, transforma o que vem depois do título
 * "Referências" em bloco REFERENCIAS, parte blocos maiores que o teto do editor (com aviso) e confere os limites.
 */
export function finalizeBlocks(raw: readonly DraftBlock[], losses: LossLog): { ok: true; blocks: DraftBlock[] } | { ok: false; reason: ImportRejection } {
  const merged: DraftBlock[] = [];
  let inRefs = false;
  for (const b0 of raw) {
    const text = b0.text.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/^\n+|\n+$/g, "");
    if (!text.trim()) continue;
    let b: DraftBlock = { ...b0, text };
    if (b.kind === "TITULO") {
      inRefs = isReferencesHeading(b.text);
      b = { kind: "TITULO", level: b.level ?? 2, text: b.text.replace(/\s*\n\s*/g, " ") };
    } else if (inRefs && b.kind !== "CITACAO") {
      b = { kind: "REFERENCIAS", text: b.text };
    }
    const prev = merged[merged.length - 1];
    // o que vem depois de "Referências" vira UM bloco de referências (uma por linha)
    if (prev && prev.kind === "REFERENCIAS" && b.kind === "REFERENCIAS") {
      prev.text = `${prev.text}\n${b.text}`;
      continue;
    }
    merged.push(b);
  }
  const out: DraftBlock[] = [];
  for (const b of merged) {
    if (b.text.length <= MAX_BLOCK_CHARS) {
      out.push(b);
      continue;
    }
    losses.add("BLOCO_LONGO");
    let rest = b.text;
    while (rest.length > MAX_BLOCK_CHARS) {
      let cut = rest.lastIndexOf("\n", MAX_BLOCK_CHARS);
      if (cut < MAX_BLOCK_CHARS / 2) cut = rest.lastIndexOf(" ", MAX_BLOCK_CHARS);
      if (cut < MAX_BLOCK_CHARS / 2) cut = MAX_BLOCK_CHARS;
      out.push({ ...b, text: rest.slice(0, cut).trimEnd() });
      rest = rest.slice(cut).trimStart();
    }
    if (rest) out.push({ ...b, text: rest });
  }
  if (!out.length) return { ok: false, reason: "SEM_CONTEUDO" };
  const chars = out.reduce((s, b) => s + b.text.length, 0);
  if (out.length > IMPORT_LIMITS.maxBlocks || chars > IMPORT_LIMITS.maxChars) return { ok: false, reason: "CONTEUDO_EXCESSIVO" };
  return { ok: true, blocks: out };
}

export function statsOf(blocks: readonly DraftBlock[]): ImportedDocument["stats"] {
  const byKind: Partial<Record<BlockKind, number>> = {};
  for (const b of blocks) byKind[b.kind] = (byKind[b.kind] ?? 0) + 1;
  return { blocks: blocks.length, chars: blocks.reduce((s, b) => s + b.text.length, 0), byKind };
}

export const clampLevel = (n: number, losses: LossLog): 1 | 2 | 3 => {
  if (n > 3) losses.add("TITULO_NIVEL");
  return (n <= 1 ? 1 : n === 2 ? 2 : 3) as 1 | 2 | 3;
};
