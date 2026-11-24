/**
 * Leitura e escrita de Markdown e de texto puro (RF52.CA04/CA05). O mesmo leitor de linhas serve aos dois:
 * - Markdown: títulos `#`/sublinhados, listas, citações `>`, cercas de código, tabelas, front matter e marcação em linha;
 * - Texto: parágrafos separados por linha em branco, títulos sublinhados (`===`, `---`, `~~~`), listas `- ` e citações `> `.
 * A marcação em linha que o editor não guarda (negrito, itálico, código, links, imagens, HTML) é removida e contada
 * como perda de fidelidade; o texto visível nunca é descartado em silêncio. HTML embutido nunca é interpretado.
 */
import { DOC_TYPES, TEXT_GENRES, TEXT_LANGUAGES, type DocType, type TextGenre, type TextLanguage } from "../types";
import { clampLevel, isReferencesHeading, LossLog, type DocMeta, type DraftBlock } from "./model";
import type { ExportablePiece } from "./export";

export interface ParsedText {
  meta: DocMeta;
  blocks: DraftBlock[];
  losses: LossLog;
}

const REF_MARKER = /^\s*<!--\s*letters:referencias\s*-->\s*$/i;
const FRONT_KEYS: Record<string, keyof DocMeta> = { title: "title", titulo: "title", "título": "title", tipo: "docType", doctype: "docType", genero: "genre", "gênero": "genre", genre: "genre", idioma: "language", language: "language" };

function readFrontMatter(lines: string[], meta: DocMeta, losses: LossLog): number {
  if (lines[0]?.trim() !== "---") return 0;
  const end = lines.findIndex((l, i) => i > 0 && (l.trim() === "---" || l.trim() === "..."));
  if (end < 0) return 0;
  for (const line of lines.slice(1, end)) {
    const m = /^\s*([^:#]+?)\s*:\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    const key = FRONT_KEYS[m[1]!.toLowerCase()];
    const value = m[2]!.replace(/^["']|["']$/g, "");
    if (key === "title" && value) meta.title = value;
    else if (key === "docType" && (DOC_TYPES as readonly string[]).includes(value)) meta.docType = value as DocType;
    else if (key === "genre" && (TEXT_GENRES as readonly string[]).includes(value)) meta.genre = value as TextGenre;
    else if (key === "language" && (TEXT_LANGUAGES as readonly string[]).includes(value)) meta.language = value as TextLanguage;
    else if (!/^(revis[aã]o|revision|atualizado|updated|gerador|generator)$/i.test(m[1]!)) losses.add("METADADO");
  }
  return end + 1;
}

/** Marcação em linha do Markdown → texto simples (contando o que se perdeu). */
export function stripInline(s: string, losses: LossLog): string {
  let out = s;
  const count = (re: RegExp, code: Parameters<LossLog["add"]>[0], replace: string | ((...m: string[]) => string)) => {
    let n = 0;
    out = out.replace(re, (...m: string[]) => {
      n++;
      return typeof replace === "string" ? replace : replace(...m);
    });
    losses.add(code, n);
  };
  // escapes viram marcadores temporários para não serem lidos como marcação
  const escaped: string[] = [];
  out = out.replace(/\\([\\`*_{}[\]()#+\-.!|<>~=])/g, (_, c: string) => `\u0000${escaped.push(c) - 1}\u0000`);
  count(/<script\b[\s\S]*?<\/script\s*>/gi, "SCRIPT", "");
  count(/<style\b[\s\S]*?<\/style\s*>/gi, "ESTILO", "");
  count(/`([^`]+)`/g, "FORMATACAO_CARACTERE", (_m, a) => a!);
  count(/!\[([^\]]*)\]\([^)]*\)/g, "IMAGEM", "");
  count(/\[([^\]]+)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g, "LINK", (_m, text, url) => (text === url ? text! : `${text} (${url})`));
  count(/<(https?:\/\/[^>\s]+)>/g, "LINK", (_m, url) => url!);
  count(/<\/?[A-Za-z][^>]*>/g, "HTML_EMBUTIDO", "");
  count(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "FORMATACAO_CARACTERE", (_m, _d, a) => a!);
  count(/~~(?=\S)([\s\S]*?\S)~~/g, "FORMATACAO_CARACTERE", (_m, a) => a!);
  count(/(^|[^\w*])\*(?=\S)([^*]*?\S)\*(?![\w*])/g, "FORMATACAO_CARACTERE", (_m, pre, a) => `${pre}${a}`);
  count(/(^|[^\w])_(?=\S)([^_]*?\S)_(?!\w)/g, "FORMATACAO_CARACTERE", (_m, pre, a) => `${pre}${a}`);
  // eslint-disable-next-line no-control-regex -- devolve os caracteres escapados guardados acima
  return out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => escaped[Number(i)] ?? "");
}

type Open = { kind: "PARAGRAFO" | "LISTA" | "CITACAO" | "REFERENCIAS"; lines: string[] } | null;

/** Lê Markdown (`mode = "md"`) ou texto puro (`mode = "txt"`). */
export function parseLines(src: string, mode: "md" | "txt"): ParsedText {
  const losses = new LossLog();
  const meta: DocMeta = {};
  const md = mode === "md";
  const lines = src.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: DraftBlock[] = [];
  let open: Open = null;
  let refsNext = false;
  let tableOpen = false;
  const inline = (s: string) => (md ? stripInline(s, losses) : s);

  const flush = () => {
    if (open && open.lines.length) blocks.push({ kind: open.kind, text: open.lines.join("\n") });
    if (open?.kind === "REFERENCIAS") refsNext = false;
    open = null;
    tableOpen = false;
  };
  const push = (kind: NonNullable<Open>["kind"], line: string) => {
    if (open?.kind !== kind) {
      flush();
      open = { kind, lines: [] };
    }
    open!.lines.push(line);
  };

  let i = md ? readFrontMatter(lines, meta, losses) : 0;
  for (; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim()) {
      flush();
      continue;
    }
    if (md && REF_MARKER.test(line)) {
      flush();
      refsNext = true;
      continue;
    }
    if (md && /^\s*<!--[\s\S]*?-->\s*$/.test(line)) {
      losses.add("COMENTARIO");
      continue;
    }
    const fence = md ? /^\s*(```+|~~~+)/.exec(line) : null;
    if (fence) {
      flush();
      const close = fence[1]!;
      const body: string[] = [];
      for (i++; i < lines.length && !lines[i]!.trim().startsWith(close); i++) body.push(lines[i]!);
      losses.add("CODIGO");
      if (body.join("").trim()) blocks.push({ kind: "PARAGRAFO", text: body.join("\n") });
      continue;
    }
    const atx = md ? /^\s{0,3}(#{1,6})\s+(.*?)(\s+#+)?\s*$/.exec(line) : null;
    if (atx) {
      flush();
      blocks.push({ kind: "TITULO", level: clampLevel(atx[1]!.length, losses), text: inline(atx[2]!) });
      continue;
    }
    // título sublinhado: a linha anterior (parágrafo de uma linha só) vira título
    const underline = /^\s*(=+|-+|~+)\s*$/.exec(line);
    if (underline && open?.kind === "PARAGRAFO" && open.lines.length === 1) {
      const level = underline[1]![0] === "=" ? 1 : underline[1]![0] === "-" ? 2 : 3;
      const text = open.lines[0]!;
      open = null;
      blocks.push({ kind: "TITULO", level, text });
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flush();
      losses.add("QUEBRA");
      continue;
    }
    if (md && /^\s*\|.*\|\s*$/.test(line)) {
      if (/^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-*:?\s*\|?\s*$/.test(line)) continue;
      if (!tableOpen) {
        flush();
        losses.add("TABELA");
      }
      const cells = line.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => inline(c.trim()));
      push("PARAGRAFO", cells.join(" | "));
      tableOpen = true;
      continue;
    }
    const quote = /^\s{0,3}>\s?(.*)$/.exec(line);
    if (quote) {
      push("CITACAO", inline(quote[1]!));
      continue;
    }
    // no texto puro só marcadores ("- ", "* ", "• ") abrem lista: "2026. Foi…" continua parágrafo
    const item = (md ? /^(\s*)([-*+•]|\d{1,9}[.)])\s+(.*)$/ : /^(\s*)([-*•])\s+(.*)$/).exec(line);
    if (item) {
      if (item[1]!.replace(/\t/g, "    ").length >= 2) losses.add("LISTA_ANINHADA");
      if (/\d/.test(item[2]!)) losses.add("LISTA_NUMERADA");
      push(refsNext ? "REFERENCIAS" : "LISTA", inline(item[3]!));
      continue;
    }
    const o = open as Open;
    if (o && (o.kind === "LISTA" || o.kind === "REFERENCIAS")) {
      // continuação do item anterior
      o.lines[o.lines.length - 1] = `${o.lines[o.lines.length - 1]} ${inline(line.trim())}`;
      continue;
    }
    if (o?.kind === "CITACAO") flush();
    refsNext = false;
    push("PARAGRAFO", inline(md ? line.trim() : line.trimEnd()));
  }
  flush();
  if (!meta.title) {
    const h1 = blocks.find((b) => b.kind === "TITULO" && b.level === 1);
    if (h1 && md) meta.title = h1.text;
  }
  return { meta, blocks, losses };
}

/* ── Escrita ──────────────────────────────────────────────────────────────────────────────────────────── */

/** Escapa a marcação do Markdown para que o texto volte idêntico pelo leitor acima. */
export function escapeMdLine(line: string): string {
  const s = line.replace(/([\\`*_[\]<>|~])/g, "\\$1");
  return s.replace(/^(\s*)([#>+\-=~]|\d+(?=[.)]))/, (_m, ws: string, c: string) => (/\d/.test(c) ? `${ws}${c}\\` : `${ws}\\${c}`));
}

const yaml = (s: string) => (/^[\w\sÀ-ÿ.,()/-]*$/.test(s) && !/^\s|\s$/.test(s) ? s : JSON.stringify(s));

export function exportMarkdown(piece: ExportablePiece): string {
  const out: string[] = ["---", `title: ${yaml(piece.title)}`, `tipo: ${piece.docType}`, `genero: ${piece.genre}`, `idioma: ${piece.language}`, `revisao: ${piece.revision}`, `atualizado: ${piece.updatedAt}`, "gerador: Work Station Letters", "---", ""];
  let prevRefsHeading = false;
  for (const b of piece.blocks) {
    if (!b.text.trim()) continue;
    const lines = b.text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim());
    switch (b.kind) {
      case "TITULO":
        out.push(`${"#".repeat(b.level ?? 2)} ${escapeMdLine(lines.join(" "))}`);
        break;
      case "PARAGRAFO":
        out.push(lines.map(escapeMdLine).join("\n"));
        break;
      case "LISTA":
        out.push(lines.map((l) => `- ${escapeMdLine(l.trim())}`).join("\n"));
        break;
      case "CITACAO":
        out.push(lines.map((l) => `> ${escapeMdLine(l)}`).join("\n"));
        break;
      case "REFERENCIAS":
        if (!prevRefsHeading) out.push("<!-- letters:referencias -->");
        out.push(lines.map((l) => `- ${escapeMdLine(l.trim())}`).join("\n"));
        break;
    }
    out.push("");
    prevRefsHeading = b.kind === "TITULO" && isReferencesHeading(b.text);
  }
  return out.join("\n").replace(/\n+$/, "\n");
}

/** Texto puro: títulos sublinhados, listas com "- ", citações com "> ", referências uma por linha. */
export function exportText(piece: ExportablePiece): string {
  const out: string[] = [];
  for (const b of piece.blocks) {
    if (!b.text.trim()) continue;
    const lines = b.text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim());
    switch (b.kind) {
      case "TITULO": {
        const text = lines.join(" ");
        const ch = b.level === 1 ? "=" : b.level === 3 ? "~" : "-";
        out.push(`${text}\n${ch.repeat(Math.max(3, Math.min(80, [...text].length)))}`);
        break;
      }
      case "LISTA":
        out.push(lines.map((l) => `- ${l.trim()}`).join("\n"));
        break;
      case "CITACAO":
        out.push(lines.map((l) => `> ${l}`).join("\n"));
        break;
      default:
        out.push(lines.join("\n"));
    }
    out.push("");
  }
  return out.join("\n").replace(/\n+$/, "\n");
}
