import { describe, expect, it } from "vitest";
import { parseGlb } from "./glb";
import { parseCad } from "./read";
import { takeoffOf } from "./takeoff";

/* ── GLB montado em bytes no próprio teste: cubo de 1 m (8 vértices, 12 triângulos com normais para fora) ── */
const CUBE_POS = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1];
const CUBE_IDX = [0, 3, 2, 0, 2, 1, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5];

function glb(json: Record<string, unknown>, bin: Uint8Array, version = 2): Uint8Array {
  const pad = (n: number) => (4 - (n % 4)) % 4;
  const j = new TextEncoder().encode(JSON.stringify(json));
  const jl = j.length + pad(j.length);
  const bl = bin.length + pad(bin.length);
  const total = 12 + 8 + jl + (bin.length ? 8 + bl : 0);
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true);
  dv.setUint32(4, version, true);
  dv.setUint32(8, total, true);
  dv.setUint32(12, jl, true);
  dv.setUint32(16, 0x4e4f534a, true);
  out.set(j, 20);
  out.fill(0x20, 20 + j.length, 20 + jl);
  if (bin.length) {
    dv.setUint32(20 + jl, bl, true);
    dv.setUint32(24 + jl, 0x004e4942, true);
    out.set(bin, 28 + jl);
  }
  return out;
}

function cubeFile(opts: { indices?: number[]; nodes?: Record<string, unknown>[]; roots?: number[]; meshName?: string } = {}) {
  const idx = opts.indices ?? CUBE_IDX;
  const pos = new Float32Array(CUBE_POS);
  const ind = new Uint16Array(idx);
  const indBytes = ind.byteLength + ((4 - (ind.byteLength % 4)) % 4);
  const bin = new Uint8Array(pos.byteLength + indBytes);
  bin.set(new Uint8Array(pos.buffer), 0);
  bin.set(new Uint8Array(ind.buffer), pos.byteLength);
  return glb({
    asset: { version: "2.0", generator: "teste" },
    scene: 0,
    scenes: [{ nodes: opts.roots ?? [0] }],
    nodes: opts.nodes ?? [{ mesh: 0, name: "P1" }],
    meshes: [{ name: opts.meshName ?? "Pilar", primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
    materials: [{ name: "Concreto" }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 8, type: "VEC3", min: [0, 0, 0], max: [1, 1, 1] },
      { bufferView: 1, componentType: 5123, count: idx.length, type: "SCALAR" },
    ],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 96 }, { buffer: 0, byteOffset: 96, byteLength: ind.byteLength }],
    buffers: [{ byteLength: bin.length }],
    textures: [{ source: 0 }],
  }, bin);
}

describe("GLB (glTF 2.0 binário)", () => {
  it("cubo de 1 m: 12 triângulos, área 6 m², volume 1 m³, caixa 1 × 1 × 1, material e nome", () => {
    const a = parseGlb(cubeFile());
    expect(a).toMatchObject({ version: 2, generator: "teste", triangles: 12, nodes: 1 });
    expect(a.meshes).toHaveLength(1);
    const m = a.meshes[0]!;
    expect(m).toMatchObject({ name: "Pilar", instances: 1, triangles: 12, closed: true, materials: ["Concreto"], nodeNames: ["P1"] });
    expect(m.areaM2).toBeCloseTo(6, 10);
    expect(m.volumeM3).toBeCloseTo(1, 10);
    expect(m.bbox).toEqual({ min: [0, 0, 0], max: [1, 1, 1] });
    expect(a.dropped.textures).toBe(1);

    const t = takeoffOf({ format: "GLB", fileName: "pilar.glb", sizeBytes: 1, glb: a });
    expect(t.unit).toEqual({ id: "m", toMeters: 1, origin: "PADRAO" });
    expect(t.rows.find((r) => r.unit === "m3")).toMatchObject({ kind: "PILAR", quantity: 1, included: true, confidence: "ALTA", detail: "Concreto" });
    expect(t.rows.find((r) => r.unit === "m2")).toMatchObject({ quantity: 6, included: false });
    expect(t.losses).toContainEqual({ kind: "DESCARTADO", code: "APARENCIA_ANIMACAO", n: 1 });
  });

  it("transformações dos nós: translação, escala 2 (área ×4, volume ×8), filho herda do pai, espelho não inverte o volume", () => {
    const a = parseGlb(cubeFile({
      roots: [0, 2],
      nodes: [
        { name: "pai", translation: [10, 0, 0], children: [1] },
        { name: "filho", mesh: 0, scale: [2, 2, 2] },
        { name: "espelho", mesh: 0, matrix: [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
      ],
    }));
    const m = a.meshes[0]!;
    expect(m.instances).toBe(2);
    expect(m.triangles).toBe(24);
    expect(m.areaM2).toBeCloseTo(24 + 6, 10);
    expect(m.volumeM3).toBeCloseTo(8 + 1, 10);
    expect(m.bbox).toEqual({ min: [-1, 0, 0], max: [12, 2, 2] });
    // com unidade escolhida (cm), área × 1e-4 e volume × 1e-6
    const t = takeoffOf({ format: "GLB", fileName: "x.glb", sizeBytes: 1, glb: a }, { unit: "cm", wallHeightM: 2.8, wallDoubleLine: true });
    expect(t.rows.find((r) => r.unit === "m3")!.quantity).toBeCloseTo(9e-6, 12);
    expect(t.rows.find((r) => r.unit === "m2")!.quantity).toBeCloseTo(30e-4, 12);
    expect(t.rows.find((r) => r.unit === "un")).toMatchObject({ quantity: 2 });
  });

  it("malha aberta (faltam 2 triângulos): área conta, volume não — alerta de malha aberta", () => {
    const a = parseGlb(cubeFile({ indices: CUBE_IDX.slice(0, 30), meshName: "Mesh_7" }));
    const m = a.meshes[0]!;
    expect(m.closed).toBe(false);
    expect(m.volumeM3).toBeNull();
    expect(m.areaM2).toBeCloseTo(5, 10);
    const t = takeoffOf({ format: "GLB", fileName: "x.glb", sizeBytes: 1, glb: a });
    expect(t.rows.some((r) => r.unit === "m3")).toBe(false);
    expect(t.alerts).toContainEqual({ code: "GLB_MALHA_ABERTA", vars: { n: 1 } });
  });

  it("recusa assinatura errada, versão 1, acessor fora do BIN e conteúdo GLB com extensão .ifc", () => {
    const good = cubeFile();
    const badMagic = good.slice();
    badMagic[0] = 0x00;
    expect(parseCad("x.glb", badMagic)).toEqual({ ok: false, error: { code: "MALFORMADO", vars: { format: "GLB" } } });
    expect(() => parseGlb(badMagic)).toThrow("MALFORMADO");
    const v1 = glb({ asset: { version: "1.0" } }, new Uint8Array(0), 1);
    expect(parseCad("x.glb", v1)).toEqual({ ok: false, error: { code: "GLB_VERSAO", vars: { version: 1 } } });
    const outside = glb({
      asset: { version: "2.0" }, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
      accessors: [{ bufferView: 0, componentType: 5126, count: 100, type: "VEC3" }],
      bufferViews: [{ buffer: 0, byteLength: 96 }], buffers: [{ byteLength: 96 }],
    }, new Uint8Array(96));
    expect(parseCad("x.glb", outside)).toEqual({ ok: false, error: { code: "MALFORMADO", vars: { format: "GLB", why: "bounds" } } });
    expect(parseCad("x.ifc", good)).toEqual({ ok: false, error: { code: "TIPO_DIVERGENTE", vars: { detected: "GLB", ext: "ifc" } } });
    expect(parseCad("x.glb", good).ok).toBe(true);
  });
});
