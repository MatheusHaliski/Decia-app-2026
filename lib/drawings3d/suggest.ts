/**
 * Sugestões da "IA" do editor 3D (RF74 prévia fantasma no 3D; D-12): regras DETERMINÍSTICAS sobre o modelo — nenhum modelo de
 * IA é chamado. Cada sugestão é um patch pronto sobre o `Scene3D` (transformação antes → depois, ou objeto novo), com o que
 * leu (`dependsOn`, para invalidar quando algo muda) e as cópias "depois" para desenhar em transparência. Todo número do texto
 * vem do cálculo. Só objetos na raiz (sem pai) recebem sugestão; cada objeto recebe no máximo uma.
 *
 * - ASSENTAR: base flutuando acima (ou afundada até 5 cm) da superfície logo abaixo — piso ou topo de outro objeto → pousa.
 * - ALINHAR: centros quase iguais em X ou Z (≤ 4 cm, diferentes) → leva ao valor mais comum (empate: o menor).
 * - IGUALAR_ESCALA: objetos do mesmo tipo com escala uniforme quase igual (≤ 10%) → a mais comum, mantendo a base no lugar.
 * - ENCAIXAR_GRADE: posição X/Z fora da grade de 5 cm → arredonda para a grade.
 * - ESPELHAR: objeto sobre a maior placa, fora do eixo dela, sem par espelhado → propõe a cópia espelhada (sem colidir).
 */
import { boxesOverlap, footprintContains, worldBox, type Box } from "./bounds";
import type { Scene3D, SceneObject, Transform, Vec3 } from "./model";

export const SUGGESTION3D_KINDS = ["ASSENTAR", "ALINHAR", "IGUALAR_ESCALA", "ENCAIXAR_GRADE", "ESPELHAR"] as const;
export type Suggestion3DKind = (typeof SUGGESTION3D_KINDS)[number];

export interface Label3D {
  key: string;
  vars?: Readonly<Record<string, string | number>>;
}

export type Op3D =
  | { op: "transform"; id: string; before: Transform; after: Transform }
  | { op: "add"; object: SceneObject };

export interface Suggestion3D {
  /** determinístico: tipo + alvo (a mesma situação gera o mesmo id) */
  id: string;
  kind: Suggestion3DKind;
  label: Label3D;
  ops: Op3D[];
  /** objetos alterados ou criados */
  targetIds: string[];
  /** objetos lidos para calcular: mudou algum → a sugestão fica obsoleta */
  dependsOn: string[];
  /** objetos existentes de que a sugestão trata (escopo da seleção no modo Assistido) */
  scopeIds: string[];
  /** cópias "depois", desenhadas em transparência */
  ghosts: SceneObject[];
}

export interface Suggest3DOptions {
  /** passo da grade no piso, em metros (padrão 0,05) */
  grid?: number;
  /** "quase" igual para alinhar, em metros (padrão 0,04) */
  alignTolerance?: number;
  /** diferença relativa máxima para igualar escala (padrão 0,1) */
  scaleTolerance?: number;
  /** quanto um objeto pode estar afundado e ainda ser "pousado" na superfície (padrão 0,05 m) */
  sinkTolerance?: number;
  /** nome da cópia espelhada (vem do i18n da tela) */
  mirrorName?: (source: string) => string;
}

const EPS = 1e-3;
/** arredonda para 0,1 mm (evita ruído de ponto flutuante nas transformações propostas) */
const q4 = (v: number) => Math.round(v * 1e4) / 1e4;
/** centímetros com 1 casa, para o texto */
const cm = (m: number) => Math.round(Math.abs(m) * 1000) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;
const byId = (a: SceneObject, b: SceneObject) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const withPos = (t: Transform, i: 0 | 1 | 2, v: number): Transform => ({ ...t, position: t.position.map((p, k) => (k === i ? q4(v) : p)) as unknown as Vec3 });

/** Grupos de valores próximos (a partir do primeiro de cada grupo, sem "arrastar" a tolerância). */
function clusters<T>(items: readonly T[], value: (t: T) => number, within: (first: number, v: number) => boolean): T[][] {
  const sorted = [...items].sort((a, b) => value(a) - value(b));
  const out: T[][] = [];
  for (const item of sorted) {
    const last = out.at(-1);
    if (last && within(value(last[0]!), value(item))) last.push(item);
    else out.push([item]);
  }
  return out.filter((c) => c.length > 1);
}

/** O mais repetido; empate → o menor (determinístico). */
function referenceValue(values: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]![0];
}

function make(scene: Scene3D, base: Omit<Suggestion3D, "ghosts">): Suggestion3D {
  const ghosts = base.ops.map((op) => (op.op === "add" ? op.object : { ...scene.objects.find((o) => o.id === op.id)!, transform: op.after }));
  return { ...base, ghosts };
}

const transformOp = (o: SceneObject, after: Transform): Op3D => ({ op: "transform", id: o.id, before: o.transform, after });

interface Ctx {
  scene: Scene3D;
  roots: SceneObject[];
  boxes: Map<string, Box>;
  taken: Set<string>;
}

/* ── ASSENTAR ────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Superfície logo abaixo da base do objeto: piso (y = 0) ou topo de outro objeto cuja projeção contém o centro dele. */
export function supportUnder(ctx: Pick<Ctx, "roots" | "boxes">, o: SceneObject, sinkTol: number): { height: number; by: SceneObject | null } {
  const box = ctx.boxes.get(o.id)!;
  const cx = o.transform.position[0];
  const cz = o.transform.position[2];
  let best: { height: number; by: SceneObject | null } = { height: 0, by: null };
  for (const other of ctx.roots) {
    if (other.id === o.id) continue;
    const ob = ctx.boxes.get(other.id)!;
    const top = ob.max[1];
    // apoio é o que está embaixo: topo até `sinkTol` acima da base e o próprio apoio começa abaixo da base
    if (!footprintContains(ob, cx, cz) || top > box.min[1] + sinkTol || ob.min[1] >= box.min[1] - EPS) continue;
    if (top > best.height + EPS || (Math.abs(top - best.height) <= EPS && best.by && other.id < best.by.id)) best = { height: top, by: other };
  }
  return best;
}

function settle(ctx: Ctx, sinkTol: number): Suggestion3D[] {
  const out: Suggestion3D[] = [];
  for (const o of ctx.roots) {
    const box = ctx.boxes.get(o.id)!;
    const support = supportUnder(ctx, o, sinkTol);
    const delta = support.height - box.min[1];
    if (Math.abs(delta) <= EPS || -delta > 50) continue;
    const after = withPos(o.transform, 1, o.transform.position[1] + delta);
    const dir = delta < 0 ? "down" : "up";
    const label: Label3D = support.by
      ? { key: `d3.ghost.sug.ASSENTAR.on.${dir}`, vars: { name: o.name, support: support.by.name, cm: cm(delta) } }
      : { key: `d3.ghost.sug.ASSENTAR.floor.${dir}`, vars: { name: o.name, cm: cm(delta) } };
    out.push(make(ctx.scene, {
      id: `ASSENTAR:${o.id}`, kind: "ASSENTAR", label, ops: [transformOp(o, after)],
      targetIds: [o.id], dependsOn: support.by ? [o.id, support.by.id] : [o.id], scopeIds: [o.id],
    }));
    ctx.taken.add(o.id);
  }
  return out;
}

/* ── ALINHAR ─────────────────────────────────────────────────────────────────────────────────────────────────── */

function align(ctx: Ctx, tol: number): Suggestion3D[] {
  const free = ctx.roots.filter((o) => !ctx.taken.has(o.id));
  const want = new Map<string, { x?: number; z?: number; refs: Set<string> }>();
  for (const axis of [0, 2] as const) {
    for (const group of clusters(free, (o) => o.transform.position[axis], (a, v) => v - a <= tol + 1e-9)) {
      const ref = referenceValue(group.map((o) => o.transform.position[axis]));
      for (const o of group) {
        if (o.transform.position[axis] === ref) continue;
        const cur = want.get(o.id) ?? { refs: new Set<string>() };
        group.filter((g) => g.id !== o.id && g.transform.position[axis] === ref).forEach((g) => cur.refs.add(g.id));
        want.set(o.id, { ...cur, ...(axis === 0 ? { x: ref } : { z: ref }) });
      }
    }
  }
  const out: Suggestion3D[] = [];
  for (const o of [...free].sort(byId)) {
    const w = want.get(o.id);
    if (!w) continue;
    let after = o.transform;
    if (w.x !== undefined) after = withPos(after, 0, w.x);
    if (w.z !== undefined) after = withPos(after, 2, w.z);
    const refs = [...w.refs].sort();
    const refNames = refs.map((id) => ctx.scene.objects.find((x) => x.id === id)?.name ?? id).join(", ");
    const p = o.transform.position;
    const label: Label3D = w.x !== undefined && w.z !== undefined
      ? { key: "d3.ghost.sug.ALINHAR.both", vars: { name: o.name, refs: refNames, dx: cm(after.position[0] - p[0]), dz: cm(after.position[2] - p[2]) } }
      : w.x !== undefined
        ? { key: "d3.ghost.sug.ALINHAR.x", vars: { name: o.name, refs: refNames, from: r2(p[0]), to: r2(after.position[0]) } }
        : { key: "d3.ghost.sug.ALINHAR.z", vars: { name: o.name, refs: refNames, from: r2(p[2]), to: r2(after.position[2]) } };
    out.push(make(ctx.scene, { id: `ALINHAR:${o.id}`, kind: "ALINHAR", label, ops: [transformOp(o, after)], targetIds: [o.id], dependsOn: [o.id, ...refs], scopeIds: [o.id] }));
    ctx.taken.add(o.id);
  }
  return out;
}

/* ── IGUALAR_ESCALA ──────────────────────────────────────────────────────────────────────────────────────────── */

const uniformScale = (o: SceneObject): number | null => {
  const [a, b, c] = o.transform.scale;
  return Math.abs(a - b) <= 1e-6 && Math.abs(a - c) <= 1e-6 ? a : null;
};

function matchScale(ctx: Ctx, tol: number): Suggestion3D[] {
  const byKind = new Map<string, SceneObject[]>();
  for (const o of ctx.roots) if (uniformScale(o) !== null) byKind.set(o.kind, [...(byKind.get(o.kind) ?? []), o]);
  const out: Suggestion3D[] = [];
  for (const kind of [...byKind.keys()].sort()) {
    for (const group of clusters(byKind.get(kind)!, (o) => uniformScale(o)!, (a, v) => (v - a) / a <= tol + 1e-9)) {
      const ref = referenceValue(group.map((o) => uniformScale(o)!));
      const refs = group.filter((g) => uniformScale(g) === ref).map((g) => g.id).sort();
      for (const o of [...group].sort(byId)) {
        if (uniformScale(o) === ref || ctx.taken.has(o.id)) continue;
        // a base fica onde estava: escala nova e o y corrigido pela diferença da base
        const scaled: Transform = { ...o.transform, scale: [ref, ref, ref] };
        const lift = ctx.boxes.get(o.id)!.min[1] - worldBox({ kind: o.kind, transform: scaled }).min[1];
        const after = withPos(scaled, 1, o.transform.position[1] + lift);
        const refNames = refs.map((id) => ctx.scene.objects.find((x) => x.id === id)?.name ?? id).join(", ");
        out.push(make(ctx.scene, {
          id: `IGUALAR_ESCALA:${o.id}`, kind: "IGUALAR_ESCALA",
          label: { key: "d3.ghost.sug.IGUALAR_ESCALA", vars: { name: o.name, refs: refNames, from: r2(uniformScale(o)!), to: r2(ref) } },
          ops: [transformOp(o, after)], targetIds: [o.id], dependsOn: [o.id, ...refs], scopeIds: [o.id],
        }));
        ctx.taken.add(o.id);
      }
    }
  }
  return out;
}

/* ── ENCAIXAR_GRADE ──────────────────────────────────────────────────────────────────────────────────────────── */

function snapToGrid(ctx: Ctx, grid: number): Suggestion3D[] {
  const out: Suggestion3D[] = [];
  const snap = (v: number) => q4(Math.round(v / grid) * grid);
  for (const o of [...ctx.roots].sort(byId)) {
    if (ctx.taken.has(o.id)) continue;
    const [x, , z] = o.transform.position;
    const sx = snap(x);
    const sz = snap(z);
    if (Math.abs(sx - x) <= 1e-6 && Math.abs(sz - z) <= 1e-6) continue;
    const after = withPos(withPos(o.transform, 0, sx), 2, sz);
    out.push(make(ctx.scene, {
      id: `ENCAIXAR_GRADE:${o.id}`, kind: "ENCAIXAR_GRADE",
      label: { key: "d3.ghost.sug.ENCAIXAR_GRADE", vars: { name: o.name, grid: cm(grid), shift: cm(Math.max(Math.abs(sx - x), Math.abs(sz - z))) } },
      ops: [transformOp(o, after)], targetIds: [o.id], dependsOn: [o.id], scopeIds: [o.id],
    }));
    ctx.taken.add(o.id);
  }
  return out;
}

/* ── ESPELHAR ────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Maior placa na raiz (área da projeção no piso): é o "palco" que define o eixo de simetria. */
export function mainPlate(scene: Scene3D): SceneObject | null {
  const plates = scene.objects.filter((o) => o.kind === "placa" && !o.parentId);
  const area = (o: SceneObject) => { const b = worldBox(o); return (b.max[0] - b.min[0]) * (b.max[2] - b.min[2]); };
  return [...plates].sort((a, b) => area(b) - area(a) || byId(a, b))[0] ?? null;
}

/** Espelho no plano x = eixo: posição refletida e rotação em Y e Z invertidas (reflexão de uma rotação XYZ). */
export function mirrorTransform(t: Transform, axis: number): Transform {
  return { position: [q4(2 * axis - t.position[0]), t.position[1], t.position[2]], rotation: [t.rotation[0], t.rotation[1] ? -t.rotation[1] : 0, t.rotation[2] ? -t.rotation[2] : 0], scale: t.scale };
}

function mirror(ctx: Ctx, tol: number, name: (source: string) => string): Suggestion3D[] {
  const plate = mainPlate(ctx.scene);
  if (!plate) return [];
  const plateBox = ctx.boxes.get(plate.id)!;
  const axis = q4(plate.transform.position[0]);
  const out: Suggestion3D[] = [];
  const near = (a: Vec3, b: Vec3) => a.every((v, i) => Math.abs(v - b[i]!) <= tol);
  for (const o of [...ctx.roots].sort(byId)) {
    if (o.id === plate.id || ctx.taken.has(o.id) || Math.abs(o.transform.position[0] - axis) <= tol) continue;
    const box = ctx.boxes.get(o.id)!;
    // só o que está pousado sobre a placa
    if (!footprintContains(plateBox, o.transform.position[0], o.transform.position[2]) || Math.abs(box.min[1] - plateBox.max[1]) > 0.01) continue;
    const t = mirrorTransform(o.transform, axis);
    if (ctx.roots.some((x) => x.kind === o.kind && x.id !== o.id && near(x.transform.position, t.position) && near(x.transform.scale, t.scale))) continue;
    const mBox = worldBox({ kind: o.kind, transform: t });
    if (!footprintContains(plateBox, t.position[0], t.position[2])) continue;
    if (ctx.roots.some((x) => x.id !== plate.id && boxesOverlap(ctx.boxes.get(x.id)!, mBox))) continue;
    const id = `${o.id}-sim`;
    if (ctx.scene.objects.some((x) => x.id === id)) continue;
    const object: SceneObject = { id, name: name(o.name), kind: o.kind, materialId: o.materialId, transform: t };
    out.push(make(ctx.scene, {
      id: `ESPELHAR:${o.id}`, kind: "ESPELHAR",
      label: { key: "d3.ghost.sug.ESPELHAR", vars: { name: o.name, plate: plate.name, axis: r2(axis) } },
      ops: [{ op: "add", object }], targetIds: [id], dependsOn: [o.id, plate.id, id], scopeIds: [o.id],
    }));
  }
  return out;
}

/* ── Entrada ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Todas as sugestões para a cena, em ordem de prioridade e de id. */
export function suggest3D(scene: Scene3D, opts: Suggest3DOptions = {}): Suggestion3D[] {
  const roots = scene.objects.filter((o) => !o.parentId);
  const ctx: Ctx = { scene, roots, boxes: new Map(roots.map((o) => [o.id, worldBox(o)])), taken: new Set() };
  const out = [
    ...settle(ctx, opts.sinkTolerance ?? 0.05),
    ...align(ctx, opts.alignTolerance ?? 0.04),
    ...matchScale(ctx, opts.scaleTolerance ?? 0.1),
    ...snapToGrid(ctx, opts.grid ?? 0.05),
    ...mirror(ctx, opts.alignTolerance ?? 0.04, opts.mirrorName ?? ((s) => `${s} (espelhado)`)),
  ];
  const order = new Map(SUGGESTION3D_KINDS.map((k, i) => [k, i]));
  return out.sort((a, b) => order.get(a.kind)! - order.get(b.kind)! || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * "Revisão do escopo" no 3D: impressão digital (FNV-1a) do conteúdo dos objetos lidos — tipo, nome, material, transformação,
 * pai. Qualquer mudança neles (editar, remover, criar o que a sugestão ia criar) muda o número; mudanças em outros, não.
 */
export function sceneFingerprint(scene: Scene3D, ids: readonly string[]): number {
  const byIdMap = new Map(scene.objects.map((o) => [o.id, o]));
  const text = [...new Set(ids)].sort().map((id) => {
    const o = byIdMap.get(id);
    return o ? `${id}:${JSON.stringify([o.kind, o.name, o.materialId, o.transform, o.parentId ?? null])}` : `${id}:-`;
  }).join(";");
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}
