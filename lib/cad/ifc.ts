/**
 * Leitor de IFC em STEP físico (ISO 10303-21), sem dependências: mapa `#id = IFCTIPO(...)` com leitura preguiçosa dos
 * argumentos (só dos registros que interessam), decodificação de texto (`\X2\00E7\X0\`, `\X\E7`, `\S\c`) e:
 *  • unidades do projeto (`IfcUnitAssignment`: IfcSIUnit com prefixo e IfcConversionBasedUnit — pé, polegada…);
 *  • elementos: paredes, lajes, portas, janelas, pilares, vigas, escadas, coberturas, ambientes (IfcSpace), fundações,
 *    revestimentos, guarda-corpos e, no IFC4, luminárias, tomadas, interruptores, louças, tubos e eletrocalhas;
 *  • quantidades de `IfcElementQuantity` (IfcQuantityLength/Area/Volume/Count) e, na falta delas, valores Area/Volume/Length
 *    de conjuntos de propriedades (confiança menor);
 *  • pavimento por `IfcRelContainedInSpatialStructure` (subindo `IfcRelAggregates`) e material por `IfcRelAssociatesMaterial`
 *    (direto ou pelo tipo, `IfcRelDefinesByType`).
 * A geometria 3D do IFC não é lida (só quantidades e atributos) — isso aparece na lista de perdas.
 */
import { classifyName } from "./classify";
import { CadReadError, type ItemKind } from "./types";

export const IFC_MAX_RECORDS = 3_000_000;

export type StepValue = null | number | string | StepRef | StepEnum | StepTyped | StepValue[];
export interface StepRef { r: number }
export interface StepEnum { e: string }
export interface StepTyped { t: string; v: StepValue }

const isRef = (v: StepValue | undefined): v is StepRef => !!v && typeof v === "object" && !Array.isArray(v) && "r" in v;
const isEnum = (v: StepValue | undefined): v is StepEnum => !!v && typeof v === "object" && !Array.isArray(v) && "e" in v;
const isTyped = (v: StepValue | undefined): v is StepTyped => !!v && typeof v === "object" && !Array.isArray(v) && "t" in v;
const refsOf = (v: StepValue | undefined): number[] => (Array.isArray(v) ? v.filter(isRef).map((x) => x.r) : isRef(v) ? [v.r] : []);
const str = (v: StepValue | undefined): string => (typeof v === "string" ? v : isTyped(v) && typeof v.v === "string" ? v.v : "");
const numOf = (v: StepValue | undefined): number | null => (typeof v === "number" ? v : isTyped(v) && typeof v.v === "number" ? v.v : null);

const malformed = () => new CadReadError("MALFORMADO", { format: "IFC" });

/** Texto STEP: `''` → `'`, `\X2\…\X0\` (UTF-16), `\X4\…\X0\` (UTF-32), `\X\hh` (ISO 8859-1), `\S\c` (c + 128), `\\` → `\`. */
export function decodeStepString(raw: string): string {
  const s = raw.replace(/''/g, "'");
  if (!s.includes("\\")) return s;
  let out = "";
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    if (ch !== "\\") {
      out += ch;
      i++;
      continue;
    }
    if (s.startsWith("\\X2\\", i) || s.startsWith("\\X4\\", i)) {
      const width = s[i + 2] === "2" ? 4 : 8;
      const e = s.indexOf("\\X0\\", i + 4);
      if (e < 0) {
        out += s.slice(i);
        break;
      }
      const hex = s.slice(i + 4, e);
      for (let k = 0; k + width <= hex.length; k += width) {
        const cp = parseInt(hex.slice(k, k + width), 16);
        if (Number.isFinite(cp)) out += String.fromCodePoint(cp);
      }
      i = e + 4;
      continue;
    }
    if (s.startsWith("\\X\\", i)) {
      const cp = parseInt(s.slice(i + 3, i + 5), 16);
      if (Number.isFinite(cp)) out += String.fromCharCode(cp);
      i += 5;
      continue;
    }
    if (s.startsWith("\\S\\", i) && i + 3 < s.length) {
      out += String.fromCharCode(s.charCodeAt(i + 3) + 128);
      i += 4;
      continue;
    }
    if (s.startsWith("\\\\", i)) {
      out += "\\";
      i += 2;
      continue;
    }
    if (/^\\P[A-I]\\/.test(s.slice(i, i + 4))) {
      i += 4;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/* ───────────────────────────── varredura ───────────────────────────── */

function skipWs(text: string, i: number): number {
  for (;;) {
    const c = text.charCodeAt(i);
    if (c === 32 || c === 9 || c === 10 || c === 13) {
      i++;
      continue;
    }
    if (c === 47 && text.charCodeAt(i + 1) === 42) {
      const e = text.indexOf("*/", i + 2);
      if (e < 0) throw malformed();
      i = e + 2;
      continue;
    }
    return i;
  }
}

/** Posição logo depois do ")" que fecha o "(" em `i` (pula textos, binários e comentários). */
function skipParens(text: string, i: number): number {
  let depth = 0;
  const n = text.length;
  while (i < n) {
    const c = text.charCodeAt(i);
    if (c === 39) {
      i++;
      for (;;) {
        const e = text.indexOf("'", i);
        if (e < 0) throw malformed();
        if (text.charCodeAt(e + 1) === 39) {
          i = e + 2;
          continue;
        }
        i = e + 1;
        break;
      }
      continue;
    }
    if (c === 34) {
      const e = text.indexOf('"', i + 1);
      if (e < 0) throw malformed();
      i = e + 1;
      continue;
    }
    if (c === 47 && text.charCodeAt(i + 1) === 42) {
      const e = text.indexOf("*/", i + 2);
      if (e < 0) throw malformed();
      i = e + 2;
      continue;
    }
    if (c === 40) depth++;
    else if (c === 41) {
      depth--;
      if (depth === 0) return i + 1;
    }
    i++;
  }
  throw malformed();
}

const isIdent = (c: number) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 95;
const NUMBER = /[-+]?\d+(\.\d*)?([eE][-+]?\d+)?/y;

function parseValue(text: string, i: number): [StepValue, number] {
  i = skipWs(text, i);
  const c = text.charCodeAt(i);
  if (c === 36 || c === 42) return [null, i + 1]; // $ *
  if (c === 39) {
    let j = i + 1;
    for (;;) {
      const e = text.indexOf("'", j);
      if (e < 0) throw malformed();
      if (text.charCodeAt(e + 1) === 39) {
        j = e + 2;
        continue;
      }
      return [decodeStepString(text.slice(i + 1, e)), e + 1];
    }
  }
  if (c === 34) {
    const e = text.indexOf('"', i + 1);
    if (e < 0) throw malformed();
    return [text.slice(i + 1, e), e + 1];
  }
  if (c === 46) {
    const e = text.indexOf(".", i + 1);
    if (e < 0) throw malformed();
    return [{ e: text.slice(i + 1, e).toUpperCase() }, e + 1];
  }
  if (c === 35) {
    let j = i + 1;
    while (text.charCodeAt(j) >= 48 && text.charCodeAt(j) <= 57) j++;
    return [{ r: Number(text.slice(i + 1, j)) }, j];
  }
  if (c === 40) return parseList(text, i);
  if ((c >= 48 && c <= 57) || c === 45 || c === 43) {
    NUMBER.lastIndex = i;
    const m = NUMBER.exec(text);
    if (!m) throw malformed();
    return [Number(m[0]), i + m[0].length];
  }
  if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) {
    let j = i;
    while (isIdent(text.charCodeAt(j))) j++;
    const name = text.slice(i, j).toUpperCase();
    j = skipWs(text, j);
    if (text.charCodeAt(j) !== 40) throw malformed();
    const [list, after] = parseList(text, j);
    return [{ t: name, v: list[0] ?? null }, after];
  }
  throw malformed();
}

function parseList(text: string, i: number): [StepValue[], number] {
  i++;
  const out: StepValue[] = [];
  i = skipWs(text, i);
  if (text.charCodeAt(i) === 41) return [out, i + 1];
  for (;;) {
    const [v, j] = parseValue(text, i);
    out.push(v);
    i = skipWs(text, j);
    const c = text.charCodeAt(i);
    if (c === 44) {
      i++;
      continue;
    }
    if (c === 41) return [out, i + 1];
    throw malformed();
  }
}

class GrowInt {
  data = new Int32Array(1024);
  length = 0;
  push(v: number): void {
    if (this.length === this.data.length) {
      const next = new Int32Array(this.data.length * 2);
      next.set(this.data);
      this.data = next;
    }
    this.data[this.length++] = v;
  }
}

/** Arquivo STEP indexado: tipo de cada `#id` e argumentos lidos sob demanda. */
export class StepFile {
  readonly schema: string | null;
  private readonly text: string;
  private readonly ids = new GrowInt();
  private readonly starts = new GrowInt();
  private readonly typeIdx = new GrowInt();
  private readonly typeNames: string[] = [];
  private readonly typeIndex = new Map<string, number>();
  private readonly byId = new Map<number, number>();
  private readonly cache = new Map<number, StepValue[]>();

  constructor(text: string) {
    this.text = text;
    let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
    i = skipWs(text, i);
    if (!text.startsWith("ISO-10303-21", i)) throw malformed();
    const headerAt = text.indexOf("HEADER", i);
    if (headerAt < 0) throw malformed();
    i = skipWs(text, headerAt + 6);
    if (text.charCodeAt(i) !== 59) throw malformed();
    i++;
    const headerStart = i;
    // cabeçalho: comandos NOME(...); até ENDSEC;
    for (;;) {
      i = skipWs(text, i);
      if (text.startsWith("ENDSEC", i)) break;
      let j = i;
      while (isIdent(text.charCodeAt(j))) j++;
      if (j === i) throw malformed();
      j = skipWs(text, j);
      if (text.charCodeAt(j) !== 40) throw malformed();
      i = skipWs(text, skipParens(text, j));
      if (text.charCodeAt(i) !== 59) throw malformed();
      i++;
    }
    const header = text.slice(headerStart, i);
    const schema = /FILE_SCHEMA\s*\(\s*\(\s*'([^']*)'/i.exec(header);
    this.schema = schema ? schema[1]!.trim().toUpperCase() : null;
    i = skipWs(text, i + 6);
    if (text.charCodeAt(i) === 59) i++;
    i = skipWs(text, i);
    if (!text.startsWith("DATA", i)) throw malformed();
    i = skipWs(text, i + 4);
    if (text.charCodeAt(i) === 40) i = skipWs(text, skipParens(text, i));
    if (text.charCodeAt(i) !== 59) throw malformed();
    i++;
    for (;;) {
      i = skipWs(text, i);
      if (i >= text.length) throw malformed();
      if (text.startsWith("ENDSEC", i)) break;
      if (text.charCodeAt(i) !== 35) throw malformed();
      let j = i + 1;
      while (text.charCodeAt(j) >= 48 && text.charCodeAt(j) <= 57) j++;
      const id = Number(text.slice(i + 1, j));
      j = skipWs(text, j);
      if (text.charCodeAt(j) !== 61) throw malformed();
      j = skipWs(text, j + 1);
      let type = "COMPLEX";
      if (text.charCodeAt(j) !== 40) {
        const k0 = j;
        while (isIdent(text.charCodeAt(j))) j++;
        type = text.slice(k0, j).toUpperCase();
        j = skipWs(text, j);
        if (text.charCodeAt(j) !== 40) throw malformed();
      }
      const argStart = j;
      j = skipWs(text, skipParens(text, j));
      if (text.charCodeAt(j) !== 59) throw malformed();
      i = j + 1;
      let t = this.typeIndex.get(type);
      if (t === undefined) {
        t = this.typeNames.length;
        this.typeNames.push(type);
        this.typeIndex.set(type, t);
      }
      this.byId.set(id, this.ids.length);
      this.ids.push(id);
      this.starts.push(argStart);
      this.typeIdx.push(t);
      if (this.ids.length > IFC_MAX_RECORDS) throw new CadReadError("EXCESSIVO", { format: "IFC", max: IFC_MAX_RECORDS });
    }
  }

  get size(): number {
    return this.ids.length;
  }

  typeOf(id: number): string | null {
    const k = this.byId.get(id);
    return k === undefined ? null : this.typeNames[this.typeIdx.data[k]!]!;
  }

  args(id: number): StepValue[] | null {
    const k = this.byId.get(id);
    if (k === undefined) return null;
    const cached = this.cache.get(id);
    if (cached) return cached;
    const t = this.typeNames[this.typeIdx.data[k]!];
    if (t === "COMPLEX") return null;
    const [list] = parseList(this.text, this.starts.data[k]!);
    this.cache.set(id, list);
    return list;
  }

  /** Ids de todos os registros destes tipos (maiúsculos). */
  ofType(...types: string[]): number[] {
    const wanted = new Set(types.map((x) => this.typeIndex.get(x)).filter((x): x is number => x !== undefined));
    const out: number[] = [];
    if (!wanted.size) return out;
    for (let k = 0; k < this.ids.length; k++) if (wanted.has(this.typeIdx.data[k]!)) out.push(this.ids.data[k]!);
    return out;
  }

  /** Contagem por tipo (para a lista de perdas). */
  typeCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    for (let k = 0; k < this.ids.length; k++) {
      const name = this.typeNames[this.typeIdx.data[k]!]!;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return counts;
  }
}

/* ───────────────────────────── modelo ───────────────────────────── */

type Dim = "LENGTH" | "AREA" | "VOLUME" | "COUNT";

export interface IfcQuantity {
  /** valor em unidades SI (m, m², m³, un) */
  value: number;
  name: string;
  source: "QTO" | "PSET";
}

export interface IfcElement {
  id: number;
  /** tipo IFC (IFCWALLSTANDARDCASE…) */
  type: string;
  kind: ItemKind;
  name: string;
  storey: string | null;
  material: string | null;
  /** largura × altura (portas e janelas), metros */
  width: number | null;
  height: number | null;
  /** quantidades por nome (NetSideArea, NetVolume, Length…) já em SI */
  quantities: Record<string, IfcQuantity & { dim: Dim }>;
  /** elemento-pai da mesma classe (parte de cobertura, por exemplo): as quantidades se somam ao pai */
  partOf: number | null;
}

export interface IfcAnalysis {
  schema: string | null;
  units: { length: number; area: number; volume: number; declared: boolean; lengthName: string };
  elements: IfcElement[];
  storeys: { name: string; elevation: number | null }[];
  hasElementQuantities: boolean;
  /** elementos físicos de tipos não tratados (contagem por tipo) */
  untracked: Record<string, number>;
  records: number;
}

const TRACKED: Record<string, ItemKind | "SLAB" | "COVERING" | "FLOW"> = {
  IFCWALL: "PAREDE", IFCWALLSTANDARDCASE: "PAREDE", IFCWALLELEMENTEDCASE: "PAREDE",
  IFCSLAB: "SLAB", IFCSLABSTANDARDCASE: "SLAB", IFCSLABELEMENTEDCASE: "SLAB",
  IFCDOOR: "PORTA", IFCDOORSTANDARDCASE: "PORTA",
  IFCWINDOW: "JANELA", IFCWINDOWSTANDARDCASE: "JANELA",
  IFCCOLUMN: "PILAR", IFCCOLUMNSTANDARDCASE: "PILAR",
  IFCBEAM: "VIGA", IFCBEAMSTANDARDCASE: "VIGA",
  IFCSTAIR: "ESCADA",
  IFCROOF: "COBERTURA",
  IFCSPACE: "AMBIENTE",
  IFCFOOTING: "FUNDACAO", IFCPILE: "FUNDACAO",
  IFCCOVERING: "COVERING",
  IFCRAILING: "GUARDA_CORPO",
  IFCCURTAINWALL: "OUTRO",
  IFCBUILDINGELEMENTPROXY: "OUTRO",
  IFCFURNISHINGELEMENT: "MOBILIARIO",
  IFCLIGHTFIXTURE: "LUMINARIA", IFCOUTLET: "TOMADA", IFCSWITCHINGDEVICE: "INTERRUPTOR", IFCSANITARYTERMINAL: "LOUCA",
  IFCPIPESEGMENT: "TUBULACAO", IFCCABLECARRIERSEGMENT: "ELETRODUTO",
  IFCFLOWTERMINAL: "FLOW", IFCFLOWSEGMENT: "FLOW",
};

/** Tipos físicos sem tratamento (entram na lista de perdas como "descartados"). */
const UNTRACKED = [
  "IFCMEMBER", "IFCPLATE", "IFCSTAIRFLIGHT", "IFCRAMP", "IFCRAMPFLIGHT", "IFCBUILDINGELEMENTPART", "IFCREINFORCINGBAR", "IFCREINFORCINGMESH",
  "IFCFLOWFITTING", "IFCFLOWCONTROLLER", "IFCFLOWMOVINGDEVICE", "IFCFLOWSTORAGEDEVICE", "IFCFLOWTREATMENTDEVICE", "IFCDISTRIBUTIONELEMENT",
  "IFCDISTRIBUTIONCONTROLELEMENT", "IFCDISTRIBUTIONFLOWELEMENT", "IFCENERGYCONVERSIONDEVICE", "IFCDUCTSEGMENT", "IFCCABLESEGMENT", "IFCCHIMNEY",
  "IFCSHADINGDEVICE", "IFCTRANSPORTELEMENT", "IFCCIVILELEMENT", "IFCGEOGRAPHICELEMENT", "IFCELEMENTASSEMBLY", "IFCDISCRETEACCESSORY",
  "IFCMECHANICALFASTENER", "IFCFASTENER",
];

const TYPE_OBJECT_KIND: Record<string, ItemKind> = {
  IFCLIGHTFIXTURETYPE: "LUMINARIA", IFCSANITARYTERMINALTYPE: "LOUCA", IFCOUTLETTYPE: "TOMADA", IFCSWITCHINGDEVICETYPE: "INTERRUPTOR",
  IFCPIPESEGMENTTYPE: "TUBULACAO", IFCCABLECARRIERSEGMENTTYPE: "ELETRODUTO",
};

const PREFIX: Record<string, number> = {
  EXA: 1e18, PETA: 1e15, TERA: 1e12, GIGA: 1e9, MEGA: 1e6, KILO: 1e3, HECTO: 1e2, DECA: 1e1,
  DECI: 1e-1, CENTI: 1e-2, MILLI: 1e-3, MICRO: 1e-6, NANO: 1e-9, PICO: 1e-12, FEMTO: 1e-15, ATTO: 1e-18,
};

const QTY_TYPES: Record<string, Dim> = { IFCQUANTITYLENGTH: "LENGTH", IFCQUANTITYAREA: "AREA", IFCQUANTITYVOLUME: "VOLUME", IFCQUANTITYCOUNT: "COUNT" };
const MEASURE_DIM: Record<string, Dim> = {
  IFCAREAMEASURE: "AREA", IFCVOLUMEMEASURE: "VOLUME", IFCLENGTHMEASURE: "LENGTH", IFCPOSITIVELENGTHMEASURE: "LENGTH", IFCCOUNTMEASURE: "COUNT",
};
/** Nomes aceitos em conjuntos de propriedades (Revit, ArchiCAD…) quando não há IfcElementQuantity. */
const PSET_NAMES: Record<string, Dim> = { AREA: "AREA", VOLUME: "VOLUME", LENGTH: "LENGTH", COMPRIMENTO: "LENGTH" };

export function parseIfc(text: string): IfcAnalysis {
  const f = new StepFile(text);
  const units = projectUnits(f);
  const factor = (dim: Dim, unitRef: number | null) => {
    if (unitRef !== null) {
      const u = unitFactor(f, unitRef);
      if (u !== null) return u;
    }
    return dim === "LENGTH" ? units.length : dim === "AREA" ? units.area : dim === "VOLUME" ? units.volume : 1;
  };

  // relações
  const contained = new Map<number, number>();
  for (const id of f.ofType("IFCRELCONTAINEDINSPATIALSTRUCTURE")) {
    const a = f.args(id);
    if (!a) continue;
    const structure = refsOf(a[5])[0];
    if (structure === undefined) continue;
    for (const el of refsOf(a[4])) contained.set(el, structure);
  }
  const parent = new Map<number, number>();
  for (const id of f.ofType("IFCRELAGGREGATES")) {
    const a = f.args(id);
    if (!a) continue;
    const whole = refsOf(a[4])[0];
    if (whole === undefined) continue;
    for (const part of refsOf(a[5])) parent.set(part, whole);
  }
  const materialOf = new Map<number, number>();
  for (const id of f.ofType("IFCRELASSOCIATESMATERIAL")) {
    const a = f.args(id);
    if (!a) continue;
    const mat = refsOf(a[5])[0];
    if (mat === undefined) continue;
    for (const obj of refsOf(a[4])) materialOf.set(obj, mat);
  }
  const typeOfObj = new Map<number, number>();
  for (const id of f.ofType("IFCRELDEFINESBYTYPE")) {
    const a = f.args(id);
    if (!a) continue;
    const ty = refsOf(a[5])[0];
    if (ty === undefined) continue;
    for (const obj of refsOf(a[4])) typeOfObj.set(obj, ty);
  }

  // quantidades e propriedades
  const quantities = new Map<number, Record<string, IfcQuantity & { dim: Dim }>>();
  let hasElementQuantities = false;
  const put = (obj: number, name: string, q: IfcQuantity & { dim: Dim }) => {
    let rec = quantities.get(obj);
    if (!rec) {
      rec = {};
      quantities.set(obj, rec);
    }
    const prev = rec[name];
    if (!prev || (prev.source === "PSET" && q.source === "QTO")) rec[name] = q;
  };
  for (const id of f.ofType("IFCRELDEFINESBYPROPERTIES")) {
    const a = f.args(id);
    if (!a) continue;
    const objects = refsOf(a[4]);
    for (const def of refsOf(a[5])) {
      const type = f.typeOf(def);
      const d = f.args(def);
      if (!d) continue;
      if (type === "IFCELEMENTQUANTITY") {
        for (const qid of refsOf(d[5])) {
          const dim = QTY_TYPES[f.typeOf(qid) ?? ""];
          const q = f.args(qid);
          if (!dim || !q) continue;
          const value = numOf(q[3]);
          if (value === null) continue;
          hasElementQuantities = true;
          const unitRef = refsOf(q[2])[0] ?? null;
          const name = str(q[0]);
          for (const obj of objects) put(obj, name, { dim, name, value: value * factor(dim, unitRef), source: "QTO" });
        }
      } else if (type === "IFCPROPERTYSET") {
        for (const pid of refsOf(d[4])) {
          if (f.typeOf(pid) !== "IFCPROPERTYSINGLEVALUE") continue;
          const p = f.args(pid);
          if (!p) continue;
          const name = str(p[0]);
          const nominal = p[2];
          const dim = isTyped(nominal) ? MEASURE_DIM[nominal.t] : undefined;
          const value = numOf(nominal);
          if (!dim || value === null || PSET_NAMES[name.toUpperCase()] !== dim) continue;
          const unitRef = refsOf(p[3])[0] ?? null;
          for (const obj of objects) put(obj, name, { dim, name, value: value * factor(dim, unitRef), source: "PSET" });
        }
      }
    }
  }

  // pavimentos
  const storeyName = (id: number): string => {
    const a = f.args(id);
    if (!a) return "";
    return str(a[2]).trim() || str(a[7]).trim() || `#${id}`;
  };
  const storeys = f.ofType("IFCBUILDINGSTOREY").map((id) => {
    const a = f.args(id);
    const elev = a ? numOf(a[9]) : null;
    return { name: storeyName(id), elevation: elev === null ? null : elev * units.length };
  });
  storeys.sort((a, b) => (a.elevation ?? 0) - (b.elevation ?? 0));
  const storeyOf = (el: number): string | null => {
    let cur: number | undefined = el;
    for (let guard = 0; cur !== undefined && guard < 32; guard++) {
      let s = contained.get(cur);
      for (let up = 0; s !== undefined && up < 32; up++) {
        if (f.typeOf(s) === "IFCBUILDINGSTOREY") return storeyName(s);
        s = parent.get(s);
      }
      cur = parent.get(cur);
    }
    return null;
  };

  const materialName = (id: number, depth = 0): string | null => {
    if (depth > 6) return null;
    const type = f.typeOf(id);
    const a = f.args(id);
    if (!type || !a) return null;
    const join = (ids: number[]) => {
      const names = [...new Set(ids.map((x) => materialName(x, depth + 1)).filter((x): x is string => !!x))];
      return names.length ? names.join(" + ") : null;
    };
    switch (type) {
      case "IFCMATERIAL": return str(a[0]).trim() || null;
      case "IFCMATERIALLIST": return join(refsOf(a[0]));
      case "IFCMATERIALLAYERSETUSAGE": return join(refsOf(a[0]));
      case "IFCMATERIALLAYERSET": return str(a[1]).trim() || join(refsOf(a[0]));
      case "IFCMATERIALLAYER": return join(refsOf(a[0]));
      case "IFCMATERIALPROFILESETUSAGE": return join(refsOf(a[0]));
      case "IFCMATERIALPROFILESET": return str(a[0]).trim() || join(refsOf(a[2]));
      case "IFCMATERIALPROFILE": return join(refsOf(a[2]));
      case "IFCMATERIALCONSTITUENTSET": return str(a[0]).trim() || join(refsOf(a[2]));
      case "IFCMATERIALCONSTITUENT": return join(refsOf(a[2]));
      default: return null;
    }
  };
  const elementMaterial = (el: number): string | null => {
    const m = materialOf.get(el);
    if (m !== undefined) return materialName(m);
    const ty = typeOfObj.get(el);
    const tm = ty !== undefined ? materialOf.get(ty) : undefined;
    return tm !== undefined ? materialName(tm) : null;
  };

  // elementos
  const elements: IfcElement[] = [];
  const trackedTypes = Object.keys(TRACKED);
  for (const id of f.ofType(...trackedTypes)) {
    const type = f.typeOf(id)!;
    const a = f.args(id);
    if (!a) continue;
    const rule = TRACKED[type]!;
    const predefined = isEnum(a[8]) ? a[8].e : "";
    let kind: ItemKind;
    if (rule === "SLAB") kind = predefined === "ROOF" ? "COBERTURA" : predefined === "BASESLAB" ? "FUNDACAO" : "LAJE";
    else if (rule === "COVERING") kind = predefined === "FLOORING" ? "PISO" : predefined === "CEILING" ? "FORRO" : predefined === "ROOFING" ? "COBERTURA" : "REVESTIMENTO";
    else if (rule === "FLOW") {
      const ty = typeOfObj.get(id);
      const tyType = ty !== undefined ? f.typeOf(ty) : null;
      const tyArgs = ty !== undefined ? f.args(ty) : null;
      kind = (tyType && TYPE_OBJECT_KIND[tyType]) || classifyName(str(a[2]), tyArgs ? str(tyArgs[2]) : "");
    } else kind = rule;
    const name = kind === "AMBIENTE" ? str(a[7]).trim() || str(a[2]).trim() : str(a[2]).trim();
    const isOpening = kind === "PORTA" || kind === "JANELA";
    const h = isOpening ? numOf(a[8]) : null;
    const w = isOpening ? numOf(a[9]) : null;
    elements.push({
      id,
      type,
      kind,
      name,
      storey: storeyOf(id),
      material: elementMaterial(id),
      width: w !== null && w > 0 ? w * units.length : null,
      height: h !== null && h > 0 ? h * units.length : null,
      quantities: quantities.get(id) ?? {},
      partOf: null,
    });
  }
  // partes da mesma classe (lajes de uma cobertura): as quantidades vão para o pai
  const byId = new Map(elements.map((e) => [e.id, e]));
  for (const e of elements) {
    let p = parent.get(e.id);
    for (let guard = 0; p !== undefined && guard < 16; guard++) {
      const pe = byId.get(p);
      if (pe && pe.kind === e.kind) {
        e.partOf = pe.id;
        break;
      }
      p = parent.get(p);
    }
  }

  const counts = f.typeCounts();
  const untracked: Record<string, number> = {};
  for (const t of UNTRACKED) {
    const n = counts.get(t);
    if (n) untracked[t] = n;
  }

  return { schema: f.schema, units, elements, storeys, hasElementQuantities, untracked, records: f.size };
}

/* ───────────────────────────── unidades ───────────────────────────── */

function unitFactor(f: StepFile, id: number, depth = 0): number | null {
  if (depth > 4) return null;
  const type = f.typeOf(id);
  const a = f.args(id);
  if (!type || !a) return null;
  if (type === "IFCSIUNIT") {
    const unitType = isEnum(a[1]) ? a[1].e : "";
    const prefix = isEnum(a[2]) ? PREFIX[a[2].e] ?? 1 : 1;
    const power = unitType === "AREAUNIT" ? 2 : unitType === "VOLUMEUNIT" ? 3 : 1;
    return prefix ** power;
  }
  if (type === "IFCCONVERSIONBASEDUNIT") {
    const m = refsOf(a[3])[0];
    const mw = m !== undefined ? f.args(m) : null;
    if (!mw) return null;
    const value = numOf(mw[0]);
    const base = refsOf(mw[1])[0];
    const baseFactor = base !== undefined ? unitFactor(f, base, depth + 1) : 1;
    return value !== null && baseFactor !== null ? value * baseFactor : null;
  }
  return null;
}

function projectUnits(f: StepFile): IfcAnalysis["units"] {
  const out = { length: 1, area: 1, volume: 1, declared: false, lengthName: "m" };
  const project = f.ofType("IFCPROJECT")[0];
  const pa = project !== undefined ? f.args(project) : null;
  const assignment = (pa ? refsOf(pa[8])[0] : undefined) ?? f.ofType("IFCUNITASSIGNMENT")[0];
  const ua = assignment !== undefined ? f.args(assignment) : null;
  if (!ua) return out;
  for (const u of refsOf(ua[0])) {
    const type = f.typeOf(u);
    const a = f.args(u);
    if (!a) continue;
    const unitType = isEnum(a[1]) ? a[1].e : "";
    const fac = unitFactor(f, u);
    if (fac === null) continue;
    if (unitType === "LENGTHUNIT") {
      out.length = fac;
      out.declared = true;
      out.lengthName = type === "IFCCONVERSIONBASEDUNIT" ? str(a[2]).toLowerCase() || "?" : `${isEnum(a[2]) ? a[2].e.toLowerCase() : ""}metre`;
    } else if (unitType === "AREAUNIT") out.area = fac;
    else if (unitType === "VOLUMEUNIT") out.volume = fac;
  }
  return out;
}
