/**
 * DWG é formato proprietário (Autodesk) e não há motor licenciado e validado no projeto (RF70: "DWG não oferecido"). Aqui só se
 * lê a VERSÃO gravada nos 6 primeiros bytes ("AC1032" → AutoCAD 2018 ou posterior) para explicar como exportar para DXF ou
 * IFC, que este leitor mede. Nada de fingir leitura: nenhum quantitativo sai de um DWG.
 */

export interface DwgInfo {
  /** código gravado no arquivo (AC1032…) */
  code: string;
  /** primeira e última versão do AutoCAD que gravam este formato (null = ainda em uso nas versões seguintes) */
  first: string | null;
  last: string | null;
}

const RELEASES: Record<string, [string, string | null]> = {
  "AC1.2": ["R1.2", "R1.2"],
  "AC1.40": ["R1.40", "R1.40"],
  "AC1.50": ["R2.05", "R2.05"],
  "AC2.10": ["R2.10", "R2.10"],
  AC1001: ["R2.22", "R2.22"],
  AC1002: ["R2.50", "R2.50"],
  AC1003: ["R2.60", "R2.60"],
  AC1004: ["R9", "R9"],
  AC1006: ["R10", "R10"],
  AC1009: ["R11", "R12"],
  AC1012: ["R13", "R13"],
  AC1014: ["R14", "R14"],
  AC1015: ["2000", "2002"],
  AC1018: ["2004", "2006"],
  AC1021: ["2007", "2009"],
  AC1024: ["2010", "2012"],
  AC1027: ["2013", "2017"],
  AC1032: ["2018", null],
};

/** Assinatura de DWG nos primeiros bytes ("AC" + versão). */
export function looksLikeDwg(head: Uint8Array): boolean {
  if (head.length < 6) return false;
  const s = String.fromCharCode(...head.subarray(0, 6));
  return /^AC(\d{4}|1\.\d{1,2}|2\.10)/.test(s) || s === "MC0.0\u0000";
}

export function readDwgHeader(head: Uint8Array): DwgInfo {
  const raw = String.fromCharCode(...head.subarray(0, 6)).replace(/\u0000+$/, "");
  const code = Object.keys(RELEASES).find((k) => raw.startsWith(k)) ?? raw;
  const rel = RELEASES[code];
  return { code, first: rel?.[0] ?? null, last: rel ? rel[1] : null };
}
