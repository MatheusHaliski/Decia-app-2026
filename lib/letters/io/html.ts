/**
 * HTML simples: leitura tolerante (sem DOM, sem executar nada) e escrita escapada com metadados e referências.
 * Na leitura, script/style/iframe/object/embed/svg/formulários são descartados com aviso, atributos `on*` contam como
 * script removido, formatação em linha e tabelas viram texto, imagens são descartadas e links viram "texto (url)".
 * Na escrita todo texto do usuário passa por `escapeHtml`; nenhum atributo vem do conteúdo.
 */
import { BLOCK_KINDS, type BlockKind } from "../types";
import { clampLevel, LossLog, type DocMeta, type DraftBlock } from "./model";
import type { ExportablePiece, ExportLabels } from "./export";
import { DOC_TYPES, TEXT_GENRES, TEXT_LANGUAGES, type DocType, type TextGenre, type TextLanguage } from "../types";

/* ── Escape ───────────────────────────────────────────────────────────────────────────────────────────── */

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", copy: "©", reg: "®", trade: "™", hellip: "…", mdash: "—", ndash: "–",
  laquo: "«", raquo: "»", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", bull: "•", middot: "·", ordm: "º", ordf: "ª", deg: "°", sect: "§", euro: "€", para: "¶",
  ccedil: "ç", Ccedil: "Ç", ntilde: "ñ", Ntilde: "Ñ", szlig: "ß", iexcl: "¡", iquest: "¿",
};
for (const [v, base] of Object.entries({ a: "aàáâãä", e: "eèéêẽë", i: "iìíîĩï", o: "oòóôõö", u: "uùúûũü" })) {
  const names = ["grave", "acute", "circ", "tilde", "uml"];
  names.forEach((n, k) => {
    const ch = base[k + 1]!;
    NAMED[`${v}${n}`] = ch;
    NAMED[`${v.toUpperCase()}${n}`] = ch.toUpperCase();
  });
}

export function decodeHtmlEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, body: string) => {
    if (body[0] === "#") {
      const cp = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : "";
    }
    return NAMED[body] ?? m;
  });
}

/* ── Leitura ──────────────────────────────────────────────────────────────────────────────────────────── */

type Tok = { t: "text"; v: string } | { t: "open"; name: string; attrs: Record<string, string>; self: boolean } | { t: "close"; name: string };

const RAW_TEXT = new Set(["script", "style", "textarea", "title", "xmp", "noscript", "template"]);
const VOID = new Set(["br", "hr", "img", "input", "meta", "link", "source", "area", "base", "col", "embed", "param", "track", "wbr"]);

export function tokenizeHtml(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const lt = src.indexOf("<", i);
    if (lt < 0) {
      toks.push({ t: "text", v: src.slice(i) });
      break;
    }
    if (lt > i) toks.push({ t: "text", v: src.slice(i, lt) });
    i = lt;
    if (src.startsWith("<!--", i)) {
      const end = src.indexOf("-->", i + 4);
      i = end < 0 ? n : end + 3;
      continue;
    }
    if (src[i + 1] === "!" || src[i + 1] === "?") {
      const end = src.indexOf(">", i);
      i = end < 0 ? n : end + 1;
      continue;
    }
    const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/.exec(src.slice(i, i + 8192));
    if (!m) {
      toks.push({ t: "text", v: "<" });
      i++;
      continue;
    }
    i += m[0].length;
    const name = m[2]!.toLowerCase();
    if (m[1]) {
      toks.push({ t: "close", name });
      continue;
    }
    const attrs: Record<string, string> = {};
    for (const a of m[3]!.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[a[1]!.toLowerCase()] = decodeHtmlEntities(a[2] ?? a[3] ?? a[4] ?? "");
    const self = !!m[4] || VOID.has(name);
    toks.push({ t: "open", name, attrs, self });
    if (RAW_TEXT.has(name) && !self) {
      const close = src.toLowerCase().indexOf(`</${name}`, i);
      const end = close < 0 ? n : close;
      toks.push({ t: "text", v: src.slice(i, end) });
      toks.push({ t: "close", name });
      const gt = close < 0 ? -1 : src.indexOf(">", close);
      i = gt < 0 ? n : gt + 1;
    }
  }
  return toks;
}

const DROP: Readonly<Record<string, Parameters<LossLog["add"]>[0]>> = {
  script: "SCRIPT", noscript: "SCRIPT", template: "SCRIPT", style: "ESTILO", iframe: "MIDIA_EMBUTIDA", object: "MIDIA_EMBUTIDA", embed: "MIDIA_EMBUTIDA",
  video: "MIDIA_EMBUTIDA", audio: "MIDIA_EMBUTIDA", canvas: "MIDIA_EMBUTIDA", svg: "IMAGEM", math: "FORMATACAO_CARACTERE", form: "FORMULARIO",
  button: "FORMULARIO", select: "FORMULARIO", textarea: "FORMULARIO", nav: "HTML_EMBUTIDO",
};
const BLOCK = new Set(["p", "div", "section", "article", "main", "header", "footer", "aside", "h1", "h2", "h3", "h4", "h5", "h6", "li", "ul", "ol", "dl", "dt", "dd", "blockquote", "pre", "table", "tr", "td", "th", "thead", "tbody", "tfoot", "caption", "figure", "figcaption", "address", "hr", "body", "html"]);
const INLINE_FORMAT = new Set(["b", "strong", "i", "em", "u", "s", "strike", "del", "ins", "mark", "code", "kbd", "samp", "sup", "sub", "small", "big", "font", "tt", "var", "cite", "q", "abbr", "dfn"]);

interface RawBlock extends DraftBlock {
  group?: number;
}

export function parseHtml(src: string): { meta: DocMeta; blocks: DraftBlock[]; losses: LossLog } {
  const losses = new LossLog();
  const meta: DocMeta = {};
  const toks = tokenizeHtml(src);
  const raw: RawBlock[] = [];
  const stack: { name: string; attrs: Record<string, string>; group: number }[] = [];
  let groupSeq = 0;
  let sink = "";
  let skipDepth = 0;
  let skipName = "";
  let headDepth = 0;
  const innermost = (names: string[]) => [...stack].reverse().find((s) => names.includes(s.name));
  let pre = false;

  const flush = () => {
    const text = (pre ? sink : sink.replace(/[ \t\r\n\f\u00a0]+/g, " ").replace(/ ?\uE000 ?/g, "\uE000").trim()).replace(/\uE000/g, "\n");
    sink = "";
    if (!text.trim()) return;
    const heading = innermost(["h1", "h2", "h3", "h4", "h5", "h6"]);
    if (heading) {
      raw.push({ kind: "TITULO", level: clampLevel(Number(heading.name[1]), losses), text });
      return;
    }
    const li = innermost(["li"]);
    const list = innermost(["ul", "ol"]);
    const marked = [...stack].reverse().find((s) => s.attrs["data-letters"] && (BLOCK_KINDS as readonly string[]).includes(s.attrs["data-letters"]!));
    if (li && list) {
      const kind: BlockKind = marked?.attrs["data-letters"] === "REFERENCIAS" ? "REFERENCIAS" : "LISTA";
      raw.push({ kind, text: text.replace(/\n+/g, " "), group: list.group });
      return;
    }
    const quote = innermost(["blockquote"]);
    if (quote) {
      raw.push({ kind: "CITACAO", text, group: quote.group });
      return;
    }
    if (marked?.attrs["data-letters"] === "REFERENCIAS") {
      raw.push({ kind: "REFERENCIAS", text, group: marked.group });
      return;
    }
    raw.push({ kind: "PARAGRAFO", text });
  };

  for (const tok of toks) {
    if (skipDepth) {
      if (tok.t === "open" && tok.name === skipName && !tok.self) skipDepth++;
      if (tok.t === "close" && tok.name === skipName) skipDepth--;
      continue;
    }
    if (tok.t === "text") {
      if (headDepth) continue;
      sink += decodeHtmlEntities(tok.v);
      continue;
    }
    if (tok.t === "open") {
      const a = tok.attrs;
      if (Object.keys(a).some((k) => k.startsWith("on")) || /^\s*javascript:/i.test(a.href ?? "") || /^\s*javascript:/i.test(a.src ?? "")) losses.add("SCRIPT");
      if (tok.name === "head") {
        headDepth++;
        continue;
      }
      if (tok.name === "body") headDepth = 0;
      if (tok.name === "title") {
        // lido à parte (expressão abaixo); o texto não entra no corpo
        if (!tok.self) {
          skipDepth = 1;
          skipName = "title";
        }
        continue;
      }
      if (headDepth && tok.name !== "meta") continue;
      if (tok.name === "meta") {
        const key = (a.name ?? "").toLowerCase();
        const v = a.content ?? "";
        if (key === "letters:doctype" && (DOC_TYPES as readonly string[]).includes(v)) meta.docType = v as DocType;
        else if (key === "letters:genre" && (TEXT_GENRES as readonly string[]).includes(v)) meta.genre = v as TextGenre;
        else if (key === "letters:language" && (TEXT_LANGUAGES as readonly string[]).includes(v)) meta.language = v as TextLanguage;
        continue;
      }
      if (tok.name === "html" && a.lang && !meta.language && (TEXT_LANGUAGES as readonly string[]).includes(a.lang)) meta.language = a.lang as TextLanguage;
      if (DROP[tok.name] || a["data-letters"] === "meta") {
        if (DROP[tok.name]) losses.add(DROP[tok.name]!);
        if (!tok.self) {
          skipDepth = 1;
          skipName = tok.name;
        }
        continue;
      }
      if (tok.name === "img") {
        losses.add("IMAGEM");
        continue;
      }
      if (tok.name === "input") {
        losses.add("FORMULARIO");
        continue;
      }
      if (tok.name === "br") {
        // marcador de quebra (área de uso privado) para sobreviver ao colapso de espaços
        sink += "\uE000";
        continue;
      }
      if (tok.name === "hr") {
        flush();
        losses.add("QUEBRA");
        continue;
      }
      if (INLINE_FORMAT.has(tok.name)) losses.add("FORMATACAO_CARACTERE");
      if (tok.name === "span" && a.style) losses.add("FORMATACAO_CARACTERE");
      if (BLOCK.has(tok.name)) {
        flush();
        if (a.style || a.align) losses.add("FORMATACAO_PARAGRAFO");
        if (tok.name === "table") losses.add("TABELA");
        if (tok.name === "pre") {
          losses.add("CODIGO");
          pre = true;
        }
        if (tok.name === "ol" && a["data-letters"] !== "REFERENCIAS" && !innermost(["section"])?.attrs["data-letters"]) losses.add("LISTA_NUMERADA");
        if ((tok.name === "ul" || tok.name === "ol") && innermost(["ul", "ol"])) losses.add("LISTA_ANINHADA");
        if (/^h[4-6]$/.test(tok.name)) losses.add("TITULO_NIVEL");
      }
      if (tok.name === "a") {
        const href = a.href ?? "";
        stack.push({ name: "a", attrs: { ...a, _start: String(sink.length) }, group: 0 });
        if (href) losses.add("LINK");
        continue;
      }
      if (tok.name === "td" || tok.name === "th") {
        // célula: separa por " | " dentro da linha
        stack.push({ name: tok.name, attrs: a, group: 0 });
        continue;
      }
      if (!tok.self) stack.push({ name: tok.name, attrs: a, group: ++groupSeq });
      continue;
    }
    // fechamento
    if (tok.name === "head") {
      headDepth = Math.max(0, headDepth - 1);
      continue;
    }
    const idx = stack.map((s) => s.name).lastIndexOf(tok.name);
    if (idx < 0) continue;
    if (tok.name === "a") {
      const el = stack[idx]!;
      const start = Number(el.attrs._start ?? sink.length);
      const text = sink.slice(start).trim();
      const href = el.attrs.href ?? "";
      if (/^(https?:|mailto:)/i.test(href) && href !== text) sink += ` (${href.replace(/^mailto:/i, "")})`;
      stack.splice(idx, 1);
      continue;
    }
    if (tok.name === "td" || tok.name === "th") {
      sink += " | ";
      stack.splice(idx, 1);
      continue;
    }
    if (BLOCK.has(tok.name)) {
      if (tok.name === "tr") sink = sink.replace(/\s*\|\s*$/, "");
      flush();
      if (tok.name === "pre") pre = false;
    }
    stack.splice(idx);
  }
  flush();

  // título do documento: <title> (lido à parte) ou o primeiro h1
  const title = /<title[^>]*>([\s\S]*?)<\/title\s*>/i.exec(src);
  if (title) meta.title = decodeHtmlEntities(title[1]!).replace(/\s+/g, " ").trim() || undefined;
  if (!meta.title) meta.title = raw.find((b) => b.kind === "TITULO" && b.level === 1)?.text;

  // agrupa itens do mesmo contêiner (lista, citação, referências) num bloco só
  const blocks: DraftBlock[] = [];
  let lastGroup: number | undefined;
  for (const b of raw) {
    const prev = blocks[blocks.length - 1];
    if (prev && b.group !== undefined && b.group === lastGroup && prev.kind === b.kind) prev.text = `${prev.text}\n${b.text}`;
    else blocks.push({ kind: b.kind, text: b.text, ...(b.level ? { level: b.level } : {}) });
    lastGroup = b.group;
  }
  return { meta, blocks, losses };
}

/* ── Escrita ──────────────────────────────────────────────────────────────────────────────────────────── */

const PRINT_CSS = `
@page { margin: 2.5cm 2cm; }
html { color-scheme: light; }
body { margin: 0; font: 12pt/1.5 Georgia, "Times New Roman", serif; color: CanvasText; background: Canvas; }
article { max-width: 42rem; margin: 2rem auto; padding: 0 1rem; }
header.letters-meta { border-bottom: 1px solid GrayText; margin-bottom: 1.5rem; padding-bottom: .5rem; }
.letters-doc-title { font-size: 1.6em; font-weight: 700; margin: 0 0 .5rem; }
dl { display: grid; grid-template-columns: max-content 1fr; gap: .1rem 1rem; margin: 0; font-size: .85em; }
dt { font-weight: 600; } dd { margin: 0; }
h1, h2, h3 { line-height: 1.25; break-after: avoid; }
p { margin: 0 0 .8em; text-align: justify; orphans: 3; widows: 3; }
blockquote { margin: 1em 0 1em 4cm; font-size: .9em; }
.letters-references ol { list-style: none; padding: 0; }
.letters-references li { margin: 0 0 .6em; }
@media print { article { margin: 0; max-width: none; padding: 0; } }
`.trim();

const lineHtml = (s: string) => escapeHtml(s).replace(/\n/g, "<br>\n");

export function exportHtml(piece: ExportablePiece, labels: ExportLabels): string {
  const lang = piece.language;
  const out: string[] = [
    "<!DOCTYPE html>",
    `<html lang="${escapeHtml(lang)}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(piece.title)}</title>`,
    '<meta name="generator" content="Work Station Letters">',
    `<meta name="letters:doctype" content="${escapeHtml(piece.docType)}">`,
    `<meta name="letters:genre" content="${escapeHtml(piece.genre)}">`,
    `<meta name="letters:language" content="${escapeHtml(piece.language)}">`,
    `<meta name="letters:revision" content="${piece.revision}">`,
    `<meta name="letters:updated" content="${escapeHtml(piece.updatedAt)}">`,
    `<style>\n${PRINT_CSS}\n</style>`,
    "</head>",
    "<body>",
    '<article class="letters-piece">',
    '<header class="letters-meta" data-letters="meta">',
    `<p class="letters-doc-title">${escapeHtml(piece.title)}</p>`,
    "<dl>",
    `<dt>${escapeHtml(labels.docType)}</dt><dd>${escapeHtml(labels.docTypeValue)}</dd>`,
    `<dt>${escapeHtml(labels.genre)}</dt><dd>${escapeHtml(labels.genreValue)}</dd>`,
    `<dt>${escapeHtml(labels.language)}</dt><dd>${escapeHtml(labels.languageValue)}</dd>`,
    `<dt>${escapeHtml(labels.revision)}</dt><dd>${piece.revision}</dd>`,
    `<dt>${escapeHtml(labels.updated)}</dt><dd><time datetime="${escapeHtml(piece.updatedAt)}">${escapeHtml(labels.updatedValue)}</time></dd>`,
    "</dl>",
    "</header>",
  ];
  for (const b of piece.blocks) {
    if (!b.text.trim()) continue;
    const lines = b.text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim());
    switch (b.kind) {
      case "TITULO": {
        const h = `h${b.level ?? 2}`;
        out.push(`<${h}>${escapeHtml(lines.join(" "))}</${h}>`);
        break;
      }
      case "PARAGRAFO":
        out.push(`<p>${lineHtml(lines.join("\n"))}</p>`);
        break;
      case "LISTA":
        out.push("<ul>", ...lines.map((l) => `<li>${escapeHtml(l.trim())}</li>`), "</ul>");
        break;
      case "CITACAO":
        out.push(`<blockquote><p>${lineHtml(lines.join("\n"))}</p></blockquote>`);
        break;
      case "REFERENCIAS":
        out.push(`<section class="letters-references" data-letters="REFERENCIAS" aria-label="${escapeHtml(labels.references)}">`, "<ol>", ...lines.map((l) => `<li>${escapeHtml(l.trim())}</li>`), "</ol>", "</section>");
        break;
    }
  }
  out.push("</article>", "</body>", "</html>", "");
  return out.join("\n");
}
