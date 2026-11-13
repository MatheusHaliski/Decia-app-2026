/**
 * Unidades de comprimento dos desenhos. O DXF declara a unidade em `$INSUNITS` (código do AutoCAD); o glTF é sempre em metros
 * pela especificação; o IFC declara em `IfcUnitAssignment`. Sem unidade declarada, a dedução pela extensão do desenho é só
 * uma SUPOSIÇÃO marcada como tal — a pessoa confirma ou troca.
 */

/** Fator para metro de cada unidade aceita. */
export const LENGTH_UNITS = {
  mm: 0.001,
  cm: 0.01,
  dm: 0.1,
  m: 1,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344,
  usft: 1200 / 3937,
  um: 1e-6,
} as const;
export type LengthUnitId = keyof typeof LENGTH_UNITS;

/** Unidades oferecidas no seletor da tela. */
export const SELECTABLE_UNITS: readonly LengthUnitId[] = ["mm", "cm", "m", "in", "ft"];

export const isLengthUnit = (v: unknown): v is LengthUnitId => typeof v === "string" && Object.prototype.hasOwnProperty.call(LENGTH_UNITS, v);

/** `$INSUNITS` do DXF → unidade (0 = sem unidade; códigos astronômicos/microscópicos ficam de fora). */
const INSUNITS: Record<number, LengthUnitId> = { 1: "in", 2: "ft", 3: "mi", 4: "mm", 5: "cm", 6: "m", 7: "km", 10: "yd", 13: "um", 14: "dm", 21: "usft" };

export function unitFromInsunits(code: number | null | undefined): LengthUnitId | null {
  if (code === null || code === undefined) return null;
  return INSUNITS[code] ?? null;
}

/**
 * Suposição para desenho de edificação sem unidade — hipótese, nunca medição:
 *  1. altura dos textos (melhor pista): em planta impressa de 1:50 a 1:200 o texto tem perto de 0,2 m de altura real, então
 *     vence a unidade que leva a altura mediana dos textos mais perto disso (até 10× de diferença);
 *  2. sem textos, a maior dimensão do desenho: ≥ 8 000 unidades sugere milímetros; ≥ 300, centímetros; abaixo, metros.
 */
export function guessUnit(maxExtent: number, textHeight: number | null = null): { unit: LengthUnitId; basis: "TEXTO" | "EXTENSAO" } {
  if (textHeight !== null && Number.isFinite(textHeight) && textHeight > 0) {
    let best: LengthUnitId = "m";
    let err = Infinity;
    for (const u of ["mm", "cm", "m"] as const) {
      const e = Math.abs(Math.log10((textHeight * LENGTH_UNITS[u]) / 0.2));
      if (e < err) {
        err = e;
        best = u;
      }
    }
    if (err <= 1) return { unit: best, basis: "TEXTO" };
  }
  if (!Number.isFinite(maxExtent) || maxExtent <= 0) return { unit: "m", basis: "EXTENSAO" };
  if (maxExtent >= 8000) return { unit: "mm", basis: "EXTENSAO" };
  if (maxExtent >= 300) return { unit: "cm", basis: "EXTENSAO" };
  return { unit: "m", basis: "EXTENSAO" };
}

/** Arredonda para `digits` casas sem o erro binário de meio-termo (1,005 → 1,01, não 1,00). */
export function round(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** digits;
  return Math.round(Number((value * f).toPrecision(15))) / f;
}
