/**
 * "Fotografia do topo da planilha" (.xlsx) no navegador, sem biblioteca: o pacote é um ZIP (lido por `lib/letters/io/zip.ts`, com
 * as defesas de bomba de descompressão, criptografia e CRC) e cada parte é XML estrito (`lib/letters/io/xml.ts`, sem DTD nem
 * entidades externas). Lê `xl/workbook.xml` (primeira aba VISÍVEL), as relações, `xl/sharedStrings.xml`, `xl/styles.xml` (formatos
 * de número/data básicos) e a aba, e devolve as primeiras linhas × colunas com os valores EM CACHE das fórmulas — fórmula nunca é
 * executada. Recusa com motivo: ZIP inválido, bomba de descompressão, macro (.xlsm / vbaProject.bin) e arquivo criptografado.
 * Para não analisar uma aba enorme inteira, só os XML das primeiras linhas são interpretados; o total de linhas vem de `<dimension>`
 * ou do último `<row r>`.
 */
import { childEls, local, parseXml, textOf, type XmlElement } from "@/lib/letters/io/xml";
import { openZip, ZipError, type ZipArchive } from "@/lib/letters/io/zip";

export type XlsxRefusal = "ZIP_INVALIDO" | "BOMBA" | "MACRO" | "CRIPTOGRAFADO" | "SEM_ABA" | "XML_INVALIDO" | "GRANDE_DEMAIS" | "SEM_SUPORTE";
export class XlsxError extends Error {
  constructor(readonly code: XlsxRefusal, detail = "") {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "XlsxError";
  }
}

export type CellValue =
  | { kind: "empty" }
  | { kind: "text"; text: string }
  | { kind: "number"; value: number; format: NumberFormat }
  | { kind: "date"; iso: string; time: boolean }
  | { kind: "bool"; value: boolean }
  | { kind: "error"; code: string };
export type NumberFormat = "general" | "integer" | "decimal2" | "thousands" | "thousands2" | "percent" | "percent1" | "percent2" | "text";

export interface XlsxCell { ref: string; value: CellValue; formula: boolean; rowSpan?: number; colSpan?: number; covered?: boolean }
export interface XlsxSnapshot {
  sheetName: string;
  sheetCount: number;
  /** linhas mostradas (1..rows) */
  rows: number;
  cols: number;
  totalRows: number;
  totalCols: number;
  /** grade [linha][coluna], já com as mesclagens resolvidas dentro da janela */
  grid: XlsxCell[][];
  /** fórmulas sem valor em cache (a planilha nunca foi recalculada e salva) */
  formulasWithoutCache: number;
}

export const XLSX_LIMITS = { maxBytes: 20 * 1024 * 1024, rows: 20, cols: 10 } as const;

/* ── referências A1 ───────────────────────────────────────────────────────────────────────────── */

export function columnLetters(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function columnIndex(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** "B12" → { row: 11, col: 1 } (base 0); `null` se não é referência. */
export function parseRef(ref: string): { row: number; col: number } | null {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d{1,7})$/.exec(ref.trim());
  if (!m) return null;
  return { row: Number(m[2]) - 1, col: columnIndex(m[1]!) };
}

/* ── formatos de número ───────────────────────────────────────────────────────────────────────── */

const BUILTIN_DATE = new Set([14, 15, 16, 17, 22, 27, 30, 36, 50, 57]);
const BUILTIN_TIME = new Set([18, 19, 20, 21, 45, 46, 47]);
const BUILTIN: Record<number, NumberFormat> = { 0: "general", 1: "integer", 2: "decimal2", 3: "thousands", 4: "thousands2", 9: "percent", 10: "percent2", 49: "text" };

export type StyleFormat = { kind: "date"; time: boolean } | { kind: "time" } | { kind: "number"; format: NumberFormat };

/** Classifica um código de formato personalizado (ex.: `dd/mm/yyyy`, `0.0%`, `#,##0.00`). */
export function classifyFormatCode(code: string): StyleFormat {
  const clean = code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "").replace(/\\./g, "").split(";")[0]!;
  if (/[dy]/i.test(clean) || (/m/i.test(clean) && !/[0#]/.test(clean))) return { kind: "date", time: /[hs]/i.test(clean) };
  if (/[hs]/i.test(clean)) return { kind: "time" };
  if (clean.includes("%")) {
    const dec = /\.(0+)/.exec(clean)?.[1]?.length ?? 0;
    return { kind: "number", format: dec === 0 ? "percent" : dec === 1 ? "percent1" : "percent2" };
  }
  if (clean === "@") return { kind: "number", format: "text" };
  const thousands = clean.includes(",");
  const decimals = /\.0/.test(clean);
  if (!/[0#]/.test(clean)) return { kind: "number", format: "general" };
  return { kind: "number", format: thousands ? (decimals ? "thousands2" : "thousands") : decimals ? "decimal2" : "integer" };
}

export function styleFormatOf(numFmtId: number, custom: ReadonlyMap<number, string>): StyleFormat {
  const code = custom.get(numFmtId);
  if (code !== undefined) return classifyFormatCode(code);
  if (BUILTIN_DATE.has(numFmtId)) return { kind: "date", time: numFmtId === 22 };
  if (BUILTIN_TIME.has(numFmtId)) return { kind: "time" };
  return { kind: "number", format: BUILTIN[numFmtId] ?? "general" };
}

/** Número de série do Excel → data ISO (sistema 1900, com o falso 29/02/1900, ou 1904). */
export function serialToIso(serial: number, date1904 = false, withTime = false): string {
  const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  const s = !date1904 && serial < 60 ? serial + 1 : serial;
  const ms = Math.round(s * 86_400_000);
  const iso = new Date(base + ms).toISOString();
  return withTime ? iso.slice(0, 16).replace("T", " ") : iso.slice(0, 10);
}

/* ── leitura ──────────────────────────────────────────────────────────────────────────────────── */

const isOle = (b: Uint8Array) => b.length >= 8 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;

function parse(xml: string, what: string): XmlElement {
  try {
    return parseXml(xml);
  } catch {
    throw new XlsxError("XML_INVALIDO", what);
  }
}

const el = (parent: XmlElement | undefined, name: string): XmlElement | undefined => (parent ? parent.children.find((c): c is XmlElement => typeof c === "object" && local(c.name) === name) : undefined);
const els = (parent: XmlElement | undefined, name: string): XmlElement[] => (parent ? childEls(parent).filter((c) => local(c.name) === name) : []);
const attr = (e: XmlElement, name: string) => {
  for (const [k, v] of Object.entries(e.attrs)) if (local(k) === name && !k.startsWith("xmlns")) return v;
  return undefined;
};

async function readPart(zip: ZipArchive, name: string): Promise<string | undefined> {
  try {
    return await zip.readText(name);
  } catch (e) {
    if (e instanceof ZipError) throw mapZipError(e);
    throw e;
  }
}

function mapZipError(e: ZipError): XlsxError {
  if (e.code === "ZIP_GRANDE_DEMAIS") return new XlsxError("BOMBA", e.message);
  if (e.code === "ZIP_CRIPTOGRAFADO") return new XlsxError("CRIPTOGRAFADO");
  if (e.code === "ZIP_METODO" && /DecompressionStream/.test(e.message)) return new XlsxError("SEM_SUPORTE");
  return new XlsxError("ZIP_INVALIDO", e.message);
}

function resolveTarget(target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = `xl/${target}`.split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p && p !== ".") out.push(p);
  }
  return out.join("/");
}

/** Linhas da `<sheetData>` por expressão regular (sem analisar a aba inteira): cada `<row>` com seu número. */
function scanRows(sheet: string): { r: number; xml: string }[] {
  const rows: { r: number; xml: string }[] = [];
  const re = /<((?:[A-Za-z_][\w.-]*:)?row)\b([^>]*?)(\/>|>([\s\S]*?)<\/\1>)/g;
  let m: RegExpExecArray | null;
  let auto = 0;
  while ((m = re.exec(sheet))) {
    const rAttr = /\sr="(\d+)"/.exec(m[2]!);
    const r = rAttr ? Number(rAttr[1]) : auto + 1;
    auto = r;
    rows.push({ r, xml: m[0] });
  }
  return rows;
}

export interface ReadOptions { rows?: number; cols?: number }

/** Lê os bytes de um .xlsx e devolve a fotografia do topo da primeira aba visível. Lança `XlsxError` com o motivo. */
export async function readXlsxTop(bytes: Uint8Array, opts: ReadOptions = {}): Promise<XlsxSnapshot> {
  const maxRows = opts.rows ?? XLSX_LIMITS.rows;
  const maxCols = opts.cols ?? XLSX_LIMITS.cols;
  if (bytes.length > XLSX_LIMITS.maxBytes) throw new XlsxError("GRANDE_DEMAIS");
  if (isOle(bytes)) throw new XlsxError("CRIPTOGRAFADO", "pacote OLE (planilha protegida por senha ou formato antigo)");
  let zip: ZipArchive;
  try {
    zip = openZip(bytes);
  } catch (e) {
    if (e instanceof ZipError) throw mapZipError(e);
    throw new XlsxError("ZIP_INVALIDO");
  }
  if ([...zip.entries.keys()].some((n) => /(^|\/)vbaProject\.bin$/i.test(n))) throw new XlsxError("MACRO");
  if (zip.entries.has("EncryptionInfo") || zip.entries.has("EncryptedPackage")) throw new XlsxError("CRIPTOGRAFADO");
  const types = await readPart(zip, "[Content_Types].xml");
  if (types && /macroEnabled/i.test(types)) throw new XlsxError("MACRO");

  const wbXml = await readPart(zip, "xl/workbook.xml");
  if (!wbXml) throw new XlsxError("ZIP_INVALIDO", "xl/workbook.xml ausente");
  const wb = parse(wbXml, "workbook");
  const date1904 = ["1", "true"].includes(attr(el(wb, "workbookPr") ?? { name: "", attrs: {}, children: [] }, "date1904") ?? "");
  const sheets = els(el(wb, "sheets"), "sheet");
  const visible = sheets.find((s) => !["hidden", "veryHidden"].includes(attr(s, "state") ?? ""));
  if (!visible) throw new XlsxError("SEM_ABA");
  const rid = attr(visible, "id");
  const relsXml = await readPart(zip, "xl/_rels/workbook.xml.rels");
  let sheetPath: string | undefined;
  if (relsXml && rid) {
    const rels = parse(relsXml, "rels");
    const rel = els(rels, "Relationship").find((r) => attr(r, "Id") === rid);
    const target = rel ? attr(rel, "Target") : undefined;
    if (target) sheetPath = resolveTarget(target);
  }
  sheetPath ??= `xl/worksheets/sheet${sheets.indexOf(visible) + 1}.xml`;
  if (!zip.entries.has(sheetPath)) throw new XlsxError("SEM_ABA", sheetPath);

  // textos compartilhados
  const shared: string[] = [];
  const ssXml = await readPart(zip, "xl/sharedStrings.xml");
  if (ssXml) {
    const ss = parse(ssXml, "sharedStrings");
    for (const si of els(ss, "si")) {
      const t = el(si, "t");
      shared.push(t ? textOf(t) : els(si, "r").map((r) => { const rt = el(r, "t"); return rt ? textOf(rt) : ""; }).join(""));
    }
  }

  // estilos: índice da célula → formato
  const custom = new Map<number, string>();
  const xfFormats: StyleFormat[] = [];
  const stylesXml = await readPart(zip, "xl/styles.xml");
  if (stylesXml) {
    const st = parse(stylesXml, "styles");
    for (const f of els(el(st, "numFmts"), "numFmt")) custom.set(Number(attr(f, "numFmtId")), attr(f, "formatCode") ?? "");
    for (const xf of els(el(st, "cellXfs"), "xf")) xfFormats.push(styleFormatOf(Number(attr(xf, "numFmtId") ?? 0), custom));
  }

  const sheetXml = (await readPart(zip, sheetPath)) ?? "";
  const allRows = scanRows(sheetXml);
  const dim = /<(?:[A-Za-z_][\w.-]*:)?dimension\b[^>]*\sref="([^"]+)"/.exec(sheetXml)?.[1];
  const dimEnd = dim ? parseRef(dim.split(":").at(-1)!) : null;
  const lastRow = allRows.length ? allRows[allRows.length - 1]!.r : 0;
  const totalRows = Math.max(lastRow, dimEnd ? dimEnd.row + 1 : 0);

  const values = new Map<string, { value: CellValue; formula: boolean }>();
  let formulasWithoutCache = 0;
  let maxColSeen = dimEnd ? dimEnd.col + 1 : 0;
  for (const row of allRows) {
    if (row.r > maxRows) break;
    const rowEl = parse(row.xml, `linha ${row.r}`);
    let autoCol = -1;
    for (const c of els(rowEl, "c")) {
      const ref = attr(c, "r");
      const pos = ref ? parseRef(ref) : { row: row.r - 1, col: autoCol + 1 };
      if (!pos) continue;
      autoCol = pos.col;
      maxColSeen = Math.max(maxColSeen, pos.col + 1);
      if (pos.col >= maxCols) continue;
      const t = attr(c, "t") ?? "n";
      const f = el(c, "f");
      const vEl = el(c, "v");
      const v = vEl ? textOf(vEl) : undefined;
      const style = xfFormats[Number(attr(c, "s") ?? 0)] ?? { kind: "number", format: "general" };
      let value: CellValue = { kind: "empty" };
      if (t === "s" && v !== undefined) value = { kind: "text", text: shared[Number(v)] ?? "" };
      else if (t === "inlineStr") {
        const is = el(c, "is");
        const it = is ? el(is, "t") : undefined;
        value = { kind: "text", text: it ? textOf(it) : is ? els(is, "r").map((r) => { const rt = el(r, "t"); return rt ? textOf(rt) : ""; }).join("") : "" };
      } else if (t === "str" && v !== undefined) value = { kind: "text", text: v };
      else if (t === "b" && v !== undefined) value = { kind: "bool", value: v === "1" };
      else if (t === "e" && v !== undefined) value = { kind: "error", code: v };
      else if (v !== undefined && v.trim() !== "") {
        const num = Number(v);
        if (!Number.isFinite(num)) value = { kind: "text", text: v };
        else if (style.kind === "date") value = { kind: "date", iso: serialToIso(num, date1904, style.time), time: style.time };
        else if (style.kind === "time") value = { kind: "date", iso: serialToIso(num, date1904, true).slice(11), time: true };
        else value = { kind: "number", value: num, format: style.format };
      }
      if (f && v === undefined) formulasWithoutCache += 1;
      values.set(`${pos.row}:${pos.col}`, { value, formula: !!f });
    }
  }

  const rows = Math.min(maxRows, totalRows);
  const cols = Math.min(maxCols, Math.max(maxColSeen, 1));
  const grid: XlsxCell[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const v = values.get(`${r}:${c}`);
      return { ref: `${columnLetters(c)}${r + 1}`, value: v?.value ?? { kind: "empty" }, formula: v?.formula ?? false };
    }));

  // mesclagens simples dentro da janela mostrada (a parte de fora é cortada)
  const mergeRe = /<(?:[A-Za-z_][\w.-]*:)?mergeCell\b[^>]*\sref="([A-Za-z$]+\d+):([A-Za-z$]+\d+)"/g;
  let mm: RegExpExecArray | null;
  while ((mm = mergeRe.exec(sheetXml))) {
    const a = parseRef(mm[1]!);
    const b = parseRef(mm[2]!);
    if (!a || !b || a.row >= rows || a.col >= cols) continue;
    const r2 = Math.min(b.row, rows - 1);
    const c2 = Math.min(b.col, cols - 1);
    if (r2 < a.row || c2 < a.col) continue;
    const head = grid[a.row]![a.col]!;
    if (head.covered) continue;
    head.rowSpan = r2 - a.row + 1;
    head.colSpan = c2 - a.col + 1;
    for (let r = a.row; r <= r2; r++) for (let c = a.col; c <= c2; c++) if (r !== a.row || c !== a.col) grid[r]![c]!.covered = true;
  }

  return {
    sheetName: attr(visible, "name") ?? "", sheetCount: sheets.length, rows, cols, totalRows, totalCols: Math.max(maxColSeen, cols), grid, formulasWithoutCache,
  };
}

/** Texto de uma célula no idioma da tela (número/percentual/data pelo Intl; erro como veio, ex.: `#DIV/0!`). */
export function formatCell(v: CellValue, intl: string): string {
  switch (v.kind) {
    case "empty": return "";
    case "text": return v.text;
    case "bool": return v.value ? "TRUE" : "FALSE";
    case "error": return v.code;
    case "date": {
      if (v.iso.length <= 8) return v.iso.slice(0, 5);
      const [d, time] = v.iso.split(" ");
      const day = new Intl.DateTimeFormat(intl, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
      return time ? `${day} ${time}` : day;
    }
    case "number": {
      const f = v.format;
      if (f === "text") return String(v.value);
      if (f === "percent" || f === "percent1" || f === "percent2") {
        const d = f === "percent" ? 0 : f === "percent1" ? 1 : 2;
        return new Intl.NumberFormat(intl, { style: "percent", minimumFractionDigits: d, maximumFractionDigits: d }).format(v.value);
      }
      if (f === "integer") return new Intl.NumberFormat(intl, { maximumFractionDigits: 0, useGrouping: false }).format(v.value);
      if (f === "decimal2") return new Intl.NumberFormat(intl, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false }).format(v.value);
      if (f === "thousands") return new Intl.NumberFormat(intl, { maximumFractionDigits: 0 }).format(v.value);
      if (f === "thousands2") return new Intl.NumberFormat(intl, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v.value);
      return new Intl.NumberFormat(intl, { maximumFractionDigits: 10, useGrouping: false }).format(v.value);
    }
  }
}
