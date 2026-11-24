/**
 * XML mínimo para o DOCX (WordprocessingML): escape para escrita e um leitor estrito, sem DTD nem entidades externas
 * (nada é resolvido fora do arquivo — sem XXE). O leitor recusa documento malformado (tag sem par, atributo sem aspas,
 * entidade desconhecida) com `XmlError`, e limita profundidade e quantidade de nós.
 */

export interface XmlElement {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
}
export type XmlNode = XmlElement | string;

export class XmlError extends Error {
  constructor(message: string, readonly at: number) {
    super(`${message} (posição ${at})`);
    this.name = "XmlError";
  }
}

export const XML_LIMITS = { maxDepth: 256, maxNodes: 400_000 } as const;

const PREDEFINED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** Texto/atributo escapado para XML 1.0; caracteres de controle proibidos são removidos. */
export function xmlEscape(s: string): string {
  return s
    // eslint-disable-next-line no-control-regex -- remove controles proibidos no XML 1.0 (exceto tab, LF e CR)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeEntities(s: string, at: number): string {
  if (!s.includes("&")) return s;
  return s.replace(/&([^;\s&<]*);?/g, (m, body: string) => {
    if (!m.endsWith(";")) throw new XmlError("& sem entidade", at);
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const cp = parseInt(body.slice(2), 16);
      if (!Number.isFinite(cp) || cp > 0x10ffff) throw new XmlError("referência numérica inválida", at);
      return String.fromCodePoint(cp);
    }
    if (body.startsWith("#")) {
      const cp = parseInt(body.slice(1), 10);
      if (!Number.isFinite(cp) || cp > 0x10ffff) throw new XmlError("referência numérica inválida", at);
      return String.fromCodePoint(cp);
    }
    const v = PREDEFINED[body];
    if (v === undefined) throw new XmlError(`entidade desconhecida &${body};`, at);
    return v;
  });
}

const NAME = /[A-Za-z_:][-A-Za-z0-9_:.]*/y;

/** Lê um documento XML inteiro e devolve o elemento raiz. Lança `XmlError` se malformado. */
export function parseXml(src: string): XmlElement {
  let i = 0;
  let nodes = 0;
  const n = src.length;
  if (src.charCodeAt(0) === 0xfeff) i = 1;
  const stack: XmlElement[] = [];
  let root: XmlElement | null = null;

  const readName = (): string => {
    NAME.lastIndex = i;
    const m = NAME.exec(src);
    if (!m) throw new XmlError("nome esperado", i);
    i += m[0].length;
    return m[0];
  };
  const skipWs = () => {
    while (i < n && /\s/.test(src[i]!)) i++;
  };

  while (i < n) {
    if (src[i] !== "<") {
      const next = src.indexOf("<", i);
      const end = next < 0 ? n : next;
      const raw = src.slice(i, end);
      const top = stack[stack.length - 1];
      if (!top) {
        if (raw.trim()) throw new XmlError("texto fora do elemento raiz", i);
      } else {
        top.children.push(decodeEntities(raw, i));
        if (++nodes > XML_LIMITS.maxNodes) throw new XmlError("nós demais", i);
      }
      i = end;
      continue;
    }
    if (src.startsWith("<?", i)) {
      const end = src.indexOf("?>", i + 2);
      if (end < 0) throw new XmlError("instrução de processamento sem fim", i);
      i = end + 2;
      continue;
    }
    if (src.startsWith("<!--", i)) {
      const end = src.indexOf("-->", i + 4);
      if (end < 0) throw new XmlError("comentário sem fim", i);
      i = end + 3;
      continue;
    }
    if (src.startsWith("<![CDATA[", i)) {
      const end = src.indexOf("]]>", i + 9);
      if (end < 0) throw new XmlError("CDATA sem fim", i);
      const top = stack[stack.length - 1];
      if (!top) throw new XmlError("CDATA fora do elemento raiz", i);
      top.children.push(src.slice(i + 9, end));
      i = end + 3;
      continue;
    }
    if (src.startsWith("<!", i)) throw new XmlError("DTD/declaração não aceita", i);
    if (src.startsWith("</", i)) {
      i += 2;
      const name = readName();
      skipWs();
      if (src[i] !== ">") throw new XmlError("> esperado", i);
      i++;
      const top = stack.pop();
      if (!top || top.name !== name) throw new XmlError(`fechamento </${name}> sem abertura correspondente`, i);
      continue;
    }
    // abertura
    i++;
    const name = readName();
    const attrs: Record<string, string> = {};
    for (;;) {
      const before = i;
      skipWs();
      if (src.startsWith("/>", i) || src[i] === ">") break;
      if (i === before) throw new XmlError("espaço esperado entre atributos", i);
      const an = readName();
      skipWs();
      if (src[i] !== "=") throw new XmlError("= esperado", i);
      i++;
      skipWs();
      const q = src[i];
      if (q !== '"' && q !== "'") throw new XmlError("atributo sem aspas", i);
      const end = src.indexOf(q, i + 1);
      if (end < 0) throw new XmlError("atributo sem fim", i);
      const raw = src.slice(i + 1, end);
      if (raw.includes("<")) throw new XmlError("< em atributo", i);
      if (an in attrs) throw new XmlError(`atributo repetido ${an}`, i);
      attrs[an] = decodeEntities(raw, i);
      i = end + 1;
    }
    const el: XmlElement = { name, attrs, children: [] };
    if (++nodes > XML_LIMITS.maxNodes) throw new XmlError("nós demais", i);
    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(el);
    else if (root) throw new XmlError("mais de um elemento raiz", i);
    else root = el;
    if (src.startsWith("/>", i)) {
      i += 2;
    } else {
      i++;
      stack.push(el);
      if (stack.length > XML_LIMITS.maxDepth) throw new XmlError("aninhamento profundo demais", i);
    }
  }
  if (stack.length) throw new XmlError(`<${stack[stack.length - 1]!.name}> sem fechamento`, n);
  if (!root) throw new XmlError("documento vazio", 0);
  return root;
}

/* ── Navegação ─────────────────────────────────────────────────────────────────────────────────────────── */

export const isEl = (x: XmlNode | undefined): x is XmlElement => typeof x === "object" && x !== null;
/** nome local (sem prefixo de namespace) */
export const local = (name: string) => name.slice(name.indexOf(":") + 1);
export const childEls = (el: XmlElement, name?: string) => el.children.filter((c): c is XmlElement => isEl(c) && (!name || c.name === name));
export const firstEl = (el: XmlElement | undefined, name: string) => (el ? childEls(el, name)[0] : undefined);
/** primeiro descendente com o nome dado (busca em profundidade) */
export function findEl(el: XmlElement, name: string): XmlElement | undefined {
  for (const c of el.children) {
    if (!isEl(c)) continue;
    if (c.name === name) return c;
    const d = findEl(c, name);
    if (d) return d;
  }
  return undefined;
}
export function textOf(el: XmlElement): string {
  return el.children.map((c) => (isEl(c) ? textOf(c) : c)).join("");
}
