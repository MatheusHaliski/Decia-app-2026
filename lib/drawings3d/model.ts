/**
 * Documento 3D do Drawings (RF60, RF62, RF63): dados puros, sem three.js. A cena é uma árvore (Composite): cada objeto pode ter
 * `parentId`, e mover, remover ou trocar material é sempre uma operação sobre este modelo — a viewport só o desenha (Adapter em
 * `engine/scene-adapter`). Objetos novos nascem pela fábrica `createObject` (Factory Method por tipo de primitiva).
 */
export type Vec3 = readonly [number, number, number];

export interface Transform {
  position: Vec3;
  /** Rotação em graus (X, Y, Z) — o que a pessoa digita no inspetor. */
  rotation: Vec3;
  scale: Vec3;
}

export const PRIMITIVE_KINDS = ["caixa", "esfera", "cilindro", "cone", "toro", "no", "vaso", "placa"] as const;
export type PrimitiveKind = (typeof PRIMITIVE_KINDS)[number];

export interface SceneObject {
  id: string;
  name: string;
  kind: PrimitiveKind;
  materialId: string;
  transform: Transform;
  parentId?: string;
}

export interface Scene3D {
  objects: readonly SceneObject[];
}

/** Altura de apoio de cada primitiva com escala 1: a fábrica as pousa sobre o piso (y = 0) em vez de enterrá-las. */
const REST_HEIGHT: Record<PrimitiveKind, number> = {
  caixa: 0.5, esfera: 0.5, cilindro: 0.5, cone: 0.5, toro: 0.15, no: 0.62, vaso: 0, placa: 0.025,
};

const DEFAULT_MATERIAL: Record<PrimitiveKind, string> = {
  caixa: "madeira-carvalho", esfera: "vidro", cilindro: "aco-escovado", cone: "ceramica-esmaltada",
  toro: "ouro", no: "cobre", vaso: "ceramica-esmaltada", placa: "concreto",
};

let counter = 0;
/** Id curto e único na sessão; o servidor (quando houver persistência) atribui o definitivo. */
export function newObjectId(): string {
  counter += 1;
  return `o${Date.now().toString(36)}${counter.toString(36)}`;
}

/** Fábrica de objetos: cada tipo nasce com nome, material e apoio no piso coerentes. */
export function createObject(kind: PrimitiveKind, name: string, at: Partial<Transform> = {}, id = newObjectId()): SceneObject {
  return {
    id,
    name,
    kind,
    materialId: DEFAULT_MATERIAL[kind],
    transform: {
      position: at.position ?? [0, REST_HEIGHT[kind], 0],
      rotation: at.rotation ?? [0, 0, 0],
      scale: at.scale ?? [1, 1, 1],
    },
  };
}

export const objectById = (scene: Scene3D, id: string | null | undefined) => scene.objects.find((o) => o.id === id);

/** O objeto e todos os descendentes (seguro contra ciclo de `parentId`, que é dado corrompido). */
export function subtreeIds(scene: Scene3D, rootId: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const o of scene.objects) {
    if (!o.parentId) continue;
    children.set(o.parentId, [...(children.get(o.parentId) ?? []), o.id]);
  }
  const out = new Set<string>();
  const stack = scene.objects.some((o) => o.id === rootId) ? [rootId] : [];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(children.get(id) ?? []));
  }
  return out;
}

/** Valor numérico finito dentro de um intervalo; entrada inválida (NaN, ∞, texto) não altera o modelo. */
export function clampFinite(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

export const LIMITS = { position: 100, scale: { min: 0.01, max: 50 }, rotation: 360 } as const;

/** Normaliza uma transformação vinda da interface: limita posição e escala, leva a rotação para (-360, 360). */
export function sanitizeTransform(next: Transform, previous: Transform): Transform {
  const pos = next.position.map((v, i) => clampFinite(v, -LIMITS.position, LIMITS.position, previous.position[i]!)) as unknown as Vec3;
  const rot = next.rotation.map((v, i) => (Number.isFinite(v) ? v % LIMITS.rotation : previous.rotation[i]!)) as unknown as Vec3;
  const scl = next.scale.map((v, i) => clampFinite(v, LIMITS.scale.min, LIMITS.scale.max, previous.scale[i]!)) as unknown as Vec3;
  return { position: pos, rotation: rot, scale: scl };
}

/** Cena inicial: uma composição de estúdio que exercita os materiais (vidro, metais, madeira, cerâmica, concreto). */
export function starterScene(): Scene3D {
  return {
    objects: [
      createObject("placa", "Pedestal", { position: [0, 0.025, 0], scale: [3.2, 1, 2.2] }, "o-pedestal"),
      createObject("caixa", "Bloco de carvalho", { position: [-0.95, 0.5 + 0.05, -0.2], rotation: [0, 18, 0] }, "o-bloco"),
      createObject("esfera", "Esfera de vidro", { position: [0.2, 0.5 + 0.05, 0.35] }, "o-esfera"),
      createObject("vaso", "Vaso esmaltado", { position: [1.05, 0.05, -0.35] }, "o-vaso"),
      createObject("toro", "Anel de ouro", { position: [0.95, 0.05 + 0.15 * 0.55, 0.55], rotation: [90, 0, 25], scale: [0.55, 0.55, 0.55] }, "o-anel"),
      createObject("no", "Nó de cobre", { position: [-0.55, 0.05 + 0.62 * 0.45, 0.65], rotation: [0, 30, 0], scale: [0.45, 0.45, 0.45] }, "o-no"),
      createObject("cilindro", "Coluna de aço escovado", { position: [-1.85, 0.75, 0.6], scale: [0.35, 1.5, 0.35] }, "o-coluna"),
    ].map((o) => (o.id === "o-pedestal" ? { ...o, materialId: "concreto" } : o)),
  };
}

const isVec3 = (v: unknown): v is Vec3 => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number" && Number.isFinite(n));

/**
 * Lê uma cena salva (rascunho local ou arquivo): aceita só o que tem forma válida — tipo conhecido, id e nome em texto,
 * transformação com 3 números finitos — e descarta o resto, em vez de quebrar a tela. Ids repetidos ficam com o primeiro.
 */
export function parseScene(raw: unknown): Scene3D | null {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { objects?: unknown }).objects)) return null;
  const seen = new Set<string>();
  const objects: SceneObject[] = [];
  for (const item of (raw as { objects: unknown[] }).objects.slice(0, 500)) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const t = o.transform as Record<string, unknown> | undefined;
    if (typeof o.id !== "string" || !o.id || seen.has(o.id) || typeof o.name !== "string") continue;
    if (!PRIMITIVE_KINDS.includes(o.kind as PrimitiveKind) || typeof o.materialId !== "string") continue;
    if (!t || !isVec3(t.position) || !isVec3(t.rotation) || !isVec3(t.scale)) continue;
    seen.add(o.id);
    const base: Transform = { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
    objects.push({
      id: o.id,
      name: o.name.slice(0, 80),
      kind: o.kind as PrimitiveKind,
      materialId: o.materialId,
      transform: sanitizeTransform({ position: t.position, rotation: t.rotation, scale: t.scale }, base),
      ...(typeof o.parentId === "string" ? { parentId: o.parentId } : {}),
    });
  }
  return { objects };
}
