import { describe, expect, it } from "vitest";
import { changeMode, personalPolicy, type AiPolicy } from "@/lib/ai/autonomy";
import { worldBox, rotateXYZ } from "./bounds";
import { ApplyAiPatch, History, SetTransform } from "./commands";
import { aiCapabilities, assistedBatch3D, buildBatch3D, createProposal3D, itemValidity3D, reconcileProposal3D, setStatus3D } from "./ghost";
import { createObject, starterScene, type Scene3D, type SceneObject } from "./model";
import { mirrorTransform, sceneFingerprint, suggest3D } from "./suggest";

const obj = (o: SceneObject, patch: Partial<SceneObject["transform"]>): SceneObject => ({ ...o, transform: { ...o.transform, ...patch } });
const policy = (mode: AiPolicy["mode"] = "SOB_SOLICITACAO") => personalPolicy(mode);
const kinds = (scene: Scene3D) => suggest3D(scene).map((s) => s.id);

describe("caixas no mundo (sem three.js)", () => {
  it("rotação XYZ segue o three.js e a caixa considera escala e rotação", () => {
    const [x, y, z] = rotateXYZ([1, 0, 0], [0, 0, 90]);
    expect([x, y, z].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([0, 1, 0]);
    const ring = createObject("toro", "Anel", { position: [0, 0.2, 0], rotation: [90, 0, 25], scale: [0.5, 0.5, 0.5] }, "r");
    const b = worldBox(ring);
    expect(b.min[1]).toBeCloseTo(0.2 - 0.15 * 0.5, 4); // deitado: altura é o tubo
    const vase = createObject("vaso", "V", { position: [0, 0.3, 0] }, "v");
    expect(worldBox(vase).min[1]).toBe(0.3); // base do vaso na origem local
  });
});

describe("sugestões 3D determinísticas", () => {
  it("a cena inicial já está assentada, alinhada e na grade: nenhuma sugestão", () => {
    expect(suggest3D(starterScene())).toEqual([]);
  });

  it("ASSENTAR pousa no piso ou no topo do objeto de baixo, para baixo ou para cima, com os centímetros calculados", () => {
    const plate = createObject("placa", "Pedestal", { position: [0, 0.025, 0], scale: [2, 1, 2] }, "p");
    const floating = createObject("caixa", "Bloco", { position: [0.2, 0.62, 0.1] }, "b"); // base 0,12; topo da placa 0,05
    const sunk = createObject("esfera", "Bola", { position: [3, 0.48, 0] }, "s"); // fora da placa; base -0,02
    const s = suggest3D({ objects: [plate, floating, sunk] });
    const onPlate = s.find((x) => x.id === "ASSENTAR:b")!;
    expect(onPlate.label).toEqual({ key: "d3.ghost.sug.ASSENTAR.on.down", vars: { name: "Bloco", support: "Pedestal", cm: 7 } });
    expect(onPlate.ops[0]).toMatchObject({ op: "transform", id: "b", after: { position: [0.2, 0.55, 0.1] } });
    expect(onPlate.dependsOn).toEqual(["b", "p"]);
    const floor = s.find((x) => x.id === "ASSENTAR:s")!;
    expect(floor.label).toEqual({ key: "d3.ghost.sug.ASSENTAR.floor.up", vars: { name: "Bola", cm: 2 } });
    expect(floor.ghosts[0]!.transform.position[1]).toBe(0.5);
  });

  it("ALINHAR leva ao valor mais comum (empate: o menor) e cada objeto recebe no máximo uma sugestão", () => {
    const a = createObject("caixa", "A", { position: [1, 0.5, 0] }, "a");
    const b = createObject("caixa", "B", { position: [1, 0.5, 2] }, "b");
    const c = createObject("caixa", "C", { position: [1.03, 0.5, 4] }, "c");
    const s = suggest3D({ objects: [a, b, c] });
    expect(s.map((x) => x.id)).toEqual(["ALINHAR:c"]);
    expect(s[0]!.label).toEqual({ key: "d3.ghost.sug.ALINHAR.x", vars: { name: "C", refs: "A, B", from: 1.03, to: 1 } });
    expect(s[0]!.dependsOn).toEqual(["c", "a", "b"]);
  });

  it("IGUALAR_ESCALA iguala objetos do mesmo tipo e mantém a base no lugar", () => {
    const a = createObject("esfera", "A", { position: [0, 0.25, 0], scale: [0.5, 0.5, 0.5] }, "a");
    const b = createObject("esfera", "B", { position: [2, 0.25, 2], scale: [0.5, 0.5, 0.5] }, "b");
    const c = createObject("esfera", "C", { position: [4, 0.27, 4], scale: [0.54, 0.54, 0.54] }, "c");
    const [s] = suggest3D({ objects: [a, b, c] });
    expect(s!.id).toBe("IGUALAR_ESCALA:c");
    const after = (s!.ops[0] as { after: SceneObject["transform"] }).after;
    expect(after.scale).toEqual([0.5, 0.5, 0.5]);
    expect(worldBox({ kind: "esfera", transform: after }).min[1]).toBeCloseTo(0, 4);
  });

  it("ENCAIXAR_GRADE arredonda X/Z para 5 cm", () => {
    const o = createObject("cone", "Cone", { position: [0.33, 0.5, -0.71] }, "k");
    const [s] = suggest3D({ objects: [o] });
    expect(s!.id).toBe("ENCAIXAR_GRADE:k");
    expect(s!.ghosts[0]!.transform.position).toEqual([0.35, 0.5, -0.7]);
    expect(s!.label.vars).toMatchObject({ grid: 5, shift: 2 });
  });

  it("ESPELHAR propõe a cópia no eixo da placa principal, sem colidir e sem repetir par existente", () => {
    const plate = createObject("placa", "Palco", { position: [0, 0.025, 0], scale: [4, 1, 2] }, "p");
    const cone = createObject("cone", "Cone", { position: [-1.2, 0.55, 0.2], rotation: [0, 30, 0] }, "k");
    const s = suggest3D({ objects: [plate, cone] });
    expect(s.map((x) => x.id)).toEqual(["ESPELHAR:k"]);
    const add = s[0]!.ops[0] as { op: "add"; object: SceneObject };
    expect(add.object).toMatchObject({ id: "k-sim", kind: "cone", transform: { position: [1.2, 0.55, 0.2], rotation: [0, -30, 0] } });
    expect(s[0]!.targetIds).toEqual(["k-sim"]);
    // com o par já presente, nada a sugerir
    expect(kinds({ objects: [plate, cone, { ...cone, id: "k2", transform: mirrorTransform(cone.transform, 0) }] })).toEqual([]);
    // cópia que cairia sobre outro objeto não é proposta
    const blocker = createObject("caixa", "Caixa", { position: [1.2, 0.55, 0.2] }, "x");
    expect(kinds({ objects: [plate, cone, blocker] })).not.toContain("ESPELHAR:k");
  });

  it("filhos (com parentId) ficam de fora; a impressão do escopo só muda com os objetos lidos", () => {
    const parent = createObject("caixa", "Pai", { position: [0.33, 0.5, 0] }, "pai");
    const child = { ...createObject("cone", "Filho", { position: [0.11, 1.5, 0] }, "f"), parentId: "pai" };
    expect(kinds({ objects: [parent, child] })).toEqual(["ENCAIXAR_GRADE:pai"]);
    const scene = { objects: [parent, child] };
    const fp = sceneFingerprint(scene, ["pai"]);
    expect(sceneFingerprint({ objects: [parent, obj(child, { position: [9, 9, 9] })] }, ["pai"])).toBe(fp);
    expect(sceneFingerprint({ objects: [obj(parent, { position: [0, 0.5, 0] }), child] }, ["pai"])).not.toBe(fp);
  });
});

describe("proposta, validade e lote", () => {
  const scene = (): Scene3D => ({
    objects: [
      createObject("caixa", "A", { position: [0.33, 0.5, 0] }, "a"),
      createObject("esfera", "B", { position: [3, 0.6, 0] }, "b"),
    ],
  });

  it("recusa automática: revisão do escopo, objeto removido e troca de política, com o motivo", () => {
    const s0 = scene();
    const pol = policy();
    const p = createProposal3D(s0, 4, pol, suggest3D(s0), { id: "p1", now: 0, requested: true });
    expect(p.items.map((i) => i.suggestion.id)).toEqual(["ASSENTAR:b", "ENCAIXAR_GRADE:a"]);
    expect(p.baseRevision).toBe(4);
    expect(reconcileProposal3D(p, { scene: s0, policy: pol })).toBe(p); // nada mudou: mesmo objeto

    const moved: Scene3D = { objects: [obj(s0.objects[0]!, { position: [0.31, 0.5, 0] }), s0.objects[1]!] };
    const r1 = reconcileProposal3D(p, { scene: moved, policy: pol });
    expect(r1.items.find((i) => i.suggestion.id === "ENCAIXAR_GRADE:a")).toMatchObject({ status: "RECUSADA", reason: { code: "REVISAO" } });
    expect(r1.items.find((i) => i.suggestion.id === "ASSENTAR:b")!.status).toBe("PENDENTE");

    const removed: Scene3D = { objects: [s0.objects[0]!] };
    const v = itemValidity3D(p, p.items[0]!, { scene: removed, policy: pol });
    expect(v.ok).toBe(false);
    // o fingerprint muda quando o objeto some → REVISAO tem precedência (proposalValidity olha a revisão antes do alvo)
    expect(!v.ok && v.reason.code).toBe("REVISAO");

    const changed = changeMode(pol, [{ userId: "eu", role: "PROPRIETARIO" }], "eu", "SUGESTOES", new Date());
    if (!changed.ok) throw new Error("troca de modo");
    const r2 = reconcileProposal3D(p, { scene: s0, policy: changed.policy });
    expect(r2.items.every((i) => i.status === "RECUSADA" && i.reason?.code === "POLITICA")).toBe(true);
    expect(r2.items[0]!.reason).toEqual({ code: "POLITICA", from: 1, to: 2 });
  });

  it("cópia proposta que passou a existir por outro caminho é recusada; estados terminais não voltam", () => {
    const plate = createObject("placa", "Palco", { position: [0, 0.025, 0], scale: [4, 1, 2] }, "p");
    const cone = createObject("cone", "Cone", { position: [-1.2, 0.55, 0.2] }, "k");
    const s0 = { objects: [plate, cone] };
    const p = createProposal3D(s0, 0, policy(), suggest3D(s0), { id: "p", now: 0, requested: true });
    const copy = (p.items[0]!.suggestion.ops[0] as { object: SceneObject }).object;
    // a cópia criada por outro caminho (mesmo id, fora do escopo lido) — dependsOn inclui o id da cópia → REVISAO
    const r = reconcileProposal3D(p, { scene: { objects: [plate, cone, copy] }, policy: policy() });
    expect(r.items[0]!.status).toBe("RECUSADA");
    const rejected = setStatus3D(p, [p.items[0]!.suggestion.id], "REJEITADA");
    expect(setStatus3D(rejected, [p.items[0]!.suggestion.id], "ACEITA").items[0]!.status).toBe("REJEITADA");
  });

  it("lote: sugestão que leu algo alterado por outra do mesmo lote fica de fora (LOTE)", () => {
    const plate = createObject("placa", "Palco", { position: [0, 0.025, 0], scale: [4, 1, 2] }, "p");
    const a = createObject("caixa", "A", { position: [0, 0.6, 0] }, "a"); // flutua 5 cm sobre a placa
    const s0 = [plate, a];
    const sug = suggest3D({ objects: s0 });
    const p = createProposal3D({ objects: s0 }, 0, policy(), sug, { id: "p", now: 0, requested: true });
    const fake = { ...p.items[0]!, suggestion: { ...p.items[0]!.suggestion, id: "X", dependsOn: ["a"], targetIds: ["z"] } };
    const { itemIds, skipped } = buildBatch3D([p.items[0]!, fake]);
    expect(itemIds).toEqual(["ASSENTAR:a"]);
    expect(skipped).toEqual([{ id: "X", by: "ASSENTAR:a" }]);
  });

  it("aceitar é um comando: um desfazer volta tudo, e o modelo só muda ao aceitar", () => {
    const s0 = scene();
    const sug = suggest3D(s0);
    expect(s0.objects[0]!.transform.position).toEqual([0.33, 0.5, 0]); // sugerir não altera a cena
    const history = new History();
    const s1 = history.execute(s0, new ApplyAiPatch(sug.flatMap((s) => s.ops), "d3.ghost.cmd.acceptAll"));
    expect(s1.objects.map((o) => o.transform.position)).toEqual([[0.35, 0.5, 0], [3, 0.5, 0]]);
    expect(history.undoLabelKey).toBe("d3.ghost.cmd.acceptAll");
    expect(history.undo(s1)).toEqual(s0);
    // patch sobre objeto que sumiu não muda nada (o histórico ignora)
    expect(history.execute({ objects: [] }, new ApplyAiPatch(sug[0]!.ops))).toEqual({ objects: [] });
    // adicionar cópia e desfazer remove a cópia
    const plate = createObject("placa", "Palco", { position: [0, 0.025, 0], scale: [4, 1, 2] }, "p");
    const cone = createObject("cone", "Cone", { position: [-1.2, 0.55, 0.2] }, "k");
    const m = suggest3D({ objects: [plate, cone] });
    const withCopy = history.execute({ objects: [plate, cone] }, new ApplyAiPatch(m[0]!.ops));
    expect(withCopy.objects.map((o) => o.id)).toEqual(["p", "k", "k-sim"]);
    expect(history.undo(withCopy).objects.map((o) => o.id)).toEqual(["p", "k"]);
    // outros comandos continuam iguais
    expect(history.execute(s0, new SetTransform("a", s0.objects[0]!.transform))).toBeDefined();
  });

  it("Assistido: só no modo Assistido, só com seleção e só o que está nela", () => {
    const s0 = scene();
    const pol = policy("ASSISTIDO");
    const p = createProposal3D(s0, 0, pol, suggest3D(s0), { id: "p", now: 0, requested: false });
    expect(assistedBatch3D(p, { scene: s0, policy: pol, selection: new Set(), actorId: "eu" })).toEqual({ ok: false, reason: "SEM_SELECAO" });
    const r = assistedBatch3D(p, { scene: s0, policy: pol, selection: new Set(["a"]), actorId: "eu" });
    expect(r.ok && r.items.map((i) => i.suggestion.id)).toEqual(["ENCAIXAR_GRADE:a"]);
    const sug = policy("SUGESTOES");
    const p2 = createProposal3D(s0, 0, sug, suggest3D(s0), { id: "p", now: 0, requested: false });
    expect(assistedBatch3D(p2, { scene: s0, policy: sug, selection: new Set(["a"]), actorId: "eu" })).toEqual({ ok: false, reason: "MODO_NAO_PERMITE" });
  });

  it("capacidades por modo iguais às do 2D", () => {
    expect(aiCapabilities(policy("MANUAL"))).toMatchObject({ onRequest: false, spontaneous: false, unavailable: "MANUAL" });
    expect(aiCapabilities(policy("SOB_SOLICITACAO"))).toMatchObject({ onRequest: true, spontaneous: false, batch: false });
    expect(aiCapabilities(policy("SUGESTOES"))).toMatchObject({ onRequest: true, spontaneous: true, batch: false });
    expect(aiCapabilities(policy("ASSISTIDO"))).toMatchObject({ spontaneous: true, batch: true });
    expect(aiCapabilities(policy("AGENTE"))).toMatchObject({ unavailable: "AGENTE" });
  });
});
