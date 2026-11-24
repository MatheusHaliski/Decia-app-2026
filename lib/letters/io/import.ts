/**
 * Importação (RF52.CA04, CA07; RF70.CA05, CA06): valida tamanho, extensão e tipo real (assinatura), lê o formato e
 * devolve o documento com o relatório de fidelidade — ou a recusa com motivo. Nada é aplicado aqui: a peça atual só
 * muda quando a pessoa confirma (`apply.ts`). Conteúdo lido nunca é executado nem renderizado como HTML.
 */
import { DocxError, parseDocx } from "./docx";
import { parseHtml } from "./html";
import { parseLines } from "./markdown";
import { finalizeBlocks, IMPORT_LIMITS, statsOf, type ImportFormat, type ImportResult, type LossLog, type DocMeta, type DraftBlock } from "./model";
import { canInflate, looksLikeZip, ZipError } from "./zip";

const EXT: Readonly<Record<string, ImportFormat>> = { txt: "txt", text: "txt", md: "md", markdown: "md", html: "html", htm: "html", docx: "docx" };
/** extensões conhecidas mas não suportadas (mensagem específica em vez de "formato desconhecido") */
export const KNOWN_UNSUPPORTED = ["doc", "docm", "dotx", "dotm", "odt", "rtf", "pdf", "pages", "epub"] as const;
export const IMPORT_ACCEPT = ".txt,.md,.markdown,.html,.htm,.docx,text/plain,text/markdown,text/html,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const extensionOf = (name: string) => (/\.([A-Za-z0-9]+)$/.exec(name)?.[1] ?? "").toLowerCase();

export function formatOf(name: string): ImportFormat | null {
  return EXT[extensionOf(name)] ?? null;
}

const isOle = (b: Uint8Array) => b.length >= 8 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;
const isPdf = (b: Uint8Array) => b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d;

function decodeText(bytes: Uint8Array): { text: string; encoding: "utf-8" | "windows-1252" } | null {
  const head = bytes.subarray(0, 8192);
  if (head.includes(0)) return null;
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), encoding: "utf-8" };
  } catch {
    try {
      return { text: new TextDecoder("windows-1252").decode(bytes), encoding: "windows-1252" };
    } catch {
      return null;
    }
  }
}

export async function importFile(file: { name: string; bytes: Uint8Array }): Promise<ImportResult> {
  const { name, bytes } = file;
  if (!bytes.length) return { ok: false, reason: "VAZIO" };
  if (bytes.length > IMPORT_LIMITS.maxBytes) return { ok: false, reason: "GRANDE_DEMAIS" };
  const ext = extensionOf(name);
  if (ext === "docm" || ext === "dotm") return { ok: false, reason: "DOCX_MACROS" };
  const format = formatOf(name);
  if (!format) return { ok: false, reason: "FORMATO_NAO_SUPORTADO", detail: ext || undefined };

  let parsed: { meta: DocMeta; blocks: DraftBlock[]; losses: LossLog };
  let encoding: "utf-8" | "windows-1252" = "utf-8";
  if (format === "docx") {
    if (isOle(bytes)) return { ok: false, reason: "DOCX_CRIPTOGRAFADO" };
    if (!looksLikeZip(bytes)) return { ok: false, reason: "TIPO_DIVERGENTE" };
    if (!canInflate()) return { ok: false, reason: "LEITOR_INDISPONIVEL" };
    try {
      parsed = await parseDocx(bytes);
    } catch (e) {
      if (e instanceof DocxError) return { ok: false, reason: e.code, detail: e.message };
      if (e instanceof ZipError) {
        const reason = e.code === "ZIP_CRIPTOGRAFADO" ? "DOCX_CRIPTOGRAFADO" : e.code === "ZIP_GRANDE_DEMAIS" ? "CONTEUDO_EXCESSIVO" : "DOCX_INVALIDO";
        return { ok: false, reason, detail: e.message };
      }
      return { ok: false, reason: "DOCX_INVALIDO", detail: (e as Error).message };
    }
  } else {
    if (looksLikeZip(bytes) || isOle(bytes) || isPdf(bytes)) return { ok: false, reason: "TIPO_DIVERGENTE" };
    const decoded = decodeText(bytes);
    if (!decoded) return { ok: false, reason: "BINARIO" };
    encoding = decoded.encoding;
    parsed = format === "html" ? parseHtml(decoded.text) : parseLines(decoded.text, format);
  }

  const fin = finalizeBlocks(parsed.blocks, parsed.losses);
  if (!fin.ok) return { ok: false, reason: fin.reason };
  return {
    ok: true,
    doc: { format, fileName: name, encoding, meta: parsed.meta, blocks: fin.blocks, losses: parsed.losses.list(), stats: statsOf(fin.blocks) },
  };
}
