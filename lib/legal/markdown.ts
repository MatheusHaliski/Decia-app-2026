/**
 * Leitor mínimo dos textos legais de `docs/legal/*.md` (cabeçalho YAML + Markdown simples) para as páginas públicas /termos e
 * /privacidade. Gera uma árvore de dados serializável (o servidor lê o arquivo; o cliente desenha com componentes do design system),
 * sem HTML cru: nada do texto vira markup. Suporta títulos, parágrafos, listas, tabelas, regra horizontal, **negrito**, *itálico*,
 * `código`, URLs em texto e as tags `{{CAMPO}}` ainda não preenchidas (D-143, docs/legal/CAMPOS_A_PREENCHER.md).
 */
export type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; v: Inline[] }
  | { t: "em"; v: Inline[] }
  | { t: "code"; v: string }
  | { t: "tag"; v: string }
  | { t: "url"; v: string };

export type Block =
  | { t: "h"; level: 1 | 2 | 3 | 4; id: string; v: Inline[] }
  | { t: "p"; v: Inline[] }
  | { t: "ul" | "ol"; items: Inline[][] }
  | { t: "table"; head: Inline[][]; rows: Inline[][][] }
  | { t: "hr" };

export interface LegalDoc {
  meta: Record<string, string>;
  blocks: Block[];
  /** Tags `{{...}}` ainda presentes no texto, em ordem de aparição, sem repetição */
  pendingTags: string[];
}

/** Seções internas que não vão para a página pública (a publicação também as remove; docs/legal/README.md). */
const INTERNAL_SECTIONS = [/pend[êe]ncias para o jur[íi]dico/i];

export function splitFrontMatter(md: string): { meta: Record<string, string>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(md);
  if (!m) return { meta: {}, body: md };
  const meta: Record<string, string> = {};
  for (const line of m[1]!.split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (kv && kv[2] !== "") meta[kv[1]!] = kv[2]!.replace(/^["']|["']$/g, "").trim();
  }
  return { meta, body: md.slice(m[0].length) };
}

const INLINE = /(\*\*[^*]+?\*\*|`[^`]+`|\{\{[A-Z0-9_]+\}\}|https?:\/\/[^\s<>)]+[^\s<>).,;:]|(?<![*\w])\*[^*\s][^*]*?\*(?![*\w]))/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const tok = m[0];
    const at = m.index ?? 0;
    if (at > last) out.push({ t: "text", v: text.slice(last, at) });
    if (tok.startsWith("**")) out.push({ t: "strong", v: parseInline(tok.slice(2, -2)) });
    else if (tok.startsWith("`")) out.push({ t: "code", v: tok.slice(1, -1) });
    else if (tok.startsWith("{{")) out.push({ t: "tag", v: tok.slice(2, -2) });
    else if (tok.startsWith("http")) out.push({ t: "url", v: tok });
    else out.push({ t: "em", v: parseInline(tok.slice(1, -1)) });
    last = at + tok.length;
  }
  if (last < text.length) out.push({ t: "text", v: text.slice(last) });
  return out;
}

export const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const cellsOf = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function parseLegal(md: string): LegalDoc {
  const { meta, body } = splitFrontMatter(md);
  const lines = body.split(/\r?\n/);
  const blocks: Block[] = [];
  let skipLevel = 0;
  let para: string[] = [];
  const flush = () => { if (para.length) { blocks.push({ t: "p", v: parseInline(para.join(" ")) }); para = []; } };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      const level = h[1]!.length as 1 | 2 | 3 | 4;
      if (skipLevel && level > skipLevel) continue;
      skipLevel = INTERNAL_SECTIONS.some((r) => r.test(h[2]!)) ? level : 0;
      if (!skipLevel) blocks.push({ t: "h", level, id: slug(h[2]!), v: parseInline(h[2]!) });
      continue;
    }
    if (skipLevel) continue;
    if (/^\s*$/.test(line)) { flush(); continue; }
    if (/^-{3,}\s*$/.test(line)) { flush(); blocks.push({ t: "hr" }); continue; }
    if (/^\s*\|/.test(line)) {
      flush();
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i]!)) { rows.push(cellsOf(lines[i]!)); i++; }
      i--;
      const body = rows.filter((r, k) => !(k === 1 && r.every((c) => /^:?-{2,}:?$/.test(c))));
      blocks.push({ t: "table", head: (body[0] ?? []).map(parseInline), rows: body.slice(1).map((r) => r.map(parseInline)) });
      continue;
    }
    const li = /^\s*(?:([-*])|(\d+)\.)\s+(.*)$/.exec(line);
    if (li) {
      flush();
      const ordered = !!li[2];
      const items: Inline[][] = [];
      while (i < lines.length) {
        const m = /^\s*(?:([-*])|(\d+)\.)\s+(.*)$/.exec(lines[i]!);
        if (m && !!m[2] === ordered) { items.push(parseInline(m[3]!)); i++; continue; }
        // continuação de item (linha indentada)
        if (items.length && /^\s{2,}\S/.test(lines[i]!)) { items[items.length - 1]!.push({ t: "text", v: " " }, ...parseInline(lines[i]!.trim())); i++; continue; }
        break;
      }
      i--;
      blocks.push({ t: ordered ? "ol" : "ul", items });
      continue;
    }
    para.push(line.trim());
  }
  flush();
  const pendingTags = [...new Set([...body.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((m) => m[1]!))];
  return { meta, blocks, pendingTags };
}
