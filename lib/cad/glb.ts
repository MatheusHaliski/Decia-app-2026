/**
 * Leitor de GLB (glTF 2.0 binário), sem dependências: cabeçalho (`glTF`, versão 2, tamanho), pedaços JSON e BIN, malhas,
 * nós com transformações (matriz ou translação/rotação/escala, compostas do pai para o filho), acessores com checagem de
 * limites e, por malha: triângulos, caixa envolvente, área de superfície (Σ |a×b|/2) e volume por tetraedros assinados
 * (Σ a·(b×c)/6) — só quando a malha é fechada e com orientação coerente (cada aresta usada duas vezes, uma em cada sentido).
 * Unidade: metro, pela especificação do glTF. Malhas comprimidas (Draco/meshopt), acessores esparsos e buffers externos
 * não são lidos e entram na lista de perdas.
 */
import { CadReadError } from "./types";

export const GLB_MAX_TRIANGLES = 5_000_000;
const CLOSED_CHECK_MAX = 1_000_000;

export interface Box3 {
  min: [number, number, number];
  max: [number, number, number];
}

export interface GlbMesh {
  index: number;
  name: string;
  instances: number;
  /** soma em todas as instâncias */
  triangles: number;
  areaM2: number;
  /** null quando a malha não é fechada (volume não confiável) */
  volumeM3: number | null;
  /** fechada e com orientação coerente; null = não verificada (malha grande demais) */
  closed: boolean | null;
  bbox: Box3 | null;
  materials: string[];
  nodeNames: string[];
}

export interface GlbAnalysis {
  version: number;
  generator: string | null;
  meshes: GlbMesh[];
  nodes: number;
  bbox: Box3 | null;
  triangles: number;
  extensionsRequired: string[];
  skipped: { compressed: number; sparse: number; externalBuffer: number; nonTriangle: number };
  dropped: { textures: number; animations: number; cameras: number; skins: number };
}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const int = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null);
const nums = (v: unknown, n: number): number[] | null => {
  const a = arr(v);
  return a.length === n && a.every((x) => typeof x === "number" && Number.isFinite(x)) ? (a as number[]) : null;
};

const malformed = (why: string) => new CadReadError("MALFORMADO", { format: "GLB", why });

const COMPONENT_SIZE: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const TYPE_SIZE: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

type Mat4 = Float64Array;

const identity = (): Mat4 => {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
};

function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float64Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + row]! * b[col * 4 + k]!;
      out[col * 4 + row] = s;
    }
  }
  return out;
}

function localMatrix(node: Json): Mat4 {
  const m = nums(node.matrix, 16);
  if (m) return Float64Array.from(m);
  const [tx, ty, tz] = nums(node.translation, 3) ?? [0, 0, 0];
  const [x, y, z, w] = nums(node.rotation, 4) ?? [0, 0, 0, 1];
  const [sx, sy, sz] = nums(node.scale, 3) ?? [1, 1, 1];
  const out = new Float64Array(16);
  const xx = x! * x!, yy = y! * y!, zz = z! * z!, xy = x! * y!, xz = x! * z!, yz = y! * z!, wx = w! * x!, wy = w! * y!, wz = w! * z!;
  out[0] = (1 - 2 * (yy + zz)) * sx!;
  out[1] = 2 * (xy + wz) * sx!;
  out[2] = 2 * (xz - wy) * sx!;
  out[4] = 2 * (xy - wz) * sy!;
  out[5] = (1 - 2 * (xx + zz)) * sy!;
  out[6] = 2 * (yz + wx) * sy!;
  out[8] = 2 * (xz + wy) * sz!;
  out[9] = 2 * (yz - wx) * sz!;
  out[10] = (1 - 2 * (xx + yy)) * sz!;
  out[12] = tx!;
  out[13] = ty!;
  out[14] = tz!;
  out[15] = 1;
  return out;
}

const det3 = (m: Mat4) =>
  m[0]! * (m[5]! * m[10]! - m[9]! * m[6]!) - m[4]! * (m[1]! * m[10]! - m[9]! * m[2]!) + m[8]! * (m[1]! * m[6]! - m[5]! * m[2]!);

interface Prim {
  positions: Float32Array;
  /** índices dos triângulos (3 por triângulo), já expandidos de faixa/leque */
  tris: Uint32Array;
  material: string | null;
}

interface MeshGeo {
  prims: Prim[];
  closed: boolean | null;
  localTris: number;
}

export function parseGlb(bytes: Uint8Array): GlbAnalysis {
  if (bytes.byteLength < 20) throw malformed("header");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw malformed("magic");
  const version = dv.getUint32(4, true);
  if (version !== 2) throw new CadReadError("GLB_VERSAO", { version });
  const total = dv.getUint32(8, true);
  if (total < 20 || total > bytes.byteLength) throw malformed("length");
  let off = 12;
  let json: Json | null = null;
  let bin: Uint8Array | null = null;
  while (off + 8 <= total) {
    const len = dv.getUint32(off, true);
    const type = dv.getUint32(off + 4, true);
    const start = off + 8;
    const end = start + len;
    if (end > total) throw malformed("chunk");
    if (type === 0x4e4f534a && json === null) {
      try {
        json = obj(JSON.parse(new TextDecoder("utf-8").decode(bytes.subarray(start, end))));
      } catch {
        throw malformed("json");
      }
    } else if (type === 0x004e4942 && bin === null) bin = bytes.subarray(start, end);
    // o tamanho do pedaço já inclui o preenchimento até múltiplo de 4
    off = end;
  }
  if (!json) throw malformed("json");
  const asset = obj(json.asset);
  if (typeof asset.version !== "string" || !asset.version.startsWith("2")) throw new CadReadError("GLB_VERSAO", { version: String(asset.version ?? "?") });

  const accessors = arr(json.accessors).map(obj);
  const views = arr(json.bufferViews).map(obj);
  const buffers = arr(json.buffers).map(obj);
  const materials = arr(json.materials).map(obj);
  const meshes = arr(json.meshes).map(obj);
  const nodes = arr(json.nodes).map(obj);
  const skipped = { compressed: 0, sparse: 0, externalBuffer: 0, nonTriangle: 0 };
  const binDv = bin ? new DataView(bin.buffer, bin.byteOffset, bin.byteLength) : null;

  /** Lê um acessor (todas as componentes em sequência). null = não legível aqui (esparso, buffer externo, comprimido). */
  const read = (index: unknown, expect: string): Float64Array | null => {
    const ai = int(index);
    const acc = ai === null ? null : accessors[ai];
    if (!acc) throw malformed("accessor");
    if (acc.sparse) {
      skipped.sparse++;
      return null;
    }
    const comps = TYPE_SIZE[String(acc.type)];
    const csize = COMPONENT_SIZE[Number(acc.componentType)];
    const count = int(acc.count);
    if (!comps || !csize || count === null || String(acc.type) !== expect) throw malformed("accessor");
    const vi = int(acc.bufferView);
    if (vi === null) return new Float64Array(count * comps); // sem bufferView: zeros pela especificação
    const view = views[vi];
    if (!view) throw malformed("bufferView");
    if (obj(view.extensions).EXT_meshopt_compression || obj(view.extensions).KHR_meshopt_compression) {
      skipped.compressed++;
      return null;
    }
    const bi = int(view.buffer);
    const buffer = bi === null ? null : buffers[bi];
    if (!buffer || bi !== 0 || buffer.uri !== undefined || !bin || !binDv) {
      skipped.externalBuffer++;
      return null;
    }
    const elem = comps * csize;
    const stride = int(view.byteStride) ?? elem;
    const viewOffset = int(view.byteOffset) ?? 0;
    const viewLength = int(view.byteLength) ?? 0;
    const start = viewOffset + (int(acc.byteOffset) ?? 0);
    if (viewOffset + viewLength > bin.byteLength || (count > 0 && start + (count - 1) * stride + elem > viewOffset + viewLength)) throw malformed("bounds");
    const normalized = acc.normalized === true;
    const ct = Number(acc.componentType);
    const out = new Float64Array(count * comps);
    for (let i = 0; i < count; i++) {
      for (let c = 0; c < comps; c++) {
        const o = start + i * stride + c * csize;
        let v: number;
        switch (ct) {
          case 5126: v = binDv.getFloat32(o, true); break;
          case 5125: v = binDv.getUint32(o, true); break;
          case 5123: v = binDv.getUint16(o, true); if (normalized) v /= 65535; break;
          case 5122: v = binDv.getInt16(o, true); if (normalized) v = Math.max(v / 32767, -1); break;
          case 5121: v = binDv.getUint8(o); if (normalized) v /= 255; break;
          default: v = binDv.getInt8(o); if (normalized) v = Math.max(v / 127, -1);
        }
        out[i * comps + c] = v;
      }
    }
    return out;
  };

  const geoCache = new Map<number, MeshGeo>();
  const geometry = (mi: number): MeshGeo => {
    const cached = geoCache.get(mi);
    if (cached) return cached;
    const mesh = meshes[mi] ?? {};
    const prims: Prim[] = [];
    for (const p of arr(mesh.primitives).map(obj)) {
      const mode = int(p.mode) ?? 4;
      if (mode !== 4 && mode !== 5 && mode !== 6) {
        skipped.nonTriangle++;
        continue;
      }
      if (obj(p.extensions).KHR_draco_mesh_compression) {
        skipped.compressed++;
        continue;
      }
      const posIndex = obj(p.attributes).POSITION;
      if (posIndex === undefined) continue;
      const pos = read(posIndex, "VEC3");
      if (!pos) continue;
      const vcount = pos.length / 3;
      let idx: Float64Array | null;
      if (p.indices !== undefined) {
        idx = read(p.indices, "SCALAR");
        if (!idx) continue;
      } else idx = Float64Array.from({ length: vcount }, (_, i) => i);
      for (let k = 0; k < idx.length; k++) if (idx[k]! >= vcount) throw malformed("index");
      let tris: Uint32Array;
      if (mode === 4) tris = Uint32Array.from(idx.subarray(0, idx.length - (idx.length % 3)));
      else {
        const n = Math.max(0, idx.length - 2);
        tris = new Uint32Array(n * 3);
        for (let i = 0; i < n; i++) {
          if (mode === 5) {
            // faixa: alterna a orientação (glTF 2.0 §3.7.2.1)
            tris[i * 3] = idx[i]!;
            tris[i * 3 + 1] = idx[i + 1 + (i % 2)]!;
            tris[i * 3 + 2] = idx[i + 2 - (i % 2)]!;
          } else {
            tris[i * 3] = idx[i + 1]!;
            tris[i * 3 + 1] = idx[i + 2]!;
            tris[i * 3 + 2] = idx[0]!;
          }
        }
      }
      const mi2 = int(p.material);
      const mat = mi2 === null ? null : String(materials[mi2]?.name ?? "").trim() || `#${mi2}`;
      prims.push({ positions: Float32Array.from(pos), tris, material: mat });
    }
    const localTris = prims.reduce((s, p) => s + p.tris.length / 3, 0);
    const geo: MeshGeo = { prims, closed: localTris > 0 && localTris <= CLOSED_CHECK_MAX ? isClosedOriented(prims) : localTris > 0 ? null : false, localTris };
    geoCache.set(mi, geo);
    return geo;
  };

  // percorre a cena a partir das raízes, compondo as transformações
  const sceneList = arr(json.scenes).map(obj);
  const sceneIndex = int(json.scene) ?? 0;
  let roots = arr(sceneList[sceneIndex]?.nodes).map(int).filter((x): x is number => x !== null);
  if (!sceneList.length) {
    const children = new Set(nodes.flatMap((n) => arr(n.children).map(int)));
    roots = nodes.map((_, i) => i).filter((i) => !children.has(i));
  }
  const stats = new Map<number, GlbMesh>();
  let triangles = 0;
  let visits = 0;
  const sceneBox = new Box();
  const stack: { node: number; parent: Mat4; depth: number }[] = roots.map((node) => ({ node, parent: identity(), depth: 0 }));
  while (stack.length) {
    const { node, parent, depth } = stack.pop()!;
    const n = nodes[node];
    if (!n || depth > 64 || ++visits > nodes.length * 8 + 64) throw malformed("nodes");
    const world = multiply(parent, localMatrix(n));
    const mi = int(n.mesh);
    if (mi !== null && meshes[mi]) {
      const geo = geometry(mi);
      const sign = det3(world) < 0 ? -1 : 1;
      let st = stats.get(mi);
      if (!st) {
        st = { index: mi, name: String(meshes[mi]!.name ?? "").trim() || `#${mi}`, instances: 0, triangles: 0, areaM2: 0, volumeM3: 0, closed: geo.closed, bbox: null, materials: [], nodeNames: [] };
        stats.set(mi, st);
      }
      st.instances++;
      const nodeName = String(n.name ?? "").trim();
      if (nodeName && !st.nodeNames.includes(nodeName) && st.nodeNames.length < 5) st.nodeNames.push(nodeName);
      const box = new Box();
      let vol = 0;
      for (const p of geo.prims) {
        if (p.material && !st.materials.includes(p.material)) st.materials.push(p.material);
        const w = transform(p.positions, world);
        for (let k = 0; k < w.length; k += 3) box.add(w[k]!, w[k + 1]!, w[k + 2]!);
        const t = p.tris;
        triangles += t.length / 3;
        if (triangles > GLB_MAX_TRIANGLES) throw new CadReadError("EXCESSIVO", { format: "GLB", max: GLB_MAX_TRIANGLES });
        for (let k = 0; k < t.length; k += 3) {
          const a = t[k]! * 3, b = t[k + 1]! * 3, c = t[k + 2]! * 3;
          const ax = w[a]!, ay = w[a + 1]!, az = w[a + 2]!;
          const bx = w[b]!, by = w[b + 1]!, bz = w[b + 2]!;
          const cx = w[c]!, cy = w[c + 1]!, cz = w[c + 2]!;
          const ux = bx - ax, uy = by - ay, uz = bz - az;
          const vx = cx - ax, vy = cy - ay, vz = cz - az;
          const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          st.areaM2 += Math.hypot(nx, ny, nz) / 2;
          vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
        }
        st.triangles += t.length / 3;
      }
      if (st.volumeM3 !== null) st.volumeM3 = geo.closed ? st.volumeM3 + Math.abs(vol * sign) : null;
      const b = box.value;
      if (b) {
        st.bbox = st.bbox ? union(st.bbox, b) : b;
        sceneBox.add(...b.min);
        sceneBox.add(...b.max);
      }
    }
    for (const c of arr(n.children)) {
      const ci = int(c);
      if (ci !== null) stack.push({ node: ci, parent: world, depth: depth + 1 });
    }
  }

  return {
    version,
    generator: typeof asset.generator === "string" ? asset.generator : null,
    meshes: [...stats.values()].sort((a, b) => a.index - b.index),
    nodes: nodes.length,
    bbox: sceneBox.value,
    triangles,
    extensionsRequired: arr(json.extensionsRequired).map(String),
    skipped,
    dropped: { textures: arr(json.textures).length, animations: arr(json.animations).length, cameras: arr(json.cameras).length, skins: arr(json.skins).length },
  };
}

function transform(pos: Float32Array, m: Mat4): Float64Array {
  const out = new Float64Array(pos.length);
  for (let k = 0; k < pos.length; k += 3) {
    const x = pos[k]!, y = pos[k + 1]!, z = pos[k + 2]!;
    out[k] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
    out[k + 1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
    out[k + 2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
  }
  return out;
}

/** Fechada e orientada: soldando vértices coincidentes, cada aresta aparece duas vezes, uma em cada sentido. */
function isClosedOriented(prims: Prim[]): boolean {
  const box = new Box();
  for (const p of prims) for (let k = 0; k < p.positions.length; k += 3) box.add(p.positions[k]!, p.positions[k + 1]!, p.positions[k + 2]!);
  const b = box.value;
  if (!b) return false;
  const diag = Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]);
  const q = Math.max(diag * 1e-7, 1e-12);
  const ids = new Map<string, number>();
  const edges = new Map<number, { n: number; dir: number }>();
  const welded: Uint32Array[] = prims.map((p) => {
    const out = new Uint32Array(p.positions.length / 3);
    for (let v = 0; v < out.length; v++) {
      const key = `${Math.round(p.positions[v * 3]! / q)},${Math.round(p.positions[v * 3 + 1]! / q)},${Math.round(p.positions[v * 3 + 2]! / q)}`;
      let id = ids.get(key);
      if (id === undefined) {
        id = ids.size;
        ids.set(key, id);
      }
      out[v] = id;
    }
    return out;
  });
  const N = ids.size + 1;
  prims.forEach((p, pi) => {
    const w = welded[pi]!;
    for (let k = 0; k < p.tris.length; k += 3) {
      const t = [w[p.tris[k]!]!, w[p.tris[k + 1]!]!, w[p.tris[k + 2]!]!];
      for (let e = 0; e < 3; e++) {
        const a = t[e]!;
        const c = t[(e + 1) % 3]!;
        if (a === c) continue; // triângulo degenerado
        const key = Math.min(a, c) * N + Math.max(a, c);
        const rec = edges.get(key) ?? { n: 0, dir: 0 };
        rec.n++;
        rec.dir += a < c ? 1 : -1;
        edges.set(key, rec);
      }
    }
  });
  if (!edges.size) return false;
  for (const r of edges.values()) if (r.n !== 2 || r.dir !== 0) return false;
  return true;
}

class Box {
  min: [number, number, number] = [Infinity, Infinity, Infinity];
  max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  add(x: number, y: number, z: number): void {
    if (x < this.min[0]) this.min[0] = x;
    if (y < this.min[1]) this.min[1] = y;
    if (z < this.min[2]) this.min[2] = z;
    if (x > this.max[0]) this.max[0] = x;
    if (y > this.max[1]) this.max[1] = y;
    if (z > this.max[2]) this.max[2] = z;
  }
  get value(): Box3 | null {
    return this.min[0] === Infinity ? null : { min: [...this.min], max: [...this.max] };
  }
}

const union = (a: Box3, b: Box3): Box3 => ({
  min: [Math.min(a.min[0], b.min[0]), Math.min(a.min[1], b.min[1]), Math.min(a.min[2], b.min[2])],
  max: [Math.max(a.max[0], b.max[0]), Math.max(a.max[1], b.max[1]), Math.max(a.max[2], b.max[2])],
});
