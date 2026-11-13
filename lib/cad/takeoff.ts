/**
 * Quantitativo normalizado (RF34.CA01): de cada leitura (DXF, IFC, GLB) sai uma lista de linhas com item, unidade (m · m² · m³ ·
 * un), quantidade em metros, origem, confiança e alertas — mais os alertas gerais e as perdas de fidelidade (RF70.CA06).
 *
 * Confiança (regra explícita): começa ALTA e cai um nível por motivo — unidade suposta, camada sem nome ou item não
 * reconhecido, medida aproximada (spline/elipse), linha derivada por premissa (área de parede = comprimento × pé-direito),
 * quantidade IFC parcial ou vinda de conjunto de propriedades. Cada motivo vira um alerta da linha.
 */
import { classifyName, includedByDefault, isUnnamedLayer } from "./classify";
import type { DxfAnalysis } from "./dxf";
import type { GlbAnalysis } from "./glb";
import type { IfcAnalysis, IfcElement } from "./ifc";
import type { ParsedCad } from "./read";
import type { CadAlert, CadFact, CadLoss, Confidence, ItemKind, QtyUnit, Takeoff, TakeoffRow, UnitInfo } from "./types";
import { LENGTH_UNITS, guessUnit, round, unitFromInsunits, type LengthUnitId } from "./units";

export interface TakeoffOptions {
  /** unidade escolhida pela pessoa (DXF e GLB); null = a do arquivo (ou a suposição) */
  unit: LengthUnitId | null;
  /** pé-direito para a área de parede derivada do comprimento das linhas (DXF), metros */
  wallHeightM: number;
  /** paredes desenhadas com duas linhas (as duas faces): o comprimento da parede é metade do das linhas */
  wallDoubleLine: boolean;
}

export const DEFAULT_TAKEOFF_OPTIONS: TakeoffOptions = { unit: null, wallHeightM: 2.8, wallDoubleLine: true };

const MAX_LISTED = 6;

function confidenceOf(reasons: number): Confidence {
  return reasons <= 0 ? "ALTA" : reasons === 1 ? "MEDIA" : "BAIXA";
}

const listOf = (items: string[]) => items.slice(0, MAX_LISTED).join(", ") + (items.length > MAX_LISTED ? ` (+${items.length - MAX_LISTED})` : "");

export function takeoffOf(parsed: ParsedCad, opts: TakeoffOptions = DEFAULT_TAKEOFF_OPTIONS): Takeoff {
  switch (parsed.format) {
    case "DXF": return dxfTakeoff(parsed.dxf, opts);
    case "IFC": return ifcTakeoff(parsed.ifc);
    case "GLB": return glbTakeoff(parsed.glb, opts);
    case "DWG": return { format: "DWG", rows: [], alerts: [], losses: [], facts: [], unit: null, unitEditable: false };
  }
}

/* ───────────────────────────── DXF ───────────────────────────── */

function dxfTakeoff(a: DxfAnalysis, opts: TakeoffOptions): Takeoff {
  const declared = unitFromInsunits(a.insUnits);
  const ext = a.extents;
  const maxExtent = ext ? Math.max(ext.maxX - ext.minX, ext.maxY - ext.minY) : 0;
  let unit: UnitInfo;
  if (opts.unit) unit = { id: opts.unit, toMeters: LENGTH_UNITS[opts.unit], origin: "ESCOLHIDA" };
  else if (declared) unit = { id: declared, toMeters: LENGTH_UNITS[declared], origin: "ARQUIVO" };
  else {
    const g = guessUnit(maxExtent);
    unit = { id: g, toMeters: LENGTH_UNITS[g], origin: "SUPOSTA" };
  }
  const k = unit.toMeters;
  const k2 = k * k;
  const guessed = unit.origin === "SUPOSTA";
  const alerts: CadAlert[] = [];
  const rows: TakeoffRow[] = [];
  if (guessed) {
    alerts.push(a.insUnits && a.insUnits !== 0
      ? { code: "UNIDADE_NAO_SUPORTADA", vars: { code: a.insUnits, unit: unit.id } }
      : { code: "UNIDADE_AUSENTE", vars: { unit: unit.id, extent: round(maxExtent, 0) } });
  }

  const layerRow = (layer: string, kind: ItemKind, extra: { reasons: CadAlert[]; approx?: number }) => {
    const reasons = [...extra.reasons];
    if (guessed) reasons.push({ code: "LINHA_UNIDADE_SUPOSTA" });
    if (isUnnamedLayer(layer)) reasons.push({ code: "LINHA_CAMADA_SEM_NOME" });
    else if (kind === "OUTRO") reasons.push({ code: "LINHA_NAO_CLASSIFICADA" });
    return reasons;
  };

  for (const [layer, st] of Object.entries(a.layerStats)) {
    const kind = classifyName(layer);
    const isWall = kind === "PAREDE";
    if (st.length > 0) {
      const approxShare = st.approxLength / st.length;
      const reasons = layerRow(layer, kind, { reasons: approxShare > 0 ? [{ code: "LINHA_APROXIMADA", vars: { pct: round(approxShare * 100, 0) } }] : [] });
      rows.push({
        id: `dxf:len:${layer}`, kind, label: layer, unit: "m", quantity: st.length * k,
        source: { format: "DXF", what: "CAMADA", ref: layer, measure: "LENGTH" },
        confidence: confidenceOf(reasons.length), alerts: isWall ? [...reasons, { code: "LINHA_BASE_DA_PAREDE" }] : reasons,
        included: !isWall && includedByDefault(kind, "m"),
      });
    }
    if (st.mlineLength > 0) {
      const reasons = layerRow(layer, kind, { reasons: [] });
      rows.push({
        id: `dxf:mline:${layer}`, kind, label: layer, unit: "m", quantity: st.mlineLength * k,
        source: { format: "DXF", what: "CAMADA", ref: layer, measure: "MLINE" },
        confidence: confidenceOf(reasons.length), alerts: isWall ? [...reasons, { code: "LINHA_BASE_DA_PAREDE" }] : reasons,
        included: !isWall && includedByDefault(kind, "m"),
      });
    }
    if (st.closedArea > 0) {
      const reasons = layerRow(layer, kind, { reasons: [] });
      rows.push({
        id: `dxf:area:${layer}`, kind, label: layer, unit: "m2", quantity: st.closedArea * k2,
        source: { format: "DXF", what: "CONTORNO", ref: layer, measure: "AREA" },
        confidence: confidenceOf(reasons.length), alerts: isWall ? [...reasons, { code: "LINHA_AREA_EM_PLANTA" }] : reasons,
        included: !isWall && includedByDefault(kind, "m2"),
      });
    }
    if (st.hatchArea > 0) {
      const reasons = layerRow(layer, kind, { reasons: [] });
      rows.push({
        id: `dxf:hatch:${layer}`, kind, label: layer, unit: "m2", quantity: st.hatchArea * k2,
        source: { format: "DXF", what: "HACHURA", ref: layer, measure: "AREA" },
        confidence: confidenceOf(reasons.length), alerts: isWall ? [...reasons, { code: "LINHA_AREA_EM_PLANTA" }] : reasons,
        included: !isWall && includedByDefault(kind, "m2"),
      });
    }
    // área de parede derivada: (linhas ÷ 2 se linha dupla + multilinhas) × pé-direito — premissa explícita
    if (isWall && (st.length > 0 || st.mlineLength > 0) && opts.wallHeightM > 0) {
      const lines = st.length * k;
      const mline = st.mlineLength * k;
      const factor = opts.wallDoubleLine ? 2 : 1;
      const wallLength = lines / factor + mline;
      const reasons = layerRow(layer, kind, { reasons: [{ code: "LINHA_DERIVADA" }] });
      rows.push({
        id: `dxf:wall:${layer}`, kind: "PAREDE", label: layer, unit: "m2", quantity: wallLength * opts.wallHeightM,
        source: { format: "DXF", what: "DERIVADA", ref: layer, measure: "WALL_AREA" },
        confidence: confidenceOf(reasons.length), alerts: [...reasons, { code: "LINHA_VAOS_NAO_DESCONTADOS" }],
        included: true,
        formula: { code: "PAREDE_AREA", vars: { lines: round(lines, 2), factor, mline: round(mline, 2), height: opts.wallHeightM } },
      });
    }
  }

  // ambientes: nome dentro de contorno fechado
  a.rooms.forEach((room, i) => {
    const area = room.area * k2;
    const reasons: CadAlert[] = [];
    if (guessed) reasons.push({ code: "LINHA_UNIDADE_SUPOSTA" });
    if (room.declaredM2 !== null && Math.abs(room.declaredM2 - area) > Math.max(area * 0.02, 0.05)) {
      reasons.push({ code: "LINHA_AREA_ESCRITA_DIFERE", vars: { declared: room.declaredM2, computed: round(area, 2) } });
    }
    rows.push({
      id: `dxf:room:${i}`, kind: "AMBIENTE", label: room.name, unit: "m2", quantity: area,
      source: { format: "DXF", what: "AMBIENTE", ref: room.layer, measure: "AREA" },
      confidence: confidenceOf(reasons.length), alerts: reasons, included: true,
    });
  });

  // blocos: contagem por nome, quebrada por camada
  const byBlock = new Map<string, DxfAnalysis["inserts"]>();
  for (const g of a.inserts) byBlock.set(g.block, [...(byBlock.get(g.block) ?? []), g]);
  for (const [block, groups] of byBlock) {
    const layers = groups.map((g) => g.layer);
    const anonymous = groups[0]!.anonymous;
    const kind = anonymous ? classifyName(...layers) : classifyName(block, ...layers);
    const count = groups.reduce((s, g) => s + g.count, 0);
    const reasons: CadAlert[] = [];
    if (kind === "OUTRO") reasons.push({ code: "LINHA_NAO_CLASSIFICADA" });
    if (anonymous) reasons.push({ code: "LINHA_BLOCO_ANONIMO" });
    rows.push({
      id: `dxf:block:${block}`, kind, label: block, unit: "un", quantity: count,
      source: { format: "DXF", what: "BLOCO", ref: block, measure: "COUNT" },
      confidence: confidenceOf(reasons.length), alerts: reasons, included: includedByDefault(kind, "un"),
      breakdown: groups.length > 1 ? groups.map((g) => ({ label: g.layer, quantity: g.count })) : undefined,
    });
  }

  // alertas gerais
  const unnamed = Object.entries(a.layerStats).filter(([l, s]) => isUnnamedLayer(l) && s.entities > 0);
  if (unnamed.length) alerts.push({ code: "CAMADA_SEM_NOME", vars: { n: unnamed.reduce((s, [, st]) => s + st.entities, 0), layers: listOf(unnamed.map(([l]) => l)) } });
  for (const o of a.openRooms.slice(0, MAX_LISTED)) {
    alerts.push(o.name
      ? { code: "POLILINHA_ABERTA_AMBIENTE", vars: { name: o.name, layer: o.layer, gap: round(o.gap * k, 2) } }
      : { code: "POLILINHA_ABERTA_CAMADA", vars: { layer: o.layer, gap: round(o.gap * k, 2) } });
  }
  if (a.openRooms.length > MAX_LISTED) alerts.push({ code: "POLILINHA_ABERTA_MAIS", vars: { n: a.openRooms.length - MAX_LISTED } });
  const withoutContour = a.roomsWithoutContour.filter((n) => !a.openRooms.some((o) => o.name === n));
  if (withoutContour.length) alerts.push({ code: "AMBIENTE_SEM_CONTORNO", vars: { n: withoutContour.length, names: listOf(withoutContour) } });
  if (a.implicitClosed) alerts.push({ code: "POLILINHA_FECHADA_SEM_MARCA", vars: { n: a.implicitClosed } });
  for (const d of dimensionMismatches(a, k).slice(0, MAX_LISTED)) alerts.push({ code: "COTA_SOBRESCRITA", vars: d });
  const insertTotal = a.inserts.reduce((s, g) => s + g.count, 0);
  if (insertTotal) alerts.push({ code: "BLOCOS_NAO_EXPLODIDOS", vars: { n: insertTotal } });
  if (!rows.length) alerts.push({ code: "SEM_GEOMETRIA" });

  const losses: CadLoss[] = [];
  const unsupported = Object.entries(a.unsupported).sort((x, y) => y[1] - x[1]);
  const unsupportedN = unsupported.reduce((s, [, n]) => s + n, 0);
  if (unsupportedN) losses.push({ kind: "DESCARTADO", code: "ENTIDADES_SEM_SUPORTE", n: unsupportedN, detail: unsupported.map(([t, n]) => `${t} ×${n}`).join(", ") });
  if (a.paperSpace) losses.push({ kind: "DESCARTADO", code: "ESPACO_PAPEL", n: a.paperSpace });
  if (insertTotal) losses.push({ kind: "DESCARTADO", code: "GEOMETRIA_DOS_BLOCOS", n: insertTotal });
  if (a.hatchSkipped) losses.push({ kind: "DESCARTADO", code: "HACHURA_COMPLEXA", n: a.hatchSkipped });
  if (a.approximated) losses.push({ kind: "APROXIMADO", code: "CURVAS", n: a.approximated });
  if (a.offPlane) losses.push({ kind: "ACHATADO", code: "FORA_DO_PLANO", n: a.offPlane });

  const facts: CadFact[] = [
    { code: "ENTIDADES", n: a.entities },
    { code: "CAMADAS", n: Object.values(a.layerStats).filter((s) => s.entities > 0).length },
    { code: "BLOCOS", n: insertTotal },
    { code: "AMBIENTES", n: a.rooms.length },
    { code: "COTAS", n: a.dimensions.count },
    { code: "TEXTOS", n: a.texts },
  ];
  return { format: "DXF", rows: sortRows(rows), alerts, losses, facts, unit, unitEditable: true };
}

/** Cota com texto sobrescrito que não bate com a medida (em nenhuma leitura plausível: unidades do desenho, m, cm, mm). */
function dimensionMismatches(a: DxfAnalysis, k: number): { text: string; measure: number }[] {
  const out: { text: string; measure: number }[] = [];
  for (const o of a.dimensions.overrides) {
    const m = /-?\d+(?:[.,]\d+)?/.exec(o.text);
    if (!m) continue;
    const written = Number(m[0].replace(",", "."));
    const meters = o.measurement * k;
    const readings = [o.measurement, meters, meters * 100, meters * 1000];
    if (!readings.some((r) => Math.abs(r - written) <= Math.max(Math.abs(r) * 0.01, 0.005))) out.push({ text: o.text, measure: round(meters, 3) });
  }
  return out;
}

/* ───────────────────────────── IFC ───────────────────────────── */

type Dim = "AREA" | "VOLUME" | "LENGTH";
const VOL = ["NetVolume", "GrossVolume", "Volume"];
const AREA_GENERIC = ["NetArea", "GrossArea", "Area"];
const PREF: Partial<Record<ItemKind, Partial<Record<Dim, string[]>>>> = {
  PAREDE: { AREA: ["NetSideArea", "GrossSideArea", ...AREA_GENERIC], VOLUME: VOL, LENGTH: ["Length"] },
  LAJE: { AREA: AREA_GENERIC, VOLUME: VOL },
  COBERTURA: { AREA: ["NetArea", "GrossArea", "ProjectedArea", "Area"], VOLUME: VOL },
  FUNDACAO: { VOLUME: VOL, LENGTH: ["Length"] },
  PILAR: { VOLUME: VOL, LENGTH: ["Length"] },
  VIGA: { VOLUME: VOL, LENGTH: ["Length"] },
  PORTA: { AREA: ["Area"] },
  JANELA: { AREA: ["Area"] },
  AMBIENTE: { AREA: ["NetFloorArea", "GrossFloorArea", ...AREA_GENERIC] },
  PISO: { AREA: AREA_GENERIC },
  FORRO: { AREA: AREA_GENERIC },
  REVESTIMENTO: { AREA: AREA_GENERIC },
  GUARDA_CORPO: { LENGTH: ["Length"] },
  TUBULACAO: { LENGTH: ["Length"] },
  ELETRODUTO: { LENGTH: ["Length"] },
  OUTRO: { AREA: AREA_GENERIC, VOLUME: VOL },
};
const DIM_UNIT: Record<Dim, QtyUnit> = { AREA: "m2", VOLUME: "m3", LENGTH: "m" };

const PRETTY: Record<string, string> = {
  IFCWALL: "IfcWall", IFCWALLSTANDARDCASE: "IfcWallStandardCase", IFCWALLELEMENTEDCASE: "IfcWallElementedCase", IFCSLAB: "IfcSlab",
  IFCSLABSTANDARDCASE: "IfcSlabStandardCase", IFCSLABELEMENTEDCASE: "IfcSlabElementedCase", IFCDOOR: "IfcDoor", IFCDOORSTANDARDCASE: "IfcDoorStandardCase",
  IFCWINDOW: "IfcWindow", IFCWINDOWSTANDARDCASE: "IfcWindowStandardCase", IFCCOLUMN: "IfcColumn", IFCCOLUMNSTANDARDCASE: "IfcColumnStandardCase",
  IFCBEAM: "IfcBeam", IFCBEAMSTANDARDCASE: "IfcBeamStandardCase", IFCSTAIR: "IfcStair", IFCROOF: "IfcRoof", IFCSPACE: "IfcSpace",
  IFCFOOTING: "IfcFooting", IFCPILE: "IfcPile", IFCCOVERING: "IfcCovering", IFCRAILING: "IfcRailing", IFCCURTAINWALL: "IfcCurtainWall",
  IFCBUILDINGELEMENTPROXY: "IfcBuildingElementProxy", IFCFURNISHINGELEMENT: "IfcFurnishingElement", IFCLIGHTFIXTURE: "IfcLightFixture",
  IFCOUTLET: "IfcOutlet", IFCSWITCHINGDEVICE: "IfcSwitchingDevice", IFCSANITARYTERMINAL: "IfcSanitaryTerminal", IFCPIPESEGMENT: "IfcPipeSegment",
  IFCCABLECARRIERSEGMENT: "IfcCableCarrierSegment", IFCFLOWTERMINAL: "IfcFlowTerminal", IFCFLOWSEGMENT: "IfcFlowSegment",
};
export const prettyIfcType = (t: string) => PRETTY[t] ?? t;

function pick(e: IfcElement, names: string[] | undefined): { value: number; name: string; pset: boolean } | null {
  if (!names) return null;
  const byLower = new Map(Object.values(e.quantities).map((q) => [q.name.toLowerCase(), q]));
  for (const n of names) {
    const q = byLower.get(n.toLowerCase());
    if (q && Number.isFinite(q.value)) return { value: q.value, name: q.name, pset: q.source === "PSET" };
  }
  return null;
}

function ifcUnitId(factor: number): LengthUnitId {
  const hit = (Object.entries(LENGTH_UNITS) as [LengthUnitId, number][]).find(([, f]) => Math.abs(f - factor) <= f * 1e-9);
  return hit ? hit[0] : "m";
}

function ifcTakeoff(a: IfcAnalysis): Takeoff {
  const unit: UnitInfo = { id: ifcUnitId(a.units.length), toMeters: a.units.length, origin: a.units.declared ? "ARQUIVO" : "PADRAO" };
  const rows: TakeoffRow[] = [];
  const alerts: CadAlert[] = [];
  const roots = a.elements.filter((e) => e.partOf === null);
  const children = new Map<number, IfcElement[]>();
  for (const e of a.elements) if (e.partOf !== null) children.set(e.partOf, [...(children.get(e.partOf) ?? []), e]);
  const storeyOrder = new Map(a.storeys.map((s, i) => [s.name, i]));

  // medida de um elemento: a dele ou, sem ela, a soma das partes da mesma classe
  const measure = (e: IfcElement, dim: Dim) => {
    const names = PREF[e.kind]?.[dim];
    const own = pick(e, names);
    if (own) return own;
    const parts = (children.get(e.id) ?? []).map((c) => pick(c, names)).filter((x): x is NonNullable<typeof x> => !!x);
    if (!parts.length) return null;
    return { value: parts.reduce((s, p) => s + p.value, 0), name: parts[0]!.name, pset: parts.some((p) => p.pset) };
  };

  const breakdownOf = (els: IfcElement[], value: (e: IfcElement) => number | null) => {
    const by = new Map<string, number>();
    for (const e of els) {
      const v = value(e);
      if (v === null) continue;
      const key = e.storey ?? "—";
      by.set(key, (by.get(key) ?? 0) + v);
    }
    if (by.size < 2) return undefined;
    return [...by.entries()].sort((x, y) => (storeyOrder.get(x[0]) ?? 99) - (storeyOrder.get(y[0]) ?? 99)).map(([label, quantity]) => ({ label, quantity }));
  };

  const groups = new Map<string, IfcElement[]>();
  for (const e of roots) {
    const key = e.kind === "AMBIENTE" ? `space:${e.id}` : `${e.kind}\u0000${e.material ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  for (const [key, els] of groups) {
    const head = els[0]!;
    const kind = head.kind;
    const types = [...new Set(els.map((e) => prettyIfcType(e.type)))].join(", ");
    const label = kind === "AMBIENTE" ? head.name || `#${head.id}` : head.material ?? "";
    const detail = kind === "AMBIENTE" ? head.storey ?? undefined : undefined;
    const idBase = `ifc:${key}`;
    if (kind !== "AMBIENTE") {
      const sizes = kind === "PORTA" || kind === "JANELA" ? sizesOf(els) : undefined;
      rows.push({
        id: `${idBase}:un`, kind, label, unit: "un", quantity: els.length,
        source: { format: "IFC", what: "IFC", ref: types, measure: "COUNT" },
        confidence: "ALTA", alerts: kind === "OUTRO" ? [{ code: "LINHA_NAO_CLASSIFICADA" }] : [],
        included: includedByDefault(kind, "un"),
        breakdown: breakdownOf(els, () => 1), sizes, detail,
      });
    }
    for (const dim of ["AREA", "VOLUME", "LENGTH"] as Dim[]) {
      const values = els.map((e) => {
        const m = measure(e, dim);
        if (m) return m;
        if (dim === "AREA" && (kind === "PORTA" || kind === "JANELA") && e.width && e.height) return { value: e.width * e.height, name: "OverallWidth × OverallHeight", pset: false };
        return null;
      });
      const covered = values.filter((v) => v !== null);
      if (!covered.length) continue;
      const sum = covered.reduce((s, v) => s + v!.value, 0);
      if (!(sum > 0)) continue;
      const reasons: CadAlert[] = [];
      if (covered.length < els.length) reasons.push({ code: "LINHA_IFC_PARCIAL", vars: { n: covered.length, total: els.length } });
      if (covered.some((v) => v!.pset)) reasons.push({ code: "LINHA_IFC_PROPRIEDADE" });
      const conf: Confidence = covered.length < els.length && covered.length / els.length < 0.5 ? "BAIXA" : confidenceOf(reasons.length);
      const qUnit = DIM_UNIT[dim];
      const names = [...new Set(covered.map((v) => v!.name))].join(", ");
      rows.push({
        id: `${idBase}:${qUnit}`, kind, label, unit: qUnit, quantity: sum,
        source: { format: "IFC", what: "IFC", ref: types, measure: names },
        confidence: conf, alerts: reasons,
        included: includedByDefault(kind, qUnit) && !(kind === "PAREDE" && dim !== "AREA"),
        breakdown: kind === "AMBIENTE" ? undefined : breakdownOf(els, (e) => measure(e, dim)?.value ?? null),
        detail,
      });
    }
    if (kind === "AMBIENTE" && !rows.some((r) => r.id.startsWith(idBase))) {
      rows.push({
        id: `${idBase}:m2`, kind, label, unit: "m2", quantity: 0,
        source: { format: "IFC", what: "IFC", ref: types, measure: "—" },
        confidence: "BAIXA", alerts: [{ code: "LINHA_IFC_SEM_AREA" }], included: false, detail,
      });
    }
  }

  if (!a.units.declared) alerts.push({ code: "IFC_SEM_UNIDADES" });
  if (a.schema && !/^IFC(2X3|4)/.test(a.schema)) alerts.push({ code: "IFC_ESQUEMA", vars: { schema: a.schema } });
  if (!roots.length) alerts.push({ code: "IFC_SEM_ELEMENTOS" });
  else if (!a.hasElementQuantities) alerts.push({ code: "IFC_SEM_QUANTIDADES" });
  const noStorey = roots.filter((e) => !e.storey).length;
  if (noStorey && roots.length) alerts.push({ code: "IFC_SEM_PAVIMENTO", vars: { n: noStorey } });
  const proxies = roots.filter((e) => e.type === "IFCBUILDINGELEMENTPROXY").length;
  if (proxies) alerts.push({ code: "IFC_PROXY", vars: { n: proxies } });
  const noMaterial = roots.filter((e) => !e.material && e.kind !== "AMBIENTE").length;
  if (noMaterial) alerts.push({ code: "IFC_SEM_MATERIAL", vars: { n: noMaterial } });

  const losses: CadLoss[] = [];
  if (a.elements.length) losses.push({ kind: "DESCARTADO", code: "GEOMETRIA_IFC", n: a.elements.length });
  const untracked = Object.entries(a.untracked).sort((x, y) => y[1] - x[1]);
  const untrackedN = untracked.reduce((s, [, n]) => s + n, 0);
  if (untrackedN) losses.push({ kind: "DESCARTADO", code: "TIPOS_NAO_TRATADOS", n: untrackedN, detail: untracked.map(([t, n]) => `${prettyIfcType(t)} ×${n}`).join(", ") });

  const facts: CadFact[] = [
    { code: "ELEMENTOS", n: roots.length },
    { code: "PAVIMENTOS", n: a.storeys.length },
    { code: "AMBIENTES", n: roots.filter((e) => e.kind === "AMBIENTE").length },
    { code: "REGISTROS", n: a.records },
  ];
  return { format: "IFC", rows: sortRows(rows), alerts, losses, facts, unit, unitEditable: false };
}

function sizesOf(els: IfcElement[]): { w: number; h: number; n: number }[] | undefined {
  const by = new Map<string, { w: number; h: number; n: number }>();
  for (const e of els) {
    if (!e.width || !e.height) continue;
    const w = round(e.width, 2);
    const h = round(e.height, 2);
    const key = `${w}x${h}`;
    const cur = by.get(key) ?? { w, h, n: 0 };
    cur.n++;
    by.set(key, cur);
  }
  return by.size ? [...by.values()].sort((x, y) => y.n - x.n || x.w - y.w) : undefined;
}

/* ───────────────────────────── GLB ───────────────────────────── */

function glbTakeoff(a: GlbAnalysis, opts: TakeoffOptions): Takeoff {
  const unit: UnitInfo = opts.unit ? { id: opts.unit, toMeters: LENGTH_UNITS[opts.unit], origin: "ESCOLHIDA" } : { id: "m", toMeters: 1, origin: "PADRAO" };
  const k = unit.toMeters;
  const rows: TakeoffRow[] = [];
  const alerts: CadAlert[] = [];
  let open = 0;
  let unverified = 0;
  let unnamed = 0;
  for (const m of a.meshes) {
    const kind = classifyName(m.name, ...m.nodeNames, ...m.materials);
    const generated = /^#\d+$/.test(m.name);
    if (generated) unnamed++;
    const base: CadAlert[] = kind === "OUTRO" ? [{ code: "LINHA_NAO_CLASSIFICADA" }] : [];
    const detail = m.materials.length ? m.materials.join(", ") : undefined;
    const source = { format: "GLB" as const, what: "MALHA" as const, ref: m.name };
    rows.push({
      id: `glb:${m.index}:m2`, kind, label: m.name, unit: "m2", quantity: m.areaM2 * k * k,
      source: { ...source, measure: "SURFACE" }, confidence: confidenceOf(base.length),
      alerts: [...base, { code: "LINHA_AREA_DE_SUPERFICIE" }], included: false, detail,
    });
    if (m.volumeM3 !== null && m.closed) {
      rows.push({
        id: `glb:${m.index}:m3`, kind, label: m.name, unit: "m3", quantity: m.volumeM3 * k * k * k,
        source: { ...source, measure: "VOLUME" }, confidence: confidenceOf(base.length), alerts: base,
        included: includedByDefault(kind, "m3"), detail,
      });
    } else if (m.closed === false) open++;
    else if (m.closed === null) unverified++;
    if (m.instances > 1 || includedByDefault(kind, "un")) {
      rows.push({
        id: `glb:${m.index}:un`, kind, label: m.name, unit: "un", quantity: m.instances,
        source: { ...source, measure: "INSTANCES" }, confidence: confidenceOf(base.length), alerts: base,
        included: includedByDefault(kind, "un"), detail,
      });
    }
  }
  if (!a.meshes.length) alerts.push({ code: "GLB_SEM_MALHAS" });
  if (open) alerts.push({ code: "GLB_MALHA_ABERTA", vars: { n: open } });
  if (unverified) alerts.push({ code: "GLB_NAO_VERIFICADA", vars: { n: unverified } });
  if (unnamed) alerts.push({ code: "GLB_SEM_NOMES", vars: { n: unnamed } });
  if (a.skipped.compressed) alerts.push({ code: "GLB_COMPRIMIDA", vars: { n: a.skipped.compressed } });
  if (a.bbox) {
    const size = Math.max(a.bbox.max[0] - a.bbox.min[0], a.bbox.max[1] - a.bbox.min[1], a.bbox.max[2] - a.bbox.min[2]) * k;
    if (size > 2000 || (size > 0 && size < 0.05)) alerts.push({ code: "GLB_ESCALA_SUSPEITA", vars: { size: round(size, 3) } });
  }
  const losses: CadLoss[] = [];
  const s = a.skipped;
  if (s.compressed) losses.push({ kind: "DESCARTADO", code: "MALHA_COMPRIMIDA", n: s.compressed });
  if (s.sparse) losses.push({ kind: "DESCARTADO", code: "ACESSOR_ESPARSO", n: s.sparse });
  if (s.externalBuffer) losses.push({ kind: "DESCARTADO", code: "BUFFER_EXTERNO", n: s.externalBuffer });
  if (s.nonTriangle) losses.push({ kind: "DESCARTADO", code: "PRIMITIVA_SEM_FACE", n: s.nonTriangle });
  const d = a.dropped;
  const visual = d.textures + d.animations + d.cameras + d.skins;
  if (visual) losses.push({ kind: "DESCARTADO", code: "APARENCIA_ANIMACAO", n: visual });
  const facts: CadFact[] = [
    { code: "MALHAS", n: a.meshes.length },
    { code: "TRIANGULOS", n: a.triangles },
    { code: "NOS", n: a.nodes },
  ];
  return { format: "GLB", rows: sortRows(rows), alerts, losses, facts, unit, unitEditable: true };
}

/* ───────────────────────────── edição e conferências ───────────────────────────── */

const KIND_ORDER = new Map<ItemKind, number>(
  (["FUNDACAO", "PILAR", "VIGA", "LAJE", "ESCADA", "PAREDE", "COBERTURA", "LUMINARIA", "TOMADA", "INTERRUPTOR", "LOUCA", "TUBULACAO", "ELETRODUTO",
    "PORTA", "JANELA", "GUARDA_CORPO", "AMBIENTE", "PISO", "FORRO", "REVESTIMENTO", "MOBILIARIO", "COTA", "TEXTO", "EIXO", "OUTRO"] as ItemKind[]).map((k, i) => [k, i]),
);
const UNIT_ORDER: Record<QtyUnit, number> = { m2: 0, m3: 1, m: 2, un: 3 };

/** Ordem da tela (incluídas primeiro, pela etapa) e quantidades sem ruído de ponto flutuante (6 casas). */
function sortRows(rows: TakeoffRow[]): TakeoffRow[] {
  for (const r of rows) {
    r.quantity = round(r.quantity, 6);
    if (r.breakdown) r.breakdown = r.breakdown.map((b) => ({ ...b, quantity: round(b.quantity, 6) }));
  }
  return rows.sort((a, b) =>
    Number(b.included) - Number(a.included) ||
    (KIND_ORDER.get(a.kind) ?? 99) - (KIND_ORDER.get(b.kind) ?? 99) ||
    UNIT_ORDER[a.unit] - UNIT_ORDER[b.unit] ||
    a.label.localeCompare(b.label, "pt-BR"));
}

/** Correção da pessoa numa linha (RF34.CA04): incluir/excluir da planilha e trocar a quantidade. */
export interface RowEdit {
  included?: boolean;
  quantity?: number;
}

export function applyEdits(rows: readonly TakeoffRow[], edits: Readonly<Record<string, RowEdit>>): TakeoffRow[] {
  return rows.map((r) => {
    const e = edits[r.id];
    if (!e) return r;
    const out: TakeoffRow = { ...r };
    if (e.included !== undefined) out.included = e.included;
    if (e.quantity !== undefined && Number.isFinite(e.quantity) && e.quantity >= 0 && round(e.quantity, 4) !== round(r.quantity, 4)) {
      out.corrected = { from: r.quantity };
      out.quantity = e.quantity;
    }
    return out;
  });
}

/** Área construída estimada (m²): ambientes; sem eles, lajes; sem elas, pisos. Base do cronograma e da limpeza. */
export function builtAreaM2(rows: readonly TakeoffRow[]): number | null {
  for (const kind of ["AMBIENTE", "LAJE", "PISO"] as ItemKind[]) {
    const sum = rows.filter((r) => r.kind === kind && r.unit === "m2").reduce((s, r) => s + r.quantity, 0);
    if (sum > 0) return sum;
  }
  return null;
}

/** Conferências sobre as linhas incluídas (mudam com as correções): dupla contagem de piso. */
export function crossChecks(rows: readonly TakeoffRow[]): CadAlert[] {
  const inc = rows.filter((r) => r.included);
  const sum = (kind: ItemKind) => inc.filter((r) => r.kind === kind && r.unit === "m2").reduce((s, r) => s + r.quantity, 0);
  const rooms = sum("AMBIENTE");
  const floors = sum("PISO");
  const out: CadAlert[] = [];
  if (rooms > 0 && floors > 0) out.push({ code: "DUPLA_CONTAGEM_PISO", vars: { rooms: round(rooms, 2), floors: round(floors, 2) } });
  return out;
}
