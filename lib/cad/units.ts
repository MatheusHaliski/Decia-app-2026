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
 * Suposição para desenho de edificação sem unidade: a maior dimensão do desenho em unidades. Prédios medem de poucos metros a
 * algumas centenas: ≥ 8 000 unidades sugere milímetros; ≥ 300, centímetros; abaixo, metros. É hipótese, nunca medição.
 */
export function guessUnit(maxExtent: number): LengthUnitId {
  if (!Number.isFinite(maxExtent) || maxExtent <= 0) return "m";
  if (maxExtent >= 8000) return "mm";
  if (maxExtent >= 300) return "cm";
  return "m";
}

/** Arredonda para `digits` casas sem o erro binário de meio-termo (1,005 → 1,01, não 1,00). */
export function round(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** digits;
  return Math.round(Number((value * f).toPrecision(15))) / f;
}
