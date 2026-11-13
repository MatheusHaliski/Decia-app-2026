/**
 * Entrada da extração: reconhece o formato pelo CONTEÚDO (assinatura dos primeiros bytes, como o `MagicBytes` do D-67), confere
 * com a extensão, aplica o teto de tamanho ANTES de ler o arquivo inteiro e chama o leitor do formato. Erro = código estável
 * (`cad.error.<código>`) com o motivo e o que fazer; nada é alterado em lugar nenhum (RF70.CA05).
 */
import { decodeDxfBytes, parseDxf, type DxfAnalysis } from "./dxf";
import { looksLikeDwg, readDwgHeader, type DwgInfo } from "./dwg";
import { parseGlb, type GlbAnalysis } from "./glb";
import { parseIfc, type IfcAnalysis } from "./ifc";
import { CadReadError, type CadFormat, type ReadError } from "./types";

const MB = 1024 * 1024;

/** Teto por formato (o DWG só tem o cabeçalho lido). */
export const SIZE_LIMITS: Record<CadFormat, number> = { DXF: 50 * MB, IFC: 80 * MB, GLB: 100 * MB, DWG: 500 * MB };
export const ACCEPTED_EXTENSIONS = ["dxf", "ifc", "glb", "dwg"] as const;
/** Bytes lidos para reconhecer o formato. */
export const HEAD_BYTES = 1024;

export type ParsedCad =
  | { format: "DXF"; fileName: string; sizeBytes: number; dxf: DxfAnalysis }
  | { format: "IFC"; fileName: string; sizeBytes: number; ifc: IfcAnalysis }
  | { format: "GLB"; fileName: string; sizeBytes: number; glb: GlbAnalysis }
  | { format: "DWG"; fileName: string; sizeBytes: number; dwg: DwgInfo };

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: ReadError };

export const extensionOf = (name: string) => {
  const m = /\.([A-Za-z0-9]+)$/.exec(name.trim());
  return m ? m[1]!.toLowerCase() : "";
};

const EXT_FORMAT: Record<string, CadFormat> = { dxf: "DXF", ifc: "IFC", glb: "GLB", dwg: "DWG" };

function headText(head: Uint8Array): string {
  let s = "";
  const n = Math.min(head.length, HEAD_BYTES);
  for (let i = 0; i < n; i++) s += String.fromCharCode(head[i]!);
  return s.replace(/^ï»¿/, "");
}

/** Formato pelo conteúdo; a extensão precisa concordar (sem extensão, vale o conteúdo). */
export function sniffFormat(fileName: string, head: Uint8Array): Outcome<CadFormat> {
  const ext = extensionOf(fileName);
  const text = headText(head);
  if (!head.length) return { ok: false, error: { code: "ARQUIVO_VAZIO" } };
  let detected: CadFormat | null = null;
  if (head.length >= 4 && head[0] === 0x67 && head[1] === 0x6c && head[2] === 0x54 && head[3] === 0x46) detected = "GLB";
  else if (looksLikeDwg(head)) detected = "DWG";
  else if (/^\s*ISO-10303-21/.test(text)) detected = "IFC";
  else if (text.startsWith("AutoCAD Binary DXF")) return { ok: false, error: { code: "DXF_BINARIO" } };
  else if (/^\s*(999\s*\r?\n[^\n]*\r?\n\s*)*0\s*\r?\n\s*SECTION\s*\r?\n/.test(text)) detected = "DXF";
  else if (text.startsWith("%PDF")) return { ok: false, error: { code: "PDF" } };
  else if (/^\s*\{/.test(text) && text.includes('"asset"')) return { ok: false, error: { code: "GLTF_JSON" } };
  else if (text.startsWith("PK\u0003\u0004") && ext === "ifczip") return { ok: false, error: { code: "IFC_COMPACTADO" } };
  else if (/^\s*<\?xml/.test(text) && ext === "ifcxml") return { ok: false, error: { code: "IFC_COMPACTADO" } };

  const byExt = EXT_FORMAT[ext];
  if (!detected) {
    if (byExt) return { ok: false, error: { code: "MALFORMADO", vars: { format: byExt } } };
    return { ok: false, error: { code: "TIPO_NAO_PERMITIDO", vars: { ext: ext || "—" } } };
  }
  if (ext && byExt !== detected) return { ok: false, error: { code: "TIPO_DIVERGENTE", vars: { detected, ext } } };
  return { ok: true, value: detected };
}

/** Teto de tamanho do formato, conferido antes de ler o arquivo inteiro. */
export function checkSize(format: CadFormat, sizeBytes: number): ReadError | null {
  if (sizeBytes <= 0) return { code: "ARQUIVO_VAZIO" };
  const limit = SIZE_LIMITS[format];
  return sizeBytes > limit ? { code: "ARQUIVO_GRANDE", vars: { format, maxMb: Math.round(limit / MB) } } : null;
}

/** Lê os bytes (o arquivo inteiro; no DWG basta o cabeçalho). Puro e síncrono. */
export function parseCad(fileName: string, bytes: Uint8Array, sizeBytes = bytes.byteLength): Outcome<ParsedCad> {
  const sniff = sniffFormat(fileName, bytes.subarray(0, HEAD_BYTES));
  if (!sniff.ok) return sniff;
  const tooBig = checkSize(sniff.value, sizeBytes);
  if (tooBig) return { ok: false, error: tooBig };
  try {
    switch (sniff.value) {
      case "DXF": return { ok: true, value: { format: "DXF", fileName, sizeBytes, dxf: parseDxf(decodeDxfBytes(bytes)) } };
      case "IFC": return { ok: true, value: { format: "IFC", fileName, sizeBytes, ifc: parseIfc(new TextDecoder("utf-8").decode(bytes)) } };
      case "GLB": return { ok: true, value: { format: "GLB", fileName, sizeBytes, glb: parseGlb(bytes) } };
      case "DWG": return { ok: true, value: { format: "DWG", fileName, sizeBytes, dwg: readDwgHeader(bytes) } };
    }
  } catch (e) {
    if (e instanceof CadReadError) return { ok: false, error: { code: e.code, vars: e.vars } };
    return { ok: false, error: { code: "MALFORMADO", vars: { format: sniff.value } } };
  }
}
