/**
 * E-mail salvo (.eml, RFC 5322 + MIME) lido no navegador para o Autopiloto (RF30): cabeçalhos De/Para/Assunto/Data (com as
 * palavras codificadas da RFC 2047), partes multipart (prefere text/plain; text/html vira texto), base64 e quoted-printable, e
 * o charset de cada parte. O resultado vira um texto com cabeçalho "De:/Para:/Assunto:/Data:" que o extrator já entende.
 */
import { parseRfc2822Date, type IsoDate } from "./dates";

export interface EmlMessage { from?: string; to?: string; subject?: string; date?: IsoDate; body: string }

const latin1Of = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return s;
};
const bytesOf = (latin1: string) => Uint8Array.from(latin1, (c) => c.charCodeAt(0) & 0xff);

function decodeCharset(bytes: Uint8Array, charset?: string): string {
  const cs = (charset ?? "utf-8").trim().toLowerCase().replace(/^"|"$/g, "");
  try {
    return new TextDecoder(cs === "us-ascii" ? "utf-8" : cs).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

function base64Bytes(s: string): Uint8Array {
  try {
    return bytesOf(atob(s.replace(/[^A-Za-z0-9+/=]/g, "")));
  } catch {
    return new Uint8Array(0);
  }
}

function quotedPrintableBytes(s: string, header = false): Uint8Array {
  const src = header ? s.replace(/_/g, " ") : s.replace(/=\r?\n/g, "");
  const out: number[] = [];
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (c === "=" && /^[0-9A-Fa-f]{2}$/.test(src.slice(i + 1, i + 3))) {
      out.push(parseInt(src.slice(i + 1, i + 3), 16));
      i += 2;
    } else out.push(c.charCodeAt(0) & 0xff);
  }
  return Uint8Array.from(out);
}

/** Palavras codificadas da RFC 2047: "=?UTF-8?Q?Of=C3=ADcio?=" → "Ofício". */
export function decodeHeaderWords(value: string): string {
  return value
    .replace(/(=\?[^?]+\?[bBqQ]\?[^?]*\?=)\s+(?==\?)/g, "$1")
    .replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_, charset: string, enc: string, data: string) =>
      decodeCharset(enc.toUpperCase() === "B" ? base64Bytes(data) : quotedPrintableBytes(data, true), charset));
}

interface Part { headers: Map<string, string>; body: string }

function splitPart(raw: string): Part {
  const sep = /\r?\n\r?\n/.exec(raw);
  const head = sep ? raw.slice(0, sep.index) : raw;
  const body = sep ? raw.slice(sep.index + sep[0].length) : "";
  const headers = new Map<string, string>();
  let last = "";
  for (const line of head.split(/\r?\n/)) {
    if (/^[ \t]/.test(line) && last) {
      headers.set(last, `${headers.get(last)} ${line.trim()}`);
      continue;
    }
    const m = /^([!-9;-~]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    last = m[1]!.toLowerCase();
    if (!headers.has(last)) headers.set(last, m[2]!);
  }
  return { headers, body };
}

function param(value: string | undefined, name: string): string | undefined {
  if (!value) return undefined;
  const m = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|([^;\\s]+))`, "i").exec(value);
  return m ? (m[1] ?? m[2]) : undefined;
}

function decodeBody(part: Part): string {
  const cte = (part.headers.get("content-transfer-encoding") ?? "").toLowerCase();
  const charset = param(part.headers.get("content-type"), "charset");
  const bytes = cte.includes("base64") ? base64Bytes(part.body) : cte.includes("quoted-printable") ? quotedPrintableBytes(part.body) : bytesOf(part.body);
  return decodeCharset(bytes, charset);
}

const ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", ordm: "º", ordf: "ª", sect: "§", ndash: "–", mdash: "—", hellip: "…",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", acirc: "â", ecirc: "ê", ocirc: "ô", atilde: "ã", otilde: "õ", ccedil: "ç", agrave: "à",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Acirc: "Â", Ecirc: "Ê", Ocirc: "Ô", Atilde: "Ã", Otilde: "Õ", Ccedil: "Ç", Agrave: "À",
};

/** HTML de e-mail → texto (quebras de bloco viram linha; itens de lista ganham "• "). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/(p|div|tr|h[1-6]|ul|ol|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z]+);/g, (m, name: string) => ENTITIES[name] ?? m)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function textOf(part: Part, depth = 0): string | null {
  const type = (part.headers.get("content-type") ?? "text/plain").toLowerCase();
  if (type.startsWith("multipart/") && depth < 5) {
    const boundary = param(part.headers.get("content-type"), "boundary");
    if (!boundary) return null;
    const pieces = part.body.split(new RegExp(`\\r?\\n?--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:--)?[ \\t]*\\r?\\n?`)).slice(1).map(splitPart);
    const plain = pieces.find((p) => (p.headers.get("content-type") ?? "text/plain").toLowerCase().startsWith("text/plain") && !/attachment/i.test(p.headers.get("content-disposition") ?? ""));
    if (plain) return decodeBody(plain);
    for (const p of pieces) {
      const t = textOf(p, depth + 1);
      if (t) return t;
    }
    return null;
  }
  if (type.startsWith("text/html")) return htmlToText(decodeBody(part));
  if (type.startsWith("text/")) return decodeBody(part);
  return null;
}

export function parseEml(bytes: Uint8Array): EmlMessage {
  const part = splitPart(latin1Of(bytes));
  const h = (name: string) => {
    const v = part.headers.get(name);
    return v ? decodeHeaderWords(decodeCharset(bytesOf(v), "utf-8")).trim() || undefined : undefined;
  };
  const dateRaw = part.headers.get("date");
  return {
    from: h("from"),
    to: h("to"),
    subject: h("subject"),
    date: dateRaw ? (parseRfc2822Date(dateRaw) ?? undefined) : undefined,
    body: (textOf(part) ?? "").replace(/\r\n?/g, "\n").trim(),
  };
}

/** Texto para o extrator: cabeçalho "De/Para/Assunto/Data" (rótulos fixos que o extrator reconhece) + corpo. */
export function emlToText(msg: EmlMessage): string {
  const [y, m, d] = (msg.date ?? "").split("-");
  const head = [
    msg.from ? `De: ${msg.from}` : "",
    msg.to ? `Para: ${msg.to}` : "",
    msg.subject ? `Assunto: ${msg.subject}` : "",
    msg.date ? `Data: ${d}/${m}/${y}` : "",
  ].filter(Boolean);
  return `${head.join("\n")}${head.length ? "\n\n" : ""}${msg.body}`;
}
