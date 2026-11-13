import { describe, expect, it } from "vitest";
import { ALL_LAYERS, LOCK_TTL_MS } from "@/lib/pieces/collab";
import { movePatch, removePatch, setGeomPatch, insertPatch } from "./commands";
import { commit, initialState, join, leave, MAX_LEASES_PER_PERSON, release, renew, reserve, type DrawingPatch, type SharedState } from "./engine";
import { DEMO_START_LAYER, demoDrawing } from "./fixture";
import { emptyHistory, popEntry, pushEntry, recordApplied } from "./history";
import { regionTree, regionsOfShape, shapeById, validGeom, type ViewState } from "./model";

const T0 = 1_700_000_000_000;
const VIEW: ViewState = { activeLayerId: DEMO_START_LAYER, hiddenLayerIds: [] };
const ok = <T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> => {
  if (!r.ok) throw new Error(`esperava sucesso: ${JSON.stringify((r as { denial?: unknown }).denial)}`);
  return r as Extract<T, { ok: true }>;
};
const base = (): SharedState => {
  let s = initialState(demoDrawing());
  s = join(s, { id: "ana", name: "Ana", kind: "SIMULADA", color: "green" }, T0).state;
  s = join(s, { id: "bruno", name: "Bruno", kind: "PESSOA" }, T0).state;
  return s;
};
const regionsOf = (s: SharedState, id: string) => regionsOfShape(s.doc, shapeById(s.doc, id)!);

describe("documento e regiões (RF65)", () => {
  it("cada forma pertence à região mais específica que toca — todas elas, não só a do centro", () => {
    const s = base();
    expect(regionsOf(s, "s-js2")).toEqual(["fachada/superior"]);
    expect(regionsOf(s, "s-porta")).toEqual(["fachada/terreo"]);
    expect(regionsOf(s, "s-contorno")).toEqual(["fachada/superior", "fachada/terreo"]);
    expect(regionsOf(s, "s-laje")).toEqual(["fachada/superior", "fachada/terreo"]); // linha sobre a divisa: os dois lados
    expect(regionsOf(s, "s-telhado")).toEqual(["cobertura"]);
    expect(regionsOf(s, "s-cota-largura")).toEqual(["terreno"]);
    expect(regionsOf(s, "s-carimbo-titulo")).toEqual(["carimbo"]); // região por grupo vale onde quer que o objeto esteja
    expect(regionTree(s.doc).map((r) => r.id)).toEqual(["cobertura", "fachada", "fachada/superior", "fachada/terreo", "terreno", "margem", "carimbo"]);
  });

  it("rejeita geometria degenerada (RF58.CA01)", () => {
    expect(validGeom({ kind: "retangulo", x: 0, y: 0, w: 0, h: 10 })).toBe(false);
    expect(validGeom({ kind: "linha", a: { x: 1, y: 1 }, b: { x: 1, y: 1 } })).toBe(false);
    expect(validGeom({ kind: "circulo", cx: 0, cy: 0, r: Number.NaN })).toBe(false);
    expect(validGeom({ kind: "polilinha", points: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 5, y: 5 }], closed: true })).toBe(false);
    expect(validGeom({ kind: "texto", x: 0, y: 0, text: "  ", size: 10 })).toBe(false);
    expect(validGeom({ kind: "cota", a: { x: 0, y: 0 }, b: { x: 10, y: 0 }, offset: 5 })).toBe(true);
  });
});

describe("reservas transacionais (RF66.CA02/CA03)", () => {
  it("reserva com token de fencing; conflito com a mesma região, ancestral ou descendente traz dono e prazo", () => {
    const r = ok(reserve(base(), { actorId: "ana", layerId: "esquadrias", regionIds: ["fachada/superior"] }, T0));
    expect(r.lock).toMatchObject({ id: "L1", token: 1, ownerId: "ana", expiresAt: T0 + LOCK_TTL_MS });
    expect(r.state.log.at(-1)).toMatchObject({ kind: "RESERVA", actorId: "ana", token: 1 });
    for (const regionIds of [["fachada/superior"], ["fachada"]]) {
      const denied = reserve(r.state, { actorId: "bruno", layerId: "esquadrias", regionIds }, T0 + 1000);
      expect(denied).toMatchObject({ ok: false, denial: { code: "REGIAO_RESERVADA", lock: { ownerId: "ana", expiresAt: T0 + LOCK_TTL_MS } } });
    }
    // reserva de todas as camadas conflita com qualquer camada sobreposta
    expect(reserve(r.state, { actorId: "bruno", layerId: ALL_LAYERS, regionIds: ["fachada"] }, T0)).toMatchObject({ ok: false });
    // escopos disjuntos convivem: outra região, ou a mesma região em outra camada
    expect(reserve(r.state, { actorId: "bruno", layerId: "esquadrias", regionIds: ["fachada/terreo"] }, T0).ok).toBe(true);
    expect(reserve(r.state, { actorId: "bruno", layerId: "estrutura", regionIds: ["fachada/superior"] }, T0).ok).toBe(true);
  });

  it("camada travada não se reserva; região inexistente e prazo inválido são recusados", () => {
    expect(reserve(base(), { actorId: "ana", layerId: "base", regionIds: ["terreno"] }, T0)).toMatchObject({ ok: false, denial: { code: "AUTORIZACAO", reason: "CAMADA_TRAVADA" } });
    expect(reserve(base(), { actorId: "ana", layerId: "esquadrias", regionIds: ["lua"] }, T0)).toMatchObject({ ok: false, denial: { code: "REGIAO_INEXISTENTE" } });
    expect(reserve(base(), { actorId: "ana", layerId: "esquadrias", regionIds: ["terreno"], ttl: 60 * 60_000 }, T0)).toMatchObject({ ok: false, denial: { code: "PRAZO_INVALIDO" } });
  });

  it("reservar de novo a mesma região renova; região já coberta por reserva maior não cria outra; há limite por pessoa", () => {
    const a = ok(reserve(base(), { actorId: "ana", layerId: "esquadrias", regionIds: ["fachada"] }, T0));
    const again = ok(reserve(a.state, { actorId: "ana", layerId: "esquadrias", regionIds: ["fachada"] }, T0 + 5000));
    expect(again.lock).toMatchObject({ id: "L1", expiresAt: T0 + 5000 + LOCK_TTL_MS });
    expect(again.state.locks).toHaveLength(1);
    const inner = ok(reserve(again.state, { actorId: "ana", layerId: "esquadrias", regionIds: ["fachada/terreo"] }, T0 + 6000));
    expect(inner.already).toBe(true);
    expect(inner.state.locks).toHaveLength(1);
    let s = base();
    for (const r of ["cobertura", "terreno", "margem", "carimbo"]) s = ok(reserve(s, { actorId: "bruno", layerId: "cotas", regionIds: [r] }, T0)).state;
    expect(reserve(s, { actorId: "bruno", layerId: "cotas", regionIds: ["fachada"] }, T0)).toMatchObject({ ok: false, denial: { code: "LIMITE_DE_RESERVAS", max: MAX_LEASES_PER_PERSON } });
  });

  it("renovar e liberar exigem o dono e o token vigente; reserva vencida não volta — o cliente antigo reserva de novo", () => {
    const a = ok(reserve(base(), { actorId: "ana", layerId: "esquadrias", regionIds: ["fachada/superior"], ttl: 30_000 }, T0));
    expect(renew(a.state, { actorId: "bruno", lockId: "L1", token: 1 }, T0 + 1000)).toMatchObject({ ok: false, denial: { code: "LEASE", reason: "OUTRO_DONO" } });
    expect(renew(a.state, { actorId: "ana", lockId: "L1", token: 99 }, T0 + 1000)).toMatchObject({ ok: false, denial: { code: "LEASE", reason: "TOKEN_OBSOLETO" } });
    const renewed = ok(renew(a.state, { actorId: "ana", lockId: "L1", token: 1, ttl: 60_000 }, T0 + 10_000));
    expect(renewed.lock.expiresAt).toBe(T0 + 70_000);
    // expira: a região fica livre para outra pessoa (relógio da transação) e a expiração entra no histórico
    const late = T0 + 70_001;
    expect(renew(renewed.state, { actorId: "ana", lockId: "L1", token: 1 }, late)).toMatchObject({ ok: false, denial: { code: "LEASE", reason: "EXPIRADA" } });
    const bruno = ok(reserve(renewed.state, { actorId: "bruno", layerId: "esquadrias", regionIds: ["fachada/superior"] }, late));
    expect(bruno.lock.token).toBe(2);
    expect(bruno.state.log.some((e) => e.kind === "EXPIRACAO" && e.actorId === "ana" && e.at === T0 + 70_000)).toBe(true);
    // o token antigo da Ana não libera a reserva nova do Bruno
    expect(release(bruno.state, { actorId: "ana", lockId: "L1", token: 1 }, late)).toMatchObject({ ok: false });
    const freed = ok(release(bruno.state, { actorId: "bruno", lockId: "L2", token: 2 }, late + 1));
    expect(freed.state.locks).toHaveLength(0);
  });

  it("sair da peça libera as reservas da pessoa", () => {
    const a = ok(reserve(base(), { actorId: "ana", layerId: "esquadrias", regionIds: ["fachada/superior"] }, T0));
    const s = leave(a.state, "ana", T0 + 10);
    expect(s.locks).toHaveLength(0);
    expect(s.log.at(-1)).toMatchObject({ kind: "SAIDA", actorId: "ana" });
    expect(s.participants.ana!.lastSeen).toBe(0);
  });

  it("presentes ganham cores diferentes e nomes repetidos ganham sufixo", () => {
    let s = initialState(demoDrawing());
    s = join(s, { id: "t1", name: "Pessoa exemplo", kind: "PESSOA" }, T0).state;
    const second = join(s, { id: "t2", name: "Pessoa exemplo", kind: "PESSOA" }, T0 + 1000);
    expect(second.participant.name).toBe("Pessoa exemplo (2)");
    expect(second.participant.color).not.toBe(s.participants.t1!.color);
  });
});

describe("patches com revisão e reserva (RF66.CA01/CA04, RF65.CA07)", () => {
  const withLocks = () => {
    let s = ok(reserve(base(), { actorId: "ana", layerId: "esquadrias", regionIds: ["fachada/superior"] }, T0)).state;
    s = ok(reserve(s, { actorId: "bruno", layerId: "esquadrias", regionIds: ["fachada/terreo"] }, T0)).state;
    return s;
  };
  const ctx = (now = T0 + 1000, view: ViewState = VIEW, autoReserve = false) => ({ now, view, autoReserve });

  it("patches simultâneos em regiões disjuntas convivem e cada objeto sobe a própria revisão", () => {
    const s = withLocks();
    const anaPatch = setGeomPatch(s.doc, "ana", "s-js1", { kind: "retangulo", x: 170, y: 290, w: 90, h: 120 })!;
    const brunoPatch = movePatch(s.doc, "bruno", ["s-porta"], 10, 0)!;
    const a = ok(commit(s, anaPatch, ctx()));
    const b = ok(commit(a.state, brunoPatch, ctx()));
    expect(b.state.doc.revision).toBe(3);
    expect(shapeById(b.state.doc, "s-js1")).toMatchObject({ rev: 2, geom: { h: 120 } });
    expect(shapeById(b.state.doc, "s-porta")).toMatchObject({ rev: 2, geom: { x: 400 } });
  });

  it("região reservada por outra pessoa recusa a edição com dono e prazo — mesmo com reserva automática", () => {
    const s = withLocks();
    const p = movePatch(s.doc, "bruno", ["s-js2"], 0, -3)!;
    expect(commit(s, p, ctx(T0 + 1000, VIEW, true))).toMatchObject({ ok: false, denial: { code: "REGIAO_RESERVADA", lock: { ownerId: "ana" } } });
  });

  it("mover exige origem E destino: levar a janela do térreo para o pavimento da Ana é recusado", () => {
    const s = withLocks();
    const p = movePatch(s.doc, "bruno", ["s-jt1"], 0, -150)!;
    expect(commit(s, p, ctx())).toMatchObject({ ok: false, denial: { code: "REGIAO_RESERVADA", regionIds: ["fachada/terreo", "fachada/superior"] } });
  });

  it("sem reserva própria: recusa (SEM_RESERVA) ou reserva na mesma transação quando permitido; reserva vencida → RESERVA_EXPIRADA", () => {
    const s = base();
    const p = movePatch(s.doc, "bruno", ["s-porta"], 10, 0)!;
    expect(commit(s, p, ctx())).toMatchObject({ ok: false, denial: { code: "SEM_RESERVA", regionIds: ["fachada/terreo"] } });
    const auto = ok(commit(s, p, ctx(T0, VIEW, true)));
    expect(auto.applied.autoLocks).toHaveLength(1);
    expect(auto.applied.autoLocks[0]).toMatchObject({ ownerId: "bruno", layerId: "esquadrias", regionIds: ["fachada/terreo"] });
    expect(auto.state.log.find((e) => e.kind === "RESERVA")).toMatchObject({ auto: true });
    const later = movePatch(auto.state.doc, "bruno", ["s-porta"], 10, 0)!;
    expect(commit(auto.state, later, ctx(T0 + LOCK_TTL_MS + 1))).toMatchObject({ ok: false, denial: { code: "RESERVA_EXPIRADA" } });
  });

  it("patch antigo nunca sobrescreve revisão nova (rascunho fica com quem enviou)", () => {
    const s = withLocks();
    const stale = movePatch(s.doc, "bruno", ["s-porta"], 10, 0)!;
    const first = ok(commit(s, movePatch(s.doc, "bruno", ["s-porta"], 0, -10)!, ctx()));
    const r = commit(first.state, stale, ctx());
    expect(r).toMatchObject({ ok: false, denial: { code: "REVISAO_DESATUALIZADA", shapeId: "s-porta", expected: 1, actual: 2 } });
    expect(r.state.doc).toEqual(first.state.doc);
  });

  it("mesma porta de autorização para manual e IA: camada travada, oculta, inativa; IA precisa de escopo limitado", () => {
    const s = ok(reserve(base(), { actorId: "bruno", layerId: ALL_LAYERS, regionIds: ["terreno", "fachada"] }, T0)).state;
    const ground = movePatch(s.doc, "bruno", ["s-terreno"], 0, 5)!;
    expect(commit(s, ground, ctx(T0, { ...VIEW, activeLayerId: "base" }))).toMatchObject({ ok: false, denial: { code: "AUTORIZACAO", reason: "CAMADA_TRAVADA" } });
    const door = movePatch(s.doc, "bruno", ["s-porta"], 10, 0)!;
    expect(commit(s, door, ctx(T0, { ...VIEW, hiddenLayerIds: ["esquadrias"] }))).toMatchObject({ ok: false, denial: { code: "AUTORIZACAO", reason: "CAMADA_OCULTA" } });
    expect(commit(s, door, ctx(T0, { ...VIEW, activeLayerId: "estrutura" }))).toMatchObject({ ok: false, denial: { code: "AUTORIZACAO", reason: "CAMADA_INATIVA" } });
    const ai: DrawingPatch = { ...door, origin: "IA" };
    expect(commit(s, ai, ctx(T0))).toMatchObject({ ok: false, denial: { code: "AUTORIZACAO", reason: "IA_SEM_SELECAO" } });
    expect(commit(s, { ...ai, scopeRegionIds: ["fachada/terreo"] }, ctx(T0)).ok).toBe(true);
  });

  it("geometria degenerada, fora da folha ou objeto inexistente não grava nada", () => {
    const s = ok(reserve(base(), { actorId: "bruno", layerId: "esquadrias", regionIds: ["fachada"] }, T0)).state;
    expect(commit(s, setGeomPatch(s.doc, "bruno", "s-porta", { kind: "retangulo", x: 390, y: 450, w: 0, h: 150 })!, ctx())).toMatchObject({ ok: false, denial: { code: "GEOMETRIA_INVALIDA" } });
    expect(commit(s, movePatch(s.doc, "bruno", ["s-porta"], -500, 0)!, ctx())).toMatchObject({ ok: false, denial: { code: "FORA_DA_FOLHA" } });
    const ghost = removePatch(s.doc, "bruno", ["s-porta"])!;
    const gone = ok(commit(s, ghost, ctx()));
    expect(commit(gone.state, ghost, ctx())).toMatchObject({ ok: false, denial: { code: "OBJETO_INEXISTENTE" } });
  });

  it("desfazer é patch inverso com revisão esperada: restaura o próprio trabalho e recusa se outra pessoa mexeu depois", () => {
    let s = ok(reserve(base(), { actorId: "bruno", layerId: "esquadrias", regionIds: ["fachada/terreo"] }, T0)).state;
    const moved = ok(commit(s, movePatch(s.doc, "bruno", ["s-porta"], 20, 0)!, ctx()));
    let h = recordApplied(emptyHistory, { label: { key: "x" }, parts: [{ layerId: "esquadrias", ops: moved.applied.inverse }] });
    const popped = popEntry(h, "undo")!;
    const undo: DrawingPatch = { id: "u1", actorId: "bruno", origin: "MANUAL", baseRevision: moved.state.doc.revision, ops: popped.entry.parts[0]!.ops, label: { key: "x" }, undo: "DESFAZER" };
    const undone = ok(commit(moved.state, undo, ctx()));
    expect(shapeById(undone.state.doc, "s-porta")).toMatchObject({ geom: { x: 390 }, rev: 3 });
    h = pushEntry(popped.history, "redo", { label: { key: "x" }, parts: [{ layerId: "esquadrias", ops: undone.applied.inverse }] });
    expect(h.redo).toHaveLength(1);

    // outra pessoa altera o objeto depois: o desfazer antigo não apaga o trabalho dela
    s = moved.state;
    s = ok(release(s, { actorId: "bruno", lockId: "L1", token: 1 }, T0 + 2000)).state;
    s = ok(reserve(s, { actorId: "ana", layerId: "esquadrias", regionIds: ["fachada/terreo"] }, T0 + 2000)).state;
    s = ok(commit(s, movePatch(s.doc, "ana", ["s-porta"], 0, -10)!, ctx(T0 + 3000))).state;
    s = ok(release(s, { actorId: "ana", lockId: "L2", token: 2 }, T0 + 4000)).state;
    expect(commit(s, undo, ctx(T0 + 5000, VIEW, true))).toMatchObject({ ok: false, denial: { code: "REVISAO_DESATUALIZADA", shapeId: "s-porta" } });
  });

  it("excluir e desfazer devolve o objeto na mesma ordem de desenho, com revisão seguinte; inserir cria revisão 1", () => {
    const s = ok(reserve(base(), { actorId: "bruno", layerId: "esquadrias", regionIds: ["fachada"] }, T0)).state;
    const index = s.doc.shapes.findIndex((x) => x.id === "s-porta");
    const removed = ok(commit(s, removePatch(s.doc, "bruno", ["s-porta"])!, ctx()));
    const restored = ok(commit(removed.state, { ...removePatch(s.doc, "bruno", ["s-porta"])!, ops: removed.applied.inverse }, ctx()));
    expect(restored.state.doc.shapes.findIndex((x) => x.id === "s-porta")).toBe(index);
    expect(shapeById(restored.state.doc, "s-porta")!.rev).toBe(2);
    const added = ok(commit(s, insertPatch(s.doc, "bruno", { id: "n1", layerId: "esquadrias", name: "Janela nova", geom: { kind: "retangulo", x: 600, y: 470, w: 60, h: 60 } }), ctx()));
    expect(shapeById(added.state.doc, "n1")!.rev).toBe(1);
    expect(added.applied.inverse).toEqual([{ op: "remove", id: "n1", expectedRev: 1 }]);
  });
});
