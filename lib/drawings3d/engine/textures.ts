/**
 * Texturas procedurais dos materiais (Factory + Flyweight): madeira, concreto, metal escovado e mármore são gerados no código com
 * ruído determinístico (mesma semente → mesma imagem) e guardados num cache — cada textura existe uma vez e é compartilhada por
 * todos os objetos do mesmo material. Cada material ganha mapa de cor (sRGB), de rugosidade e normal (linear), que dão as
 * microvariações de brilho e relevo que separam um render plástico de um realista.
 */
import { CanvasTexture, LinearSRGBColorSpace, RepeatWrapping, SRGBColorSpace, type Texture } from "three";
import type { ProceduralTexture } from "../materials";

export interface TextureSet {
  map: Texture;
  roughnessMap: Texture;
  normalMap: Texture;
}

const SIZE = 512;
const cache = new Map<string, TextureSet>();

/** Ruído de valor 2D periódico (tileável), com interpolação suave. */
function makeNoise(seed: number, period: number) {
  const grid = new Float32Array(period * period);
  let s = seed >>> 0;
  for (let i = 0; i < grid.length; i += 1) {
    s = (s * 1664525 + 1013904223) >>> 0;
    grid[i] = s / 4294967296;
  }
  const at = (x: number, y: number) => grid[(((y % period) + period) % period) * period + (((x % period) + period) % period)]!;
  return (u: number, v: number) => {
    const x = u * period, y = v * period;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return top + (bottom - top) * sy;
  };
}

function fbm(noises: ((u: number, v: number) => number)[], u: number, v: number): number {
  let sum = 0, amp = 0.5, norm = 0;
  for (const n of noises) {
    sum += n(u, v) * amp;
    norm += amp;
    amp *= 0.5;
  }
  return sum / norm;
}

/** Altura e cor por pixel para cada tipo; o normal map sai da altura por diferenças finitas. */
function sampler(kind: Exclude<ProceduralTexture, null>) {
  const octaves = [4, 8, 16, 32, 64].map((p, i) => makeNoise(1000 + i * 77, p));
  switch (kind) {
    case "madeira":
      return (u: number, v: number) => {
        const warp = fbm(octaves, u * 0.5, v * 2) * 0.35;
        const rings = Math.sin((v * 22 + warp * 9) * Math.PI * 2) * 0.5 + 0.5;
        const grain = octaves[4]!(u * 0.25, v * 4);
        const h = rings * 0.7 + grain * 0.3;
        const tone = 0.62 + h * 0.38;
        return { h, rgb: [tone, tone * 0.82, tone * 0.62] as const, rough: 0.5 + (1 - rings) * 0.25 };
      };
    case "concreto":
      return (u: number, v: number) => {
        const n = fbm(octaves, u, v);
        const pore = octaves[4]!(u * 3, v * 3) > 0.86 ? -0.35 : 0;
        const h = n + pore;
        const tone = 0.82 + (n - 0.5) * 0.3 + pore * 0.4;
        return { h, rgb: [tone, tone * 0.99, tone * 0.96] as const, rough: 0.85 + (n - 0.5) * 0.2 };
      };
    case "escovado":
      return (u: number, v: number) => {
        const streak = octaves[4]!(u * 0.02, v * 6) * 0.6 + octaves[3]!(u * 0.05, v * 3) * 0.4;
        return { h: streak * 0.4, rgb: [0.96 + streak * 0.04, 0.96 + streak * 0.04, 0.97 + streak * 0.03] as const, rough: 0.22 + streak * 0.2 };
      };
    case "marmore":
      return (u: number, v: number) => {
        const t = fbm(octaves, u * 1.2, v * 1.2);
        const vein = Math.pow(1 - Math.abs(Math.sin((u * 3 + v * 2 + t * 6) * Math.PI)), 18);
        const tone = 0.97 - vein * 0.45 - (t - 0.5) * 0.06;
        return { h: 0.5 - vein * 0.1, rgb: [tone, tone, tone * 0.99] as const, rough: 0.14 + vein * 0.08 };
      };
  }
}

function canvasFrom(fill: (img: ImageData) => void): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(SIZE, SIZE);
  fill(img);
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function build(kind: Exclude<ProceduralTexture, null>): TextureSet {
  const sample = sampler(kind);
  const height = new Float32Array(SIZE * SIZE);
  const samples = new Array<ReturnType<typeof sample>>(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) {
    const s = sample(x / SIZE, y / SIZE);
    samples[y * SIZE + x] = s;
    height[y * SIZE + x] = s.h;
  }
  const color = canvasFrom((img) => samples.forEach((s, i) => {
    img.data.set([s.rgb[0] * 255, s.rgb[1] * 255, s.rgb[2] * 255, 255], i * 4);
  }));
  const rough = canvasFrom((img) => samples.forEach((s, i) => {
    const r = Math.min(255, Math.max(0, s.rough * 255));
    img.data.set([r, r, r, 255], i * 4);
  }));
  const normal = canvasFrom((img) => {
    const h = (x: number, y: number) => height[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)]!;
    for (let y = 0; y < SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * 2.5, dy = (h(x, y + 1) - h(x, y - 1)) * 2.5;
      const len = Math.hypot(dx, dy, 1);
      img.data.set([((-dx / len) * 0.5 + 0.5) * 255, ((-dy / len) * 0.5 + 0.5) * 255, ((1 / len) * 0.5 + 0.5) * 255, 255], (y * SIZE + x) * 4);
    }
  });
  const wrap = (canvas: HTMLCanvasElement, srgb: boolean) => {
    const t = new CanvasTexture(canvas);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.colorSpace = srgb ? SRGBColorSpace : LinearSRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { map: wrap(color, true), roughnessMap: wrap(rough, false), normalMap: wrap(normal, false) };
}

/** Conjunto de texturas de um tipo (gerado na primeira vez e reaproveitado). */
export function proceduralTextures(kind: ProceduralTexture): TextureSet | null {
  if (!kind) return null;
  let set = cache.get(kind);
  if (!set) {
    set = build(kind);
    cache.set(kind, set);
  }
  return set;
}

export function disposeTextures(): void {
  cache.forEach((set) => Object.values(set).forEach((t) => t.dispose()));
  cache.clear();
}
