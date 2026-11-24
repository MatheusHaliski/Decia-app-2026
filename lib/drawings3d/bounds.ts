/**
 * Caixas envolventes do modelo 3D sem three.js (para as sugestões da IA, RF74 no 3D): cada primitiva tem uma caixa local com
 * escala 1 — a mesma geometria da fábrica (`engine/geometry-factory`) — e a caixa no mundo é a dos 8 cantos depois de escala,
 * rotação (graus, ordem XYZ como no three.js) e posição. Só objetos na raiz (sem `parentId`) têm caixa no mundo calculada
 * aqui; filhos herdam a transformação do pai e ficam de fora das sugestões.
 */
import type { PrimitiveKind, SceneObject, Vec3 } from "./model";

export interface Box {
  min: Vec3;
  max: Vec3;
}

/**
 * Caixa local (escala 1) de cada primitiva. Caixa, esfera, cilindro e cone: cubo de 1 m centrado. Toro (raio 0,42, tubo 0,15)
 * no plano XY. Nó toroidal: aproximação conservadora da curva (p=2, q=3). Vaso: base em y = 0, 0,95 m de altura. Placa: 5 cm.
 */
export const LOCAL_BOX: Record<PrimitiveKind, Box> = {
  caixa: { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
  esfera: { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
  cilindro: { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
  cone: { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
  toro: { min: [-0.57, -0.57, -0.15], max: [0.57, 0.57, 0.15] },
  no: { min: [-0.62, -0.62, -0.31], max: [0.62, 0.62, 0.31] },
  vaso: { min: [-0.38, 0, -0.38], max: [0.38, 0.96, 0.38] },
  placa: { min: [-0.5, -0.025, -0.5], max: [0.5, 0.025, 0.5] },
};

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Aplica a rotação de Euler XYZ (three.js: R = Rx · Ry · Rz) a um vetor. */
export function rotateXYZ(v: Vec3, rotationDeg: Vec3): Vec3 {
  const [ax, ay, az] = rotationDeg.map(rad) as unknown as [number, number, number];
  let [x, y, z] = v;
  // Rz primeiro (o vetor é multiplicado pela direita)
  [x, y] = [x * Math.cos(az) - y * Math.sin(az), x * Math.sin(az) + y * Math.cos(az)];
  [x, z] = [x * Math.cos(ay) + z * Math.sin(ay), -x * Math.sin(ay) + z * Math.cos(ay)];
  [y, z] = [y * Math.cos(ax) - z * Math.sin(ax), y * Math.sin(ax) + z * Math.cos(ax)];
  return [x, y, z];
}

/** Caixa no mundo de um objeto (alinhada aos eixos), a partir da transformação do próprio objeto. */
export function worldBox(o: Pick<SceneObject, "kind" | "transform">): Box {
  const { min, max } = LOCAL_BOX[o.kind];
  const { position: p, rotation: r, scale: s } = o.transform;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < 8; i += 1) {
    const corner: Vec3 = [(i & 1 ? max : min)[0] * s[0], (i & 2 ? max : min)[1] * s[1], (i & 4 ? max : min)[2] * s[2]];
    const w = rotateXYZ(corner, r);
    for (let k = 0; k < 3; k += 1) {
      const v = w[k]! + p[k]!;
      lo[k] = Math.min(lo[k]!, v);
      hi[k] = Math.max(hi[k]!, v);
    }
  }
  // arredonda ruído de ponto flutuante (sen/cos) para o milímetro de décimo
  const q = (v: number) => Math.round(v * 1e4) / 1e4;
  return { min: [q(lo[0]!), q(lo[1]!), q(lo[2]!)], max: [q(hi[0]!), q(hi[1]!), q(hi[2]!)] };
}

/** Sobreposição com volume (encostar não conta). */
export const boxesOverlap = (a: Box, b: Box, eps = 1e-3) =>
  a.min[0] < b.max[0] - eps && b.min[0] < a.max[0] - eps &&
  a.min[1] < b.max[1] - eps && b.min[1] < a.max[1] - eps &&
  a.min[2] < b.max[2] - eps && b.min[2] < a.max[2] - eps;

/** O ponto (x, z) cai dentro da projeção da caixa no piso. */
export const footprintContains = (b: Box, x: number, z: number) => x >= b.min[0] && x <= b.max[0] && z >= b.min[2] && z <= b.max[2];

export const boxCenter = (b: Box): Vec3 => [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
