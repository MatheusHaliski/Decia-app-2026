import { describe, expect, it } from "vitest";
import { AddObject, History, RemoveObject, Rename, SetMaterial, SetTransform } from "./commands";
import { MATERIALS, materialById, physicallyPlausible } from "./materials";
import { createObject, parseScene, PRIMITIVE_KINDS, sanitizeTransform, starterScene, subtreeIds, type Scene3D } from "./model";
import { QUALITY, QUALITY_ORDER, suggestedQuality } from "./quality";
import { directionOf, STUDIO_SOFTBOXES, studioEnvironment } from "./studio-environment";

const tree = (): Scene3D => ({
  objects: [
    { ...createObject("caixa", "A", {}, "a") },
    { ...createObject("esfera", "B", {}, "b"), parentId: "a" },
    { ...createObject("cone", "C", {}, "c"), parentId: "b" },
    { ...createObject("toro", "D", {}, "d") },
  ],
});

describe("modelo 3D", () => {
  it("a cena inicial tem ids únicos, tipos válidos e materiais do catálogo", () => {
    const s = starterScene();
    expect(new Set(s.objects.map((o) => o.id)).size).toBe(s.objects.length);
    for (const o of s.objects) {
      expect(PRIMITIVE_KINDS).toContain(o.kind);
      expect(MATERIALS.some((m) => m.id === o.materialId)).toBe(true);
    }
  });

  it("subárvore inclui descendentes e termina mesmo com ciclo de parentId", () => {
    expect([...subtreeIds(tree(), "a")].sort()).toEqual(["a", "b", "c"]);
    const cyclic: Scene3D = { objects: [{ ...createObject("caixa", "X", {}, "x"), parentId: "y" }, { ...createObject("caixa", "Y", {}, "y"), parentId: "x" }] };
    expect([...subtreeIds(cyclic, "x")].sort()).toEqual(["x", "y"]);
    expect(subtreeIds(tree(), "inexistente").size).toBe(0);
  });

  it("transformação inválida (NaN, ∞, escala zero) mantém o valor anterior ou é limitada", () => {
    const prev = createObject("caixa", "A").transform;
    const t = sanitizeTransform({ position: [Number.NaN, 1e9, 2], rotation: [Infinity, 725, -30], scale: [0, 1000, 2] }, prev);
    expect(t.position).toEqual([prev.position[0], 100, 2]);
    expect(t.rotation).toEqual([prev.rotation[0], 5, -30]);
    expect(t.scale).toEqual([0.01, 50, 2]);
  });

  it("parseScene aceita só objetos válidos e descarta o resto sem quebrar", () => {
    expect(parseScene(null)).toBeNull();
    expect(parseScene({ objects: "x" })).toBeNull();
    const ok = createObject("esfera", "Boa", {}, "ok");
    const parsed = parseScene({
      objects: [ok, { ...ok }, { ...ok, id: "k", kind: "pirâmide" }, { ...ok, id: "t", transform: { position: [0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } }, 42, { ...ok, id: "big", transform: { ...ok.transform, scale: [999, 1, 1] } }],
    })!;
    expect(parsed.objects.map((o) => o.id)).toEqual(["ok", "big"]);
    expect(parsed.objects[1]!.transform.scale[0]).toBe(50);
  });
});

describe("materiais PBR", () => {
  it("todo preset é fisicamente plausível e tem rótulo traduzível", () => {
    for (const m of MATERIALS) {
      expect(physicallyPlausible(m), m.id).toBe(true);
      expect(m.labelKey).toMatch(/^d3\.mat\./);
    }
    expect(new Set(MATERIALS.map((m) => m.id)).size).toBe(MATERIALS.length);
  });

  it("metais têm metalness 1 e cor clara (F0 alto); vidro transmite com IOR real", () => {
    for (const m of MATERIALS.filter((x) => x.family === "metal")) {
      expect(m.metalness).toBe(1);
      // F0 de metal fica acima de ~0,5 (linear) em ao menos um canal; dielétrico comum seria 0,04
      expect(Math.max(...m.color)).toBeGreaterThan(0.5);
    }
    const vidro = materialById("vidro");
    expect(vidro.transmission).toBe(1);
    expect(vidro.ior).toBeCloseTo(1.52);
    expect(materialById("nao-existe").id).toBe(MATERIALS[0]!.id);
    expect(physicallyPlausible({ ...vidro, metalness: 1 })).toBe(false);
    expect(physicallyPlausible({ ...vidro, ior: 3 })).toBe(false);
    expect(physicallyPlausible({ ...vidro, color: [1.2, 1, 1] })).toBe(false);
  });
});

describe("comandos e histórico", () => {
  it("excluir remove a subárvore e desfazer devolve tudo na mesma ordem", () => {
    const h = new History();
    const s0 = tree();
    const s1 = h.execute(s0, new RemoveObject("a"));
    expect(s1.objects.map((o) => o.id)).toEqual(["d"]);
    expect(h.undo(s1)).toEqual(s0);
  });

  it("transformação passa pela validação e desfaz para o valor anterior", () => {
    const h = new History();
    const s0 = tree();
    const s1 = h.execute(s0, new SetTransform("d", { position: [1, Number.NaN, 2], rotation: [0, 0, 0], scale: [0, 1, 1] }));
    const d = s1.objects.find((o) => o.id === "d")!;
    expect(d.transform.position).toEqual([1, s0.objects[3]!.transform.position[1], 2]);
    expect(d.transform.scale[0]).toBe(0.01);
    expect(h.undo(s1).objects[3]).toEqual(s0.objects[3]);
  });

  it("refazer reaplica; comando novo limpa o refazer; comando sem efeito não entra no histórico", () => {
    const h = new History();
    let s = tree();
    s = h.execute(s, new SetMaterial("a", "ouro"));
    s = h.execute(s, new Rename("a", "   "));
    expect(s.objects[0]!.name).toBe("Objeto");
    expect(h.undoLabelKey).toBe("d3.cmd.rename");
    s = h.undo(s);
    expect(h.canRedo).toBe(true);
    s = h.redo(s);
    expect(s.objects[0]!.name).toBe("Objeto");
    s = h.undo(s);
    s = h.execute(s, new AddObject(createObject("vaso", "V", {}, "v")));
    expect(h.canRedo).toBe(false);
    const before = s;
    expect(h.execute(s, new SetMaterial("nao-existe", "ouro"))).toBe(before);
    expect(h.execute(s, new AddObject(createObject("vaso", "V", {}, "v")))).toBe(before);
    expect(h.undoLabelKey).toBe("d3.cmd.add");
  });

  it("o histórico respeita o teto de memória", () => {
    const h = new History(3);
    let s = tree();
    for (let i = 0; i < 6; i += 1) s = h.execute(s, new Rename("a", `n${i}`));
    for (let i = 0; i < 3; i += 1) s = h.undo(s);
    expect(h.canUndo).toBe(false);
    expect(s.objects[0]!.name).toBe("n2");
  });
});

describe("qualidade (Strategy)", () => {
  it("cada nível é mais caro ou igual ao anterior e só o fotorrealista faz path tracing", () => {
    const qs = QUALITY_ORDER.map((id) => QUALITY[id]);
    for (let i = 1; i < qs.length; i += 1) expect(qs[i]!.shadowMapSize).toBeGreaterThanOrEqual(qs[i - 1]!.shadowMapSize);
    expect(qs.filter((q) => q.pathTracing).map((q) => q.id)).toEqual(["fotorrealista"]);
  });
  it("aparelho modesto começa no interativo; o resto na alta", () => {
    expect(suggestedQuality(2, 8)).toBe("interativo");
    expect(suggestedQuality(8, 2)).toBe("interativo");
    expect(suggestedQuality(8, 8)).toBe("alta");
    expect(suggestedQuality(undefined, undefined)).toBe("alta");
  });
});

describe("HDRI de estúdio", () => {
  const W = 256, H = 128;
  const env = studioEnvironment(W, H);
  /** Pixel na direção (x, y, z) com a convenção do three.js: u = atan2(z, x)/2π + 0,5; linha 0 = nadir. */
  const at = ([x, y, z]: [number, number, number]) => {
    const u = Math.atan2(z, x) / (2 * Math.PI) + 0.5;
    const v = Math.asin(Math.max(-1, Math.min(1, y))) / Math.PI + 0.5;
    const i = (Math.min(H - 1, Math.floor(v * H)) * W + Math.min(W - 1, Math.floor(u * W))) * 4;
    return env[i]!;
  };

  it("valores finitos, não negativos e com alta faixa dinâmica", () => {
    let max = 0;
    for (const v of env) {
      expect(Number.isFinite(v) && v >= 0).toBe(true);
      max = Math.max(max, v);
    }
    expect(max).toBeGreaterThan(5);
  });

  it("cada softbox brilha na direção em que a luz direcional e o path tracer o procuram", () => {
    const ambient = at([0, 0, -1]);
    for (const box of STUDIO_SOFTBOXES) expect(at(directionOf(box.azimuth, box.elevation)), `az ${box.azimuth}`).toBeGreaterThan(ambient * 5);
  });

  it("o chão é mais escuro que o teto (estúdio de verdade, não céu uniforme)", () => {
    expect(at([0.3, -0.9, 0.3])).toBeLessThan(at([0.6, 0.4, -0.6]));
  });
});
