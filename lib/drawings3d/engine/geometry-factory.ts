/**
 * Fábrica de geometrias (Factory Method + Flyweight): uma malha de alta resolução por tipo de primitiva, compartilhada por todos
 * os objetos daquele tipo (o tamanho vem da escala do objeto). Arestas são arredondadas de propósito: nada no mundo real tem
 * quina de espessura zero, e é o filete que pega o brilho do softbox — sem ele, o objeto parece gerado por computador.
 */
import { BufferGeometry, ConeGeometry, LatheGeometry, SphereGeometry, TorusGeometry, TorusKnotGeometry, Vector2 } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { PrimitiveKind } from "../model";

const RADIAL = 128;
const cache = new Map<PrimitiveKind, BufferGeometry>();

/** Arco de um quarto de círculo de `from` (ângulo) a `to`, em torno de (cx, cy). */
function arc(cx: number, cy: number, r: number, from: number, to: number, steps = 10): Vector2[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / steps;
    return new Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  });
}

/** Cilindro de raio 0,5 e altura 1 (centro na origem) com filete de 2 cm nas bordas. */
function filletedCylinder(): BufferGeometry {
  const r = 0.5, h = 0.5, f = 0.02;
  const profile = [
    new Vector2(0, -h),
    ...arc(r - f, -h + f, f, -Math.PI / 2, 0),
    ...arc(r - f, h - f, f, 0, Math.PI / 2),
    new Vector2(0, h),
  ];
  return new LatheGeometry(profile, RADIAL);
}

/**
 * Vaso torneado com parede de 1,2 cm: perfil externo sobe da base, faz a borda arredondada e desce por dentro — a espessura real
 * é o que deixa o esmalte (e o vidro, se a pessoa trocar o material) refratar e sombrear como uma peça de verdade. Base em y = 0.
 */
function vase(): BufferGeometry {
  const outer = (t: number) => 0.22 + 0.16 * Math.sin(Math.PI * (t * 0.95 + 0.05)) - 0.1 * t * t; // bojo e gargalo
  const wall = 0.012, height = 0.95, steps = 48;
  const out: Vector2[] = [new Vector2(0, 0), new Vector2(outer(0) - 0.01, 0), new Vector2(outer(0), 0.01)];
  for (let i = 1; i <= steps; i += 1) out.push(new Vector2(outer(i / steps), (i / steps) * height));
  const lip = arc(outer(1) - wall / 2, height, wall / 2, 0, Math.PI, 8);
  const inner: Vector2[] = [];
  for (let i = steps; i >= 1; i -= 1) inner.push(new Vector2(outer(i / steps) - wall, (i / steps) * height));
  inner.push(new Vector2(0, wall * 1.5));
  return new LatheGeometry([...out, ...lip, ...inner], RADIAL);
}

function build(kind: PrimitiveKind): BufferGeometry {
  switch (kind) {
    case "caixa": return new RoundedBoxGeometry(1, 1, 1, 6, 0.035);
    case "esfera": return new SphereGeometry(0.5, RADIAL, RADIAL / 2);
    case "cilindro": return filletedCylinder();
    case "cone": return new ConeGeometry(0.5, 1, RADIAL, 1);
    case "toro": return new TorusGeometry(0.42, 0.15, 64, 192);
    case "no": return new TorusKnotGeometry(0.38, 0.12, 400, 64);
    case "vaso": return vase();
    case "placa": return new RoundedBoxGeometry(1, 0.05, 1, 4, 0.012);
  }
}

/** Geometria compartilhada de um tipo de primitiva. */
export function primitiveGeometry(kind: PrimitiveKind): BufferGeometry {
  let g = cache.get(kind);
  if (!g) {
    g = build(kind);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    cache.set(kind, g);
  }
  return g;
}

export function disposeGeometries(): void {
  cache.forEach((g) => g.dispose());
  cache.clear();
}
