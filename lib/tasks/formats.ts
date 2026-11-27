/**
 * Formatos de entrega: FAMÍLIA → VARIANTE (docs/produto/FORMATOS_E_VARIANTES.md). Catálogo como dado puro: cada variante tem família,
 * extensões, MIME, se o pipeline de mídia já reconhece o tipo real (`DetectedType`, D-67) e os CAMPOS PRÓPRIOS que fazem sentido no
 * criador e na entrega; a família tem os campos comuns às suas variantes. Os valores viram critérios de aceite sugeridos (texto montado
 * a partir do que a pessoa escolheu, nunca inventado).
 *
 * Gravação: colunas próprias da tarefa no backend — `formatFamily`, `formatVariant` e `formatDetailsJson` (códigos deste catálogo,
 * validados de novo no servidor, V71). Tarefas gravadas antes da V71 guardavam o formato em `extensions.fileFormat`
 * (`family=…&variant=…&<campo>=…`): a leitura ainda o aceita e, ao salvar de novo, o formato passa para as colunas e o espelho some.
 * A troca fica num lugar só: `formatToRequest`/`formatFromView`.
 */

import { isAcceptedExtension } from "./accepted";

export const FORMAT_FAMILIES = ["PLANILHA", "DOCUMENTO", "APRESENTACAO", "IMAGEM", "DESENHO_TECNICO", "DADOS", "AUDIO_VIDEO", "PACOTE", "LINK", "OUTRO"] as const;
export type FormatFamilyId = (typeof FORMAT_FAMILIES)[number];

/** Códigos curtos de variante (os mesmos do backend, `formatVariant`). A mesma variante pode existir em mais de uma família (PDF). */
export const FORMAT_VARIANT_CODES = [
  "XLSX", "XLS", "XLSM", "ODS", "CSV", "TSV", "DOCX", "DOC", "ODT", "PDF", "PDF_A", "RTF", "MD", "TXT", "HTML", "PPTX", "ODP", "PNG", "JPG",
  "SVG", "WEBP", "DWG", "DXF", "IFC", "GLB", "JSON", "XML", "MP3", "WAV", "M4A", "MP4", "WEBM", "MOV", "ZIP", "URL",
] as const;
export type FormatVariantCode = (typeof FORMAT_VARIANT_CODES)[number];

export type FormatFieldKind = "select" | "text" | "number" | "bool";
export interface FormatField {
  /** chave estável (vai para os detalhes do formato); também o sufixo das chaves de i18n `taskForm.fmt.field.<key>` */
  key: string;
  kind: FormatFieldKind;
  /** valores do select (rótulos em `taskForm.fmt.opt.<key>.<valor>`) */
  options?: readonly string[];
  /** limites do número */
  min?: number;
  max?: number;
}

export interface FormatVariant {
  code: FormatVariantCode;
  family: FormatFamilyId;
  /** extensões aceitas (a primeira é a canônica); variante por link usa `url` */
  extensions: readonly string[];
  mime: readonly string[];
  /** o tipo real é conferido pelo conteúdo no upload (`DetectedType` no backend, D-67) */
  detected: boolean;
  /** recusada pelo pipeline (macro): pode ser registrada, mas o envio do arquivo é recusado */
  refused?: boolean;
  fields: readonly FormatField[];
}

const bool = (key: string): FormatField => ({ key, kind: "bool" });
const num = (key: string, min: number, max: number): FormatField => ({ key, kind: "number", min, max });
const sel = (key: string, options: readonly string[]): FormatField => ({ key, kind: "select", options });
const text = (key: string): FormatField => ({ key, kind: "text" });

const ENCODING = sel("encoding", ["UTF8", "UTF8BOM", "LATIN1"]);
const DELIMITER = sel("delimiter", ["SEMICOLON", "COMMA", "TAB", "PIPE"]);
const DECIMAL = sel("decimal", ["COMMA", "DOT"]);
const CAD_VERSION = sel("cadVersion", ["AC1032", "AC1027", "AC1024", "AC1021"]);

/** Campos comuns da família (valem para todas as suas variantes). */
export const FORMAT_FAMILY_FIELDS: Record<FormatFamilyId, readonly FormatField[]> = {
  PLANILHA: [bool("headerRow")],
  DOCUMENTO: [num("pages", 1, 5000)],
  APRESENTACAO: [num("slides", 1, 500)],
  IMAGEM: [num("minWidth", 1, 20000), num("minHeight", 1, 20000)],
  DESENHO_TECNICO: [sel("unit", ["MM", "CM", "M", "IN", "FT"]), text("scale")],
  DADOS: [ENCODING],
  AUDIO_VIDEO: [num("durationMin", 1, 600)],
  PACOTE: [text("contents")],
  LINK: [bool("linkAccess")],
  OUTRO: [text("description")],
};

const SHEET_OFFICE = [text("sheets"), bool("formulas"), bool("protected")];
/** `detected` (o servidor aceita e confere o tipo real) vem da lista única de `accepted.ts`, espelho do `DetectedType` do backend. */
const v = (code: FormatVariantCode, family: FormatFamilyId, extensions: readonly string[], mime: readonly string[], fields: readonly FormatField[] = [], refused?: boolean): FormatVariant =>
  ({ code, family, extensions, mime, detected: extensions.some(isAcceptedExtension), fields, ...(refused ? { refused } : {}) });

export const FORMAT_VARIANTS: readonly FormatVariant[] = [
  v("XLSX", "PLANILHA", ["xlsx"], ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], SHEET_OFFICE),
  v("XLS", "PLANILHA", ["xls"], ["application/vnd.ms-excel"], SHEET_OFFICE),
  v("XLSM", "PLANILHA", ["xlsm"], ["application/vnd.ms-excel.sheet.macroEnabled.12"], SHEET_OFFICE, true),
  v("ODS", "PLANILHA", ["ods"], ["application/vnd.oasis.opendocument.spreadsheet"], SHEET_OFFICE),
  v("CSV", "PLANILHA", ["csv"], ["text/csv"], [DELIMITER, ENCODING, DECIMAL]),
  v("TSV", "PLANILHA", ["tsv"], ["text/tab-separated-values"], [ENCODING, DECIMAL]),

  v("DOCX", "DOCUMENTO", ["docx"], ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], [text("template"), bool("trackChanges")]),
  v("DOC", "DOCUMENTO", ["doc"], ["application/msword"], [text("template")]),
  v("ODT", "DOCUMENTO", ["odt"], ["application/vnd.oasis.opendocument.text"], [text("template"), bool("trackChanges")]),
  v("PDF", "DOCUMENTO", ["pdf"], ["application/pdf"], [bool("signed"), bool("textLayer")]),
  v("PDF_A", "DOCUMENTO", ["pdf"], ["application/pdf"], [sel("pdfaLevel", ["1B", "2B", "3B"]), bool("signed"), bool("textLayer")]),
  v("RTF", "DOCUMENTO", ["rtf"], ["application/rtf"]),
  v("MD", "DOCUMENTO", ["md"], ["text/markdown"], [ENCODING]),
  v("TXT", "DOCUMENTO", ["txt"], ["text/plain"], [ENCODING]),
  v("HTML", "DOCUMENTO", ["html", "htm"], ["text/html"], [ENCODING]),

  v("PPTX", "APRESENTACAO", ["pptx"], ["application/vnd.openxmlformats-officedocument.presentationml.presentation"], [text("template")]),
  v("ODP", "APRESENTACAO", ["odp"], ["application/vnd.oasis.opendocument.presentation"], [text("template")]),
  v("PDF", "APRESENTACAO", ["pdf"], ["application/pdf"]),

  v("PNG", "IMAGEM", ["png"], ["image/png"], [bool("transparency")]),
  v("JPG", "IMAGEM", ["jpg", "jpeg"], ["image/jpeg"]),
  v("SVG", "IMAGEM", ["svg"], ["image/svg+xml"], [bool("transparency")]),
  v("WEBP", "IMAGEM", ["webp"], ["image/webp"], [bool("transparency")]),

  v("DWG", "DESENHO_TECNICO", ["dwg"], ["image/vnd.dwg"], [CAD_VERSION]),
  v("DXF", "DESENHO_TECNICO", ["dxf"], ["image/vnd.dxf"], [CAD_VERSION]),
  v("IFC", "DESENHO_TECNICO", ["ifc"], ["application/x-step"], [sel("ifcSchema", ["IFC2X3", "IFC4", "IFC4X3"])]),
  v("GLB", "DESENHO_TECNICO", ["glb"], ["model/gltf-binary"]),
  v("PDF", "DESENHO_TECNICO", ["pdf"], ["application/pdf"], [sel("paper", ["A0", "A1", "A2", "A3", "A4"]), bool("signed")]),

  v("JSON", "DADOS", ["json"], ["application/json"], [text("schemaUrl")]),
  v("XML", "DADOS", ["xml"], ["application/xml", "text/xml"], [text("schemaUrl")]),
  v("CSV", "DADOS", ["csv"], ["text/csv"], [DELIMITER, bool("headerRow"), DECIMAL]),

  v("MP3", "AUDIO_VIDEO", ["mp3"], ["audio/mpeg"], [bool("transcript")]),
  v("WAV", "AUDIO_VIDEO", ["wav"], ["audio/wav"], [bool("transcript")]),
  v("M4A", "AUDIO_VIDEO", ["m4a"], ["audio/mp4"], [bool("transcript")]),
  v("MP4", "AUDIO_VIDEO", ["mp4"], ["video/mp4"], [bool("captions")]),
  v("WEBM", "AUDIO_VIDEO", ["webm"], ["video/webm"], [bool("captions")]),
  v("MOV", "AUDIO_VIDEO", ["mov"], ["video/quicktime"], [bool("captions")]),

  v("ZIP", "PACOTE", ["zip"], ["application/zip"], [num("maxFiles", 1, 10000)]),

  v("URL", "LINK", ["url"], ["text/uri-list"], [text("platform")]),
];

/** Variante da família (a mesma sigla pode existir em mais de uma família: PDF de documento, de apresentação e de prancha). */
export const variantOf = (family: FormatFamilyId | "" | null | undefined, code: string | null | undefined): FormatVariant | undefined =>
  family && code ? FORMAT_VARIANTS.find((x) => x.family === family && x.code === code) : undefined;
export const variantsOf = (family: FormatFamilyId | ""): FormatVariant[] => FORMAT_VARIANTS.filter((x) => x.family === family);
export const isFormatFamily = (x: string | null | undefined): x is FormatFamilyId => !!x && (FORMAT_FAMILIES as readonly string[]).includes(x);

/** Campos que valem para a variante: os comuns da família seguidos dos próprios (sem repetir chave). */
export function fieldsFor(family: FormatFamilyId | "", variant: string): FormatField[] {
  if (!family) return [];
  const own = variantOf(family, variant)?.fields ?? [];
  const seen = new Set<string>();
  return [...FORMAT_FAMILY_FIELDS[family], ...own].filter((f) => (seen.has(f.key) ? false : (seen.add(f.key), true)));
}

/** Formato escolhido (família, variante e detalhes). `details` guarda texto ("true"/"false" nos booleanos). */
export interface FormatChoice { family: FormatFamilyId | ""; variant: FormatVariantCode | ""; details: Record<string, string> }
export const emptyFormat = (): FormatChoice => ({ family: "", variant: "", details: {} });

/**
 * Troca de família/variante: preserva os detalhes dos campos que continuam valendo e descarta os outros, dizendo quais foram
 * descartados (a tela avisa). Variante que não é da família fica vazia.
 */
export function changeFormat(cur: FormatChoice, family: FormatFamilyId | "", variant: string): { next: FormatChoice; dropped: string[] } {
  const code = (variantOf(family, variant)?.code ?? "") as FormatVariantCode | "";
  const keep = new Set(fieldsFor(family, code).map((f) => f.key));
  const details: Record<string, string> = {};
  const dropped: string[] = [];
  for (const [k, val] of Object.entries(cur.details)) {
    if (!val) continue;
    if (keep.has(k)) details[k] = val;
    else dropped.push(k);
  }
  return { next: { family, variant: code, details }, dropped };
}

export function fieldValueValid(f: FormatField, val: string): boolean {
  if (!val) return true;
  switch (f.kind) {
    case "bool": return val === "true" || val === "false";
    case "select": return (f.options ?? []).includes(val);
    case "number": {
      const n = Number(val);
      return Number.isInteger(n) && n >= (f.min ?? 0) && n <= (f.max ?? Number.MAX_SAFE_INTEGER);
    }
    case "text": return val.length <= 200;
  }
}

/** Só os detalhes que valem para a família/variante e têm valor válido. */
export function cleanDetails(f: FormatChoice): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of fieldsFor(f.family, f.variant)) {
    const val = (f.details[field.key] ?? "").trim();
    if (val && fieldValueValid(field, val)) out[field.key] = val;
  }
  return out;
}

/** Normaliza um formato vindo de fora (projeto, visão da API, rascunho): códigos fora do catálogo viram vazio. */
export function normalizeFormat(raw: { family?: unknown; variant?: unknown; details?: unknown } | null | undefined): FormatChoice {
  const family = typeof raw?.family === "string" && isFormatFamily(raw.family) ? raw.family : "";
  if (!family) return emptyFormat();
  const variant = (variantOf(family, typeof raw?.variant === "string" ? raw.variant : "")?.code ?? "") as FormatVariantCode | "";
  const details = raw?.details && typeof raw.details === "object"
    ? Object.fromEntries(Object.entries(raw.details as Record<string, unknown>).filter(([, x]) => typeof x === "string") as [string, string][])
    : {};
  return { family, variant, details: cleanDetails({ family, variant, details }) };
}

/** Campos com valor inválido (chaves), na ordem da tela. */
export function invalidFormatFields(f: FormatChoice): string[] {
  return fieldsFor(f.family, f.variant).filter((field) => !fieldValueValid(field, f.details[field.key] ?? "")).map((field) => field.key);
}

// ---------- adaptador da tarefa (um lugar só para trocar quando a API tiver os campos) ----------

/** Chave de `extensions` onde tarefas anteriores às colunas próprias (V71) guardavam o formato; só lida, nunca mais gravada. */
export const FORMAT_EXTENSION_KEY = "fileFormat";

/** Formato → valor do espelho em `extensions` (`family=…&variant=…&<campo>=…`); vazio sem família. */
export function packFormat(f: FormatChoice): string {
  if (!f.family) return "";
  const p = new URLSearchParams();
  p.set("family", f.family);
  if (f.variant) p.set("variant", f.variant);
  for (const [k, val] of Object.entries(cleanDetails(f))) p.set(k, val);
  return p.toString();
}

export function unpackFormat(raw: string | undefined): FormatChoice {
  if (!raw) return emptyFormat();
  const p = new URLSearchParams(raw);
  const details: Record<string, string> = {};
  p.forEach((val, k) => { if (k !== "family" && k !== "variant") details[k] = val; });
  return normalizeFormat({ family: p.get("family"), variant: p.get("variant"), details });
}

/** Colunas de formato da visão da tarefa (`TaskView.formatFamily`…). */
interface FormatColumns { formatFamily?: string | null; formatVariant?: string | null; formatDetailsJson?: string | null }

/** Limite do servidor para `formatDetailsJson` (CHECK da V71). */
export const MAX_FORMAT_DETAILS_JSON = 2000;

/** Parte do corpo de `POST/PUT /api/tasks` com o formato; sem família, nada (o PUT grava sem formato). */
export interface FormatRequestFields { formatFamily?: FormatFamilyId; formatVariant?: FormatVariantCode; formatDetailsJson?: string }

/** Formato → colunas próprias do corpo de `POST/PUT /api/tasks` (só os campos válidos da variante; detalhes em JSON de textos). */
export function formatToRequest(f: FormatChoice): FormatRequestFields {
  if (!f.family) return {};
  const details = cleanDetails(f);
  return {
    formatFamily: f.family,
    ...(f.variant ? { formatVariant: f.variant } : {}),
    ...(Object.keys(details).length ? { formatDetailsJson: JSON.stringify(details) } : {}),
  };
}

/** JSON de detalhes → objeto de textos; inválido ou que não é objeto = vazio. */
function parseDetails(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    return Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === "string" || typeof x === "number" || typeof x === "boolean").map(([k, x]) => [k, String(x)]));
  } catch {
    return {};
  }
}

/** Visão da tarefa → formato: as colunas próprias, se o servidor já as devolver; senão o espelho em `extensions`. */
export function formatFromView(view: { extensions?: Readonly<Record<string, string>> } & FormatColumns): FormatChoice {
  if (view.formatFamily) return normalizeFormat({ family: view.formatFamily, variant: view.formatVariant ?? "", details: parseDetails(view.formatDetailsJson) });
  return unpackFormat(view.extensions?.[FORMAT_EXTENSION_KEY]);
}

/** Critério sugerido: chave de i18n + variáveis (os valores escolhidos). A tela traduz; nada é inventado. */
export interface SuggestedCriterion { key: string; vars: Record<string, string>; /** valor de select: traduzir esta chave e usar como `value` */ optionKey?: string }

/**
 * Critérios de aceite sugeridos a partir do formato escolhido: um da variante ("Entregue em CSV") e um por campo preenchido —
 * booleano só quando marcado (exige algo); select/número/texto com o valor. Ex.: CSV + UTF-8 + cabeçalho → "Entregue em CSV",
 * "Codificação UTF-8", "Cabeçalho na linha 1".
 */
export function suggestedCriteria(f: FormatChoice): SuggestedCriterion[] {
  if (!f.family) return [];
  const out: SuggestedCriterion[] = [];
  const variant = variantOf(f.family, f.variant);
  if (variant) out.push({ key: variant.family === "LINK" ? "taskForm.fmt.crit.byLink" : "taskForm.fmt.crit.variant", vars: { variant: variant.code } });
  for (const field of fieldsFor(f.family, f.variant)) {
    const val = (f.details[field.key] ?? "").trim();
    if (!val || !fieldValueValid(field, val)) continue;
    if (field.kind === "bool") {
      if (val === "true") out.push({ key: `taskForm.fmt.crit.${field.key}`, vars: {} });
    } else {
      out.push({ key: `taskForm.fmt.crit.${field.key}`, vars: { value: val }, ...(field.kind === "select" ? { optionKey: `taskForm.fmt.opt.${field.key}.${val}` } : {}) });
    }
  }
  return out;
}

/** Ícone da variante (extensão canônica) ou da família. */
export function formatIconSource(f: { family: FormatFamilyId | ""; variant: string }): { extension?: string; url?: string; type?: undefined } {
  const variant = variantOf(f.family, f.variant);
  if (variant) return variant.family === "LINK" ? { url: "https://" } : { extension: variant.code === "PDF_A" ? "pdf" : variant.extensions[0] };
  const first: Partial<Record<FormatFamilyId, string>> = {
    PLANILHA: "xlsx", DOCUMENTO: "docx", APRESENTACAO: "pptx", IMAGEM: "png", DESENHO_TECNICO: "dwg", DADOS: "json", AUDIO_VIDEO: "mp4", PACOTE: "zip",
  };
  if (f.family === "LINK") return { url: "https://" };
  return { extension: f.family ? first[f.family] : undefined };
}

// ---------- formato de anexos e evidências ----------

/** Anexo/evidência como chega da API: os campos de formato do backend (quando houver) e, sempre, nome e MIME. */
export interface AttachmentFormatInput {
  fileName?: string | null;
  mimeType?: string | null;
  formatFamily?: string | null;
  formatVariant?: string | null;
  formatDetails?: Readonly<Record<string, string>> | null;
  /** como a API manda (`AttachmentView.formatDetailsJson`); usado quando `formatDetails` não vier */
  formatDetailsJson?: string | null;
}
/** Formato do anexo; `estimated` = derivado no navegador pela extensão/MIME (o servidor ainda não mandou o tipo real). */
export interface AttachmentFormat { format: FormatChoice; estimated: boolean }

const extOf = (name: string | null | undefined) => {
  const m = /\.([a-z0-9]{1,8})$/i.exec((name ?? "").trim());
  return m ? m[1]!.toLowerCase() : "";
};

/**
 * Formato de um anexo: o do servidor (`formatFamily`/`formatVariant`/`formatDetails`, calculado do tipo real) quando vier; senão, estimado
 * pela extensão (primeira variante do catálogo que a aceita — PDF cai em Documento) e, sem extensão conhecida, pelo MIME. Desconhecido →
 * `null` (nunca adivinhado).
 */
export function attachmentFormat(a: AttachmentFormatInput): AttachmentFormat | null {
  if (a.formatFamily && isFormatFamily(a.formatFamily)) {
    return { format: normalizeFormat({ family: a.formatFamily, variant: a.formatVariant ?? "", details: a.formatDetails ?? parseDetails(a.formatDetailsJson) }), estimated: false };
  }
  const ext = extOf(a.fileName);
  const mime = (a.mimeType ?? "").toLowerCase().split(";")[0]!.trim();
  const hit = (ext ? FORMAT_VARIANTS.find((x) => x.extensions.includes(ext)) : undefined)
    ?? (mime ? FORMAT_VARIANTS.find((x) => x.mime.includes(mime)) : undefined);
  return hit ? { format: { family: hit.family, variant: hit.code, details: {} }, estimated: true } : null;
}

/**
 * O anexo atende ao formato pedido? Pedido só de família: alguma variante da família aceita a extensão/MIME do arquivo (um .pdf atende a
 * "Desenho técnico", que tem a prancha em PDF); com variante: a mesma variante — ou, se estimado, a extensão é da variante pedida (PDF/A
 * não se distingue de PDF pela extensão: conta como atende, a conferência do PDF/A fica para o leitor). Sem formato pedido ou anexo de
 * formato desconhecido: `null` (não se aplica).
 */
export function matchesFormat(asked: FormatChoice, a: AttachmentFormatInput): boolean | null {
  if (!asked.family) return null;
  const got = attachmentFormat(a);
  if (!got) return null;
  const ext = extOf(a.fileName);
  const mime = (a.mimeType ?? "").toLowerCase().split(";")[0]!.trim();
  const accepts = (v: FormatVariant) => (ext ? v.extensions.includes(ext) : !!mime && v.mime.includes(mime));
  if (!asked.variant) {
    return got.estimated ? variantsOf(asked.family).some(accepts) || got.format.family === asked.family : got.format.family === asked.family;
  }
  const want = variantOf(asked.family, asked.variant);
  if (!got.estimated) return got.format.variant === asked.variant || (!!want && ["PDF", "PDF_A"].includes(asked.variant) && ["PDF", "PDF_A"].includes(got.format.variant));
  return !!want && accepts(want);
}

export interface FormatMismatchItem { fileName: string; actual: FormatChoice; estimated: boolean }

/**
 * Anexos (não evidências) em formato diferente do pedido na tarefa — base do aviso na lista de anexos e da verificação "formato do anexo"
 * da aba Melhorias ✦. Vazio quando não há formato pedido ou tudo confere.
 */
export function formatMismatch(
  task: { extensions?: Readonly<Record<string, string>> } & FormatColumns,
  attachments: readonly (AttachmentFormatInput & { evidence?: unknown })[],
): FormatMismatchItem[] {
  const asked = formatFromView(task);
  if (!asked.family) return [];
  const out: FormatMismatchItem[] = [];
  for (const a of attachments) {
    if (a.evidence) continue;
    if (matchesFormat(asked, a) !== false) continue;
    const got = attachmentFormat(a)!;
    out.push({ fileName: a.fileName ?? "?", actual: got.format, estimated: got.estimated });
  }
  return out;
}
