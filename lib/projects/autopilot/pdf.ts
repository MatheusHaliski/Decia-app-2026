/**
 * Texto de um PDF lido NO NAVEGADOR, sem biblioteca externa e sem enviar nada a servidor (RF30, demanda em PDF):
 *  • objetos `n g obj … endobj` e fluxos de objetos (`/Type /ObjStm`);
 *  • fluxos `/FlateDecode` descomprimidos com `DecompressionStream("deflate")` (com recuo para "deflate-raw");
 *  • operadores de texto do conteúdo das páginas: `Tj`, `TJ` (espaçamento negativo grande vira espaço), `'` e `"`, com
 *    quebra de linha por `Td`/`TD`/`T*`/`Tm`; formulários (`Do` de XObject /Form) até 3 níveis;
 *  • fontes com `/ToUnicode` (CMap `bfchar`/`bfrange`, códigos de 1 ou 2 bytes); sem ela, um byte = WinAnsi.
 * PDF cifrado (`/Encrypt`) ou sem camada de texto (digitalizado como imagem) devolve o motivo, para a tela pedir que a pessoa
 * cole o conteúdo. Limites contra arquivo malicioso: tamanho do fluxo descomprimido e número de objetos.
 */

export type PdfTextResult =
  | { ok: true; text: string; pages: number }
  | { ok: false; reason: "NAO_E_PDF" | "CIFRADO" | "SEM_TEXTO" };

export type Inflate = (data: Uint8Array) => Promise<Uint8Array>;

const MAX_STREAM_OUT = 16 * 1024 * 1024;
const MAX_OBJECTS = 20_000;
const SKIP_STREAM = /\/Subtype\s*\/Image\b|\/Length[123]\b|\/Type\s*\/XRef\b|\/Type\s*\/EmbeddedFile\b|\/Subtype\s*\/(?:Type1C|CIDFontType0C|OpenType)\b/;

async function drain(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
      if (total > MAX_STREAM_OUT) {
        await reader.cancel().catch(() => undefined);
        break;
      }
    }
  } catch {
    // fluxo truncado ou com lixo no fim: fica com o que já saiu
  }
  const out = new Uint8Array(Math.min(total, MAX_STREAM_OUT));
  let at = 0;
  for (const c of chunks) {
    if (at >= out.length) break;
    out.set(c.subarray(0, out.length - at), at);
    at += c.length;
  }
  return out;
}

function decompress(data: Uint8Array, format: "deflate" | "deflate-raw"): Promise<Uint8Array> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
  return drain(source.pipeThrough(new DecompressionStream(format) as unknown as TransformStream<Uint8Array, Uint8Array>));
}

/** FlateDecode pelo `DecompressionStream` do navegador ("deflate" = zlib, como no PDF; recua para "deflate-raw"). */
export const browserInflate: Inflate = async (data) => {
  if (typeof DecompressionStream === "undefined") return new Uint8Array(0);
  const out = await decompress(data, "deflate").catch(() => new Uint8Array(0));
  return out.length ? out : decompress(data, "deflate-raw").catch(() => new Uint8Array(0));
};

// ------------------------------------------------------------------ bytes ↔ texto latin-1 (1 byte = 1 caractere)

function latin1(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return s;
}

/** WinAnsiEncoding: 0x80–0x9F diferem do Latin-1. */
const WIN_ANSI: Record<number, string> = {
  0x80: "€", 0x82: "‚", 0x83: "ƒ", 0x84: "„", 0x85: "…", 0x86: "†", 0x87: "‡", 0x88: "ˆ", 0x89: "‰", 0x8a: "Š", 0x8b: "‹", 0x8c: "Œ", 0x8e: "Ž",
  0x91: "‘", 0x92: "’", 0x93: "“", 0x94: "”", 0x95: "•", 0x96: "–", 0x97: "—", 0x98: "˜", 0x99: "™", 0x9a: "š", 0x9b: "›", 0x9c: "œ", 0x9e: "ž", 0x9f: "Ÿ",
};

// ------------------------------------------------------------------ objetos

interface PdfObject { dict: string; stream?: Uint8Array; streamDict?: string }

/** Trecho balanceado `<< … >>` a partir de `at` (que aponta para "<<"). */
function balancedDict(src: string, at: number): string {
  let depth = 0;
  for (let i = at; i < src.length - 1; i++) {
    const c = src[i]!;
    if (c === "(") {
      // pula strings literais dentro do dicionário
      let d = 1;
      i++;
      for (; i < src.length && d > 0; i++) {
        if (src[i] === "\\") i++;
        else if (src[i] === "(") d++;
        else if (src[i] === ")") d--;
      }
      i--;
      continue;
    }
    if (c === "<" && src[i + 1] === "<") {
      depth++;
      i++;
    } else if (c === ">" && src[i + 1] === ">") {
      depth--;
      i++;
      if (depth === 0) return src.slice(at, i + 1);
    }
  }
  return src.slice(at);
}

/** Valor de uma chave num dicionário: referência "n g R", dicionário "<< >>", array "[ ]", nome ou número. */
function dictValue(dict: string, key: string): string | undefined {
  const re = new RegExp(`/${key}(?![A-Za-z0-9])\\s*`, "g");
  // procura no nível de cima: ignora ocorrências dentro de subdicionários
  let m: RegExpExecArray | null;
  while ((m = re.exec(dict))) {
    if (depthAt(dict, m.index) !== 1) continue;
    const at = m.index + m[0].length;
    const rest = dict.slice(at);
    if (rest.startsWith("<<")) return balancedDict(dict, at);
    if (rest.startsWith("[")) {
      let depth = 0;
      for (let i = 0; i < rest.length; i++) {
        if (rest[i] === "[") depth++;
        else if (rest[i] === "]" && --depth === 0) return rest.slice(0, i + 1);
      }
      return rest;
    }
    const ref = /^(\d+)\s+(\d+)\s+R\b/.exec(rest);
    if (ref) return ref[0];
    const name = /^\/[^\s/<>[\]()]*/.exec(rest);
    if (name) return name[0];
    return /^[^\s/<>[\]()]+/.exec(rest)?.[0];
  }
  return undefined;
}

function depthAt(dict: string, index: number): number {
  let depth = 0;
  for (let i = 0; i < index; i++) {
    if (dict[i] === "<" && dict[i + 1] === "<") {
      depth++;
      i++;
    } else if (dict[i] === ">" && dict[i + 1] === ">") {
      depth--;
      i++;
    }
  }
  return depth;
}

const refNum = (v: string | undefined) => {
  const m = v ? /^(\d+)\s+\d+\s+R/.exec(v) : null;
  return m ? Number(m[1]) : undefined;
};
const refList = (v: string | undefined) => (v ? [...v.matchAll(/(\d+)\s+\d+\s+R/g)].map((m) => Number(m[1])) : []);

function filtersOf(dict: string): string[] {
  const v = dictValue(dict, "Filter");
  return v ? [...v.matchAll(/\/(\w+)/g)].map((m) => m[1]!) : [];
}

async function parseObjects(bytes: Uint8Array, src: string, inflate: Inflate): Promise<Map<number, PdfObject>> {
  const objects = new Map<number, PdfObject>();
  const heads = [...src.matchAll(/(?:^|[\s>\]])(\d+)\s+(\d+)\s+obj\b/g)].slice(0, MAX_OBJECTS);
  for (let k = 0; k < heads.length; k++) {
    const h = heads[k]!;
    const num = Number(h[1]);
    const bodyStart = h.index + h[0].length;
    const limit = k + 1 < heads.length ? heads[k + 1]!.index : src.length;
    const endobj = src.indexOf("endobj", bodyStart);
    const bodyEnd = endobj >= 0 && endobj < limit + 8 ? endobj : limit;
    let body = src.slice(bodyStart, bodyEnd);
    const lead = body.length - body.trimStart().length;
    body = body.trimStart();
    const obj: PdfObject = { dict: body.startsWith("<<") ? balancedDict(body, 0) : body.trim() };
    const afterDict = bodyStart + lead + obj.dict.length;
    const sm = /^\s*stream\r?\n/.exec(src.slice(afterDict, afterDict + 16));
    if (sm && obj.dict.startsWith("<<")) {
      const dataStart = afterDict + sm[0].length;
      const declared = Number(dictValue(obj.dict, "Length"));
      let dataEnd = -1;
      if (Number.isFinite(declared) && declared > 0 && /^\s*endstream/.test(src.slice(dataStart + declared, dataStart + declared + 12))) dataEnd = dataStart + declared;
      if (dataEnd < 0) {
        dataEnd = src.indexOf("endstream", dataStart);
        if (dataEnd < 0) dataEnd = bodyEnd;
        while (dataEnd > dataStart && (src[dataEnd - 1] === "\n" || src[dataEnd - 1] === "\r")) dataEnd--;
      }
      const raw = bytes.subarray(dataStart, dataEnd);
      const filters = filtersOf(obj.dict);
      // imagens, fontes embutidas e tabelas de referência não têm texto: nem descomprime
      if (SKIP_STREAM.test(obj.dict)) obj.stream = undefined;
      else if (filters.length === 0) obj.stream = raw;
      else if (filters.every((f) => f === "FlateDecode" || f === "Fl")) {
        let data: Uint8Array = raw;
        for (let i = 0; i < filters.length; i++) data = await inflate(data);
        obj.stream = data;
      }
      obj.streamDict = obj.dict;
    }
    objects.set(num, obj);
  }
  // fluxos de objetos (PDF 1.5+): os dicionários das páginas e das fontes muitas vezes vêm comprimidos aqui dentro
  for (const obj of [...objects.values()]) {
    if (!obj.stream || !/\/Type\s*\/ObjStm\b/.test(obj.dict)) continue;
    const n = Number(dictValue(obj.dict, "N"));
    const first = Number(dictValue(obj.dict, "First"));
    if (!Number.isFinite(n) || !Number.isFinite(first)) continue;
    const text = latin1(obj.stream);
    const pairs = text.slice(0, first).trim().split(/\s+/).map(Number);
    for (let i = 0; i < n && i * 2 + 1 < pairs.length; i++) {
      const num = pairs[i * 2]!;
      const off = pairs[i * 2 + 1]!;
      const next = i + 1 < n && i * 2 + 3 < pairs.length ? pairs[i * 2 + 3]! : text.length - first;
      const body = text.slice(first + off, first + next).trim();
      if (!objects.has(num)) objects.set(num, { dict: body.startsWith("<<") ? balancedDict(body, 0) : body });
    }
  }
  return objects;
}

// ------------------------------------------------------------------ fontes e CMap

interface FontDecoder { decode(bytes: Uint8Array): string; undecodable: boolean }

function hexToBytes(hex: string): number[] {
  const h = hex.replace(/[^0-9a-fA-F]/g, "");
  const out: number[] = [];
  for (let i = 0; i < h.length; i += 2) out.push(parseInt(h.slice(i, i + 2).padEnd(2, "0"), 16));
  return out;
}
const utf16be = (bytes: number[]) => {
  let s = "";
  for (let i = 0; i + 1 < bytes.length; i += 2) s += String.fromCharCode((bytes[i]! << 8) | bytes[i + 1]!);
  return s;
};
const codeOf = (bytes: number[]) => bytes.reduce((a, b) => a * 256 + b, 0);

/** CMap ToUnicode: `beginbfchar` e `beginbfrange` → código → texto. */
export function parseToUnicode(cmap: string): { map: Map<number, string>; widths: Set<number> } {
  const map = new Map<number, string>();
  const widths = new Set<number>();
  for (const block of cmap.matchAll(/begincodespacerange([\s\S]*?)endcodespacerange/g)) {
    for (const m of block[1]!.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) widths.add(Math.ceil(m[1]!.length / 2));
  }
  for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of block[1]!.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) {
      map.set(codeOf(hexToBytes(m[1]!)), utf16be(hexToBytes(m[2]!)));
      widths.add(Math.ceil(m[1]!.length / 2));
    }
  }
  for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of block[1]!.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(?:<([0-9a-fA-F]+)>|\[([^\]]*)\])/g)) {
      const lo = codeOf(hexToBytes(m[1]!));
      const hi = codeOf(hexToBytes(m[2]!));
      widths.add(Math.ceil(m[1]!.length / 2));
      if (hi - lo > 0xffff) continue;
      if (m[3] !== undefined) {
        const base = hexToBytes(m[3]);
        for (let c = lo; c <= hi; c++) {
          const dst = [...base];
          const inc = c - lo;
          const last = ((dst[dst.length - 2]! << 8) | dst[dst.length - 1]!) + inc;
          dst[dst.length - 2] = (last >> 8) & 0xff;
          dst[dst.length - 1] = last & 0xff;
          map.set(c, utf16be(dst));
        }
      } else {
        const items = [...m[4]!.matchAll(/<([0-9a-fA-F]*)>/g)];
        items.forEach((it, i) => map.set(lo + i, utf16be(hexToBytes(it[1]!))));
      }
    }
  }
  if (!widths.size) widths.add(map.size && [...map.keys()].some((k) => k > 0xff) ? 2 : 1);
  return { map, widths };
}

const singleByte: FontDecoder = {
  undecodable: false,
  decode: (bytes) => {
    let s = "";
    for (const b of bytes) s += WIN_ANSI[b] ?? (b >= 0x20 || b === 0x09 || b === 0x0a ? String.fromCharCode(b) : "");
    return s;
  },
};
const noDecoder: FontDecoder = { undecodable: true, decode: () => "" };

function cmapDecoder(cmap: ReturnType<typeof parseToUnicode>): FontDecoder {
  const widths = [...cmap.widths].sort((a, b) => b - a);
  return {
    undecodable: false,
    decode: (bytes) => {
      let s = "";
      for (let i = 0; i < bytes.length; ) {
        let done = false;
        for (const w of widths) {
          if (i + w > bytes.length) continue;
          let code = 0;
          for (let k = 0; k < w; k++) code = code * 256 + bytes[i + k]!;
          const hit = cmap.map.get(code);
          if (hit !== undefined) {
            s += hit;
            i += w;
            done = true;
            break;
          }
        }
        if (!done) i += widths[widths.length - 1] ?? 1;
      }
      return s;
    },
  };
}

// ------------------------------------------------------------------ conteúdo das páginas

type Tok =
  | { t: "num"; v: number }
  | { t: "str"; v: Uint8Array }
  | { t: "name"; v: string }
  | { t: "op"; v: string }
  | { t: "arr"; v: Tok[] }
  | { t: "mark"; v: "[" | "<<" };

const isWs = (c: number) => c === 0x20 || c === 0x0a || c === 0x0d || c === 0x09 || c === 0x0c || c === 0x00;
const isDelim = (c: number) => c === 0x28 || c === 0x29 || c === 0x3c || c === 0x3e || c === 0x5b || c === 0x5d || c === 0x7b || c === 0x7d || c === 0x2f || c === 0x25;

function* tokens(b: Uint8Array): Generator<Tok> {
  let i = 0;
  const n = b.length;
  while (i < n) {
    const c = b[i]!;
    if (isWs(c)) { i++; continue; }
    if (c === 0x25) { while (i < n && b[i] !== 0x0a && b[i] !== 0x0d) i++; continue; }
    if (c === 0x28) {
      // string literal com aninhamento e escapes
      const out: number[] = [];
      let depth = 1;
      i++;
      while (i < n && depth > 0) {
        const d = b[i]!;
        if (d === 0x5c) {
          const e = b[i + 1];
          i += 2;
          if (e === undefined) break;
          if (e === 0x6e) out.push(0x0a);
          else if (e === 0x72) out.push(0x0d);
          else if (e === 0x74) out.push(0x09);
          else if (e === 0x62) out.push(0x08);
          else if (e === 0x66) out.push(0x0c);
          else if (e >= 0x30 && e <= 0x37) {
            let v = e - 0x30;
            for (let k = 0; k < 2 && b[i]! >= 0x30 && b[i]! <= 0x37; k++) v = v * 8 + (b[i++]! - 0x30);
            out.push(v & 0xff);
          } else if (e === 0x0d) { if (b[i] === 0x0a) i++; } else if (e !== 0x0a) out.push(e);
          continue;
        }
        if (d === 0x28) depth++;
        else if (d === 0x29 && --depth === 0) { i++; break; }
        out.push(d);
        i++;
      }
      yield { t: "str", v: Uint8Array.from(out) };
      continue;
    }
    if (c === 0x3c) {
      if (b[i + 1] === 0x3c) { i += 2; yield { t: "mark", v: "<<" }; continue; }
      let j = i + 1;
      while (j < n && b[j] !== 0x3e) j++;
      yield { t: "str", v: Uint8Array.from(hexToBytes(latin1(b.subarray(i + 1, j)))) };
      i = j + 1;
      continue;
    }
    if (c === 0x3e) { i += b[i + 1] === 0x3e ? 2 : 1; yield { t: "op", v: ">>" }; continue; }
    if (c === 0x5b) { i++; yield { t: "mark", v: "[" }; continue; }
    if (c === 0x5d) { i++; yield { t: "op", v: "]" }; continue; }
    if (c === 0x7b || c === 0x7d || c === 0x29) { i++; continue; }
    if (c === 0x2f) {
      let j = i + 1;
      while (j < n && !isWs(b[j]!) && !isDelim(b[j]!)) j++;
      yield { t: "name", v: latin1(b.subarray(i + 1, j)).replace(/#([0-9a-fA-F]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16))) };
      i = j;
      continue;
    }
    let j = i;
    while (j < n && !isWs(b[j]!) && !isDelim(b[j]!)) j++;
    if (j === i) { i++; continue; }
    const word = latin1(b.subarray(i, j));
    i = j;
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) { yield { t: "num", v: Number(word) }; continue; }
    if (word === "ID") {
      // imagem embutida: dados binários até "EI"
      let k = i + 1;
      while (k < n - 1 && !(b[k] === 0x45 && b[k + 1] === 0x49 && isWs(b[k - 1]!) && (k + 2 >= n || isWs(b[k + 2]!)))) k++;
      i = k + 2;
      continue;
    }
    yield { t: "op", v: word };
  }
}

interface Ctx {
  objects: Map<number, PdfObject>;
  out: string[];
  undecodable: number;
  decoded: number;
}

function resolveDict(objects: Map<number, PdfObject>, value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("<<")) return value;
  const n = refNum(value);
  return n !== undefined ? objects.get(n)?.dict : undefined;
}

function fontDecoders(objects: Map<number, PdfObject>, resources: string | undefined): Map<string, FontDecoder> {
  const out = new Map<string, FontDecoder>();
  const fonts = resolveDict(objects, resources ? dictValue(resources, "Font") : undefined);
  if (!fonts) return out;
  for (const m of fonts.matchAll(/\/([^\s/<>[\]()]+)\s+(\d+)\s+\d+\s+R/g)) {
    const font = objects.get(Number(m[2]))?.dict ?? "";
    const tu = objects.get(refNum(dictValue(font, "ToUnicode")) ?? -1);
    if (tu?.stream) out.set(m[1]!, cmapDecoder(parseToUnicode(latin1(tu.stream))));
    else if (/\/Subtype\s*\/Type0\b/.test(font) || /\/Identity-H\b/.test(font)) out.set(m[1]!, noDecoder);
    else out.set(m[1]!, singleByte);
  }
  return out;
}

function runContent(ctx: Ctx, content: Uint8Array, resources: string | undefined, depth: number) {
  const fonts = fontDecoders(ctx.objects, resources);
  let font: FontDecoder = singleByte;
  let lastY: number | null = null;
  const stack: Tok[] = [];
  const push = (s: string) => {
    if (s) ctx.out.push(s);
  };
  const newline = () => {
    if (ctx.out.length && ctx.out[ctx.out.length - 1] !== "\n") ctx.out.push("\n");
  };
  const space = () => {
    const last = ctx.out[ctx.out.length - 1];
    if (last && !/\s$/.test(last)) ctx.out.push(" ");
  };
  const show = (bytes: Uint8Array) => {
    const s = font.decode(bytes);
    if (font.undecodable) ctx.undecodable += bytes.length;
    else if (s.trim()) ctx.decoded += s.length;
    push(s);
  };
  for (const tok of tokens(content)) {
    if (tok.t === "op" && tok.v === "]") {
      const arr: Tok[] = [];
      while (stack.length && !(stack[stack.length - 1]!.t === "mark" && stack[stack.length - 1]!.v === "[")) arr.unshift(stack.pop()!);
      stack.pop();
      stack.push({ t: "arr", v: arr });
      continue;
    }
    if (tok.t === "op" && tok.v === ">>") {
      while (stack.length && !(stack[stack.length - 1]!.t === "mark" && stack[stack.length - 1]!.v === "<<")) stack.pop();
      stack.pop();
      continue;
    }
    if (tok.t !== "op") {
      stack.push(tok);
      if (stack.length > 4096) stack.splice(0, stack.length - 64);
      continue;
    }
    const args = stack.splice(0, stack.length);
    const num = (i: number) => {
      const a = args[args.length - i];
      return a?.t === "num" ? a.v : 0;
    };
    switch (tok.v) {
      case "Tf": {
        const name = args.find((a) => a.t === "name");
        font = (name?.t === "name" ? fonts.get(name.v) : undefined) ?? singleByte;
        break;
      }
      case "Td": case "TD":
        if (Math.abs(num(1)) > 0.01) newline(); else if (num(2) > 0) space();
        break;
      case "T*":
        newline();
        break;
      case "Tm": {
        const y = num(1);
        if (lastY !== null && Math.abs(y - lastY) > 0.5) newline(); else space();
        lastY = y;
        break;
      }
      case "Tj": {
        const s = args[args.length - 1];
        if (s?.t === "str") show(s.v);
        break;
      }
      case "'": case "\"": {
        newline();
        const s = args[args.length - 1];
        if (s?.t === "str") show(s.v);
        break;
      }
      case "TJ": {
        const a = args[args.length - 1];
        if (a?.t === "arr") for (const el of a.v) {
          if (el.t === "str") show(el.v);
          else if (el.t === "num" && el.v < -250) space();
        }
        break;
      }
      case "ET":
        space();
        break;
      case "Do": {
        if (depth >= 3) break;
        const name = args.find((a) => a.t === "name");
        const xobjects = resolveDict(ctx.objects, resources ? dictValue(resources, "XObject") : undefined);
        if (name?.t !== "name" || !xobjects) break;
        const ref = new RegExp(`/${name.v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(\\d+)\\s+\\d+\\s+R`).exec(xobjects);
        const xo = ref ? ctx.objects.get(Number(ref[1])) : undefined;
        if (xo?.stream && /\/Subtype\s*\/Form\b/.test(xo.dict)) runContent(ctx, xo.stream, resolveDict(ctx.objects, dictValue(xo.dict, "Resources")) ?? resources, depth + 1);
        break;
      }
      default:
        break;
    }
  }
}

function pageList(objects: Map<number, PdfObject>, src: string): number[] {
  const rootRef = [...src.matchAll(/\/Root\s+(\d+)\s+\d+\s+R/g)].at(-1);
  const pages: number[] = [];
  const seen = new Set<number>();
  const walk = (num: number) => {
    if (seen.has(num) || pages.length > 5000) return;
    seen.add(num);
    const d = objects.get(num)?.dict ?? "";
    if (/\/Type\s*\/Pages\b/.test(d)) refList(dictValue(d, "Kids")).forEach(walk);
    else if (/\/Type\s*\/Page\b/.test(d)) pages.push(num);
  };
  if (rootRef) {
    const catalog = objects.get(Number(rootRef[1]))?.dict ?? "";
    const top = refNum(dictValue(catalog, "Pages"));
    if (top !== undefined) walk(top);
  }
  if (pages.length) return pages;
  return [...objects.entries()].filter(([, o]) => /\/Type\s*\/Page(?![s\w])/.test(o.dict)).map(([n]) => n).sort((a, b) => a - b);
}

/** Recursos da página (herdados do nó /Pages pai quando a página não os declara). */
function pageResources(objects: Map<number, PdfObject>, pageDict: string): string | undefined {
  let d: string | undefined = pageDict;
  for (let i = 0; d && i < 32; i++) {
    const r = resolveDict(objects, dictValue(d, "Resources"));
    if (r) return r;
    d = objects.get(refNum(dictValue(d, "Parent")) ?? -1)?.dict;
  }
  return undefined;
}

export async function extractPdfText(bytes: Uint8Array, inflate: Inflate = browserInflate): Promise<PdfTextResult> {
  const head = latin1(bytes.subarray(0, 1024));
  if (!head.includes("%PDF-")) return { ok: false, reason: "NAO_E_PDF" };
  const src = latin1(bytes);
  if (/\/Encrypt\s*(?:\d+\s+\d+\s+R|<<)/.test(src)) return { ok: false, reason: "CIFRADO" };
  const objects = await parseObjects(bytes, src, inflate);
  const pages = pageList(objects, src);
  const ctx: Ctx = { objects, out: [], undecodable: 0, decoded: 0 };
  for (const p of pages) {
    const dict = objects.get(p)!.dict;
    const contents = dictValue(dict, "Contents");
    let refs = contents?.startsWith("[") ? refList(contents) : [refNum(contents)].filter((x): x is number => x !== undefined);
    // "/Contents 7 0 R" pode apontar para um ARRAY de fluxos
    if (refs.length === 1 && !objects.get(refs[0]!)?.stream && objects.get(refs[0]!)?.dict.startsWith("[")) refs = refList(objects.get(refs[0]!)!.dict);
    const resources = pageResources(objects, dict);
    for (const r of refs) {
      const s = objects.get(r)?.stream;
      if (s) runContent(ctx, s, resources, 0);
    }
    ctx.out.push("\n\n");
  }
  const text = ctx.out.join("").replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (text.replace(/[^\p{L}]/gu, "").length < 12) return { ok: false, reason: "SEM_TEXTO" };
  return { ok: true, text, pages: pages.length };
}
