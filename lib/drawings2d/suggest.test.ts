import { describe, expect, it } from "vitest";
import { changeMode, personalPolicy, type AiPolicy } from "@/lib/ai/autonomy";
import { movePatch } from "./commands";
import { commit, initialState, join, reserve, type SharedState } from "./engine";
import { DEMO_START_LAYER, demoDrawing } from "./fixture";
import { aiCapabilities, assistedBatch, batchPatch, buildBatch, createProposal, itemValidity, pendingItems, reconcileProposal, setStatus, type ValidityContext } from "./ghost";
import { shapeById, type ViewState } from "./model";
import { scopeFingerprint, suggest } from "./suggest";

const T0 = 1_700_000_000_000;
const VIEW: ViewState = { activeLayerId: DEMO_START_LAYER, hiddenLayerIds: [] };
const fresh = (): SharedState => {
  let s = initialState(demoDrawing());
  s = join(s, { id: "ana", name: "Ana", kind: "SIMULADA", color: "green" }, T0).state;
  return join(s, { id: "eu", name: "Pessoa exemplo", kind: "PESSOA" }, T0).state;
};
const byId = (state: SharedState) => new Map(suggest(state.doc, VIEW).map((s) => [s.id, s]));

describe("sugestões determinísticas da IA (RF74, D-12)", () => {
  it("a mesma peça gera sempre as mesmas sugestões, na ordem de prioridade", () => {
    const ids = suggest(fresh().doc, VIEW).map((s) => s.id);
    expect(ids).toEqual([
      "FECHAR_LACUNA:s-contorno",
      "ALINHAR:s-js2",
      "ALINHAR:s-jt1",
      "ENCAIXAR_GRADE:s-carimbo-escala",
      "ENCAIXAR_GRADE:s-oculo",
      "ENCAIXAR_GRADE:s-telhado",
      "COMPLETAR_SIMETRIA:s-jt1",
      "PROPOR_COTAS:altura",
      "PROPOR_COTAS:cumeeira",
    ]);
    expect(suggest(fresh().doc, VIEW)).toEqual(suggest(fresh().doc, VIEW));
  });

  it("fechar lacuna: tira o ponto quase repetido e fecha a polilinha (lacuna medida em cm)", () => {
    const s = byId(fresh()).get("FECHAR_LACUNA:s-contorno")!;
    expect(s.label).toEqual({ key: "drw2d.sug.FECHAR_LACUNA", vars: { name: "Contorno da fachada", gap: 6 } });
    expect(s.ops[0]).toMatchObject({ op: "update", id: "s-contorno", expectedRev: 1, geom: { closed: true, points: [{ x: 120, y: 600 }, { x: 120, y: 260 }, { x: 760, y: 260 }, { x: 760, y: 600 }] } });
    expect(s.regionIds).toEqual(["fachada/superior", "fachada/terreo"]);
  });

  it("alinhar: topo da Janela S2 ao valor mais comum das vizinhas; Janela T1 à coluna da S1", () => {
    const m = byId(fresh());
    expect(m.get("ALINHAR:s-js2")).toMatchObject({ label: { key: "drw2d.sug.ALINHAR.top", vars: { from: 293, to: 290, refs: "Janela S1, Janela S3" } }, ops: [{ geom: { x: 395, y: 290 } }], dependsOn: ["s-js2", "s-js1", "s-js3"] });
    expect(m.get("ALINHAR:s-jt1")).toMatchObject({ label: { key: "drw2d.sug.ALINHAR.column", vars: { from: 172, to: 170 } }, ops: [{ geom: { x: 170, y: 470 } }] });
  });

  it("encaixar na grade: só âncoras fora da grade e sem repetir objeto já sugerido (a cota segue o que mede)", () => {
    const m = byId(fresh());
    expect(m.get("ENCAIXAR_GRADE:s-oculo")!.ops[0]).toMatchObject({ geom: { cx: 440, cy: 200 } });
    expect(m.get("ENCAIXAR_GRADE:s-telhado")!.ops[0]).toMatchObject({ geom: { points: [{ x: 100, y: 260 }, { x: 440, y: 120 }, { x: 780, y: 260 }] } });
    expect(m.get("ENCAIXAR_GRADE:s-carimbo-escala")).toMatchObject({ regionIds: ["carimbo"], label: { vars: { grid: 10, shift: 5 } } });
    expect(m.has("ENCAIXAR_GRADE:s-js2") || m.has("ENCAIXAR_GRADE:s-jt1") || m.has("ENCAIXAR_GRADE:s-contorno") || m.has("ENCAIXAR_GRADE:s-cota-largura")).toBe(false);
  });

  it("completar simetria: espelha a Janela T1 no eixo do contorno (x = 440) sem cair sobre outro objeto", () => {
    const s = byId(fresh()).get("COMPLETAR_SIMETRIA:s-jt1")!;
    expect(s.ops).toEqual([{ op: "add", shape: { id: "s-jt1-sim", layerId: "esquadrias", name: "Janela T1 (simétrica)", geom: { kind: "retangulo", x: 618, y: 470, w: 90, h: 90 } } }]);
    expect(s.label.vars).toEqual({ name: "Janela T1", axis: 440 });
    expect(s.ghosts[0]).toMatchObject({ id: "s-jt1-sim", rev: 0 });
    expect(s.scopeIds).toEqual(["s-jt1"]);
  });

  it("propor cotas: altura da fachada e da cumeeira com o valor MEDIDO; a cota da largura já existe", () => {
    const m = byId(fresh());
    expect(m.get("PROPOR_COTAS:altura")).toMatchObject({ layerId: "cotas", label: { key: "drw2d.sug.PROPOR_COTAS.altura", vars: { meters: 3.4 } } });
    expect(m.get("PROPOR_COTAS:cumeeira")).toMatchObject({ label: { vars: { meters: 4.8 } } });
    expect([...m.keys()].some((k) => k.includes("largura"))).toBe(false);
  });

  it("camada oculta para a pessoa ou travada não recebe sugestão", () => {
    const ids = suggest(fresh().doc, { hiddenLayerIds: ["esquadrias", "cotas"] }).map((s) => s.id);
    expect(ids).toEqual(["FECHAR_LACUNA:s-contorno", "ENCAIXAR_GRADE:s-telhado"]);
  });

  it("a revisão do escopo muda quando muda o que a sugestão leu — e só então", () => {
    const s = fresh();
    const before = scopeFingerprint(s.doc, ["s-js2", "s-js1"]);
    const moved = commit(s, movePatch(s.doc, "eu", ["s-porta"], 10, 0)!, { now: T0, view: VIEW, autoReserve: true });
    if (!moved.ok) throw new Error("move");
    expect(scopeFingerprint(moved.state.doc, ["s-js2", "s-js1"])).toBe(before);
    const touched = commit(moved.state, movePatch(moved.state.doc, "eu", ["s-js1"], 0, 10)!, { now: T0, view: VIEW, autoReserve: true });
    if (!touched.ok) throw new Error("move 2");
    expect(scopeFingerprint(touched.state.doc, ["s-js2", "s-js1"])).not.toBe(before);
  });
});

describe("prévia fantasma: validade, recusa automática e lote (RF74.CA09/CA10, RF51)", () => {
  const ctx = (state: SharedState, policy: AiPolicy, view: ViewState = VIEW): ValidityContext => ({ state, policy, view, actorId: "eu", now: T0 + 1000 });
  const owner = [{ userId: "eu", role: "PROPRIETARIO" as const }];

  it("capacidades por modo: Manual não sugere; Sob solicitação só a pedido; Sugestões espontâneas; Assistido aplica lote; Agente indisponível", () => {
    expect(aiCapabilities(personalPolicy("MANUAL"))).toMatchObject({ onRequest: false, spontaneous: false, unavailable: "MANUAL" });
    expect(aiCapabilities(personalPolicy("SOB_SOLICITACAO"))).toMatchObject({ onRequest: true, spontaneous: false, batch: false, unavailable: null });
    expect(aiCapabilities(personalPolicy("SUGESTOES"))).toMatchObject({ onRequest: true, spontaneous: true, batch: false });
    expect(aiCapabilities(personalPolicy("ASSISTIDO"))).toMatchObject({ spontaneous: true, batch: true });
    expect(aiCapabilities(personalPolicy("AGENTE"))).toMatchObject({ onRequest: false, unavailable: "AGENTE" });
  });

  it("troca de modo invalida tudo o que estava pendente (política v1 → v2) e o rascunho não muda", () => {
    const s = fresh();
    const policy = personalPolicy("SUGESTOES");
    const p = createProposal(s, policy, suggest(s.doc, VIEW), { id: "pr1", now: T0, requested: false });
    expect(reconcileProposal(p, ctx(s, policy))).toBe(p); // nada mudou → mesmo objeto
    const changed = changeMode(policy, owner, "eu", "ASSISTIDO", new Date(T0));
    if (!changed.ok) throw new Error("mode");
    const r = reconcileProposal(p, ctx(s, changed.policy));
    expect(r.items.every((i) => i.status === "RECUSADA" && i.reason?.code === "POLITICA")).toBe(true);
    expect(r.items[0]!.reason).toEqual({ code: "POLITICA", from: 1, to: 2 });
    expect(s.doc).toEqual(fresh().doc);
  });

  it("revisão do escopo alterada → recusada; região-alvo reservada por outra pessoa → recusada com dono e prazo", () => {
    const s = fresh();
    const policy = personalPolicy("SUGESTOES");
    const p = createProposal(s, policy, suggest(s.doc, VIEW), { id: "pr1", now: T0, requested: false });
    // Ana reserva o pavimento superior (camada Esquadrias): a sugestão da Janela S2 cai; as do térreo seguem válidas
    const locked = reserve(s, { actorId: "ana", layerId: "esquadrias", regionIds: ["fachada/superior"] }, T0);
    if (!locked.ok) throw new Error("lock");
    const r = reconcileProposal(p, ctx(locked.state, policy));
    const item = (id: string) => r.items.find((i) => i.suggestion.id === id)!;
    expect(item("ALINHAR:s-js2")).toMatchObject({ status: "RECUSADA", reason: { code: "REGIAO_RESERVADA", lock: { ownerId: "ana" } } });
    expect(item("ALINHAR:s-jt1").status).toBe("PENDENTE");
    // alguém mexe na Janela T1: as duas sugestões que a leram ficam obsoletas
    const moved = commit(locked.state, movePatch(locked.state.doc, "eu", ["s-jt1"], 0, 10)!, { now: T0 + 2000, view: VIEW, autoReserve: true });
    if (!moved.ok) throw new Error("move");
    const r2 = reconcileProposal(r, ctx(moved.state, policy));
    expect(r2.items.find((i) => i.suggestion.id === "ALINHAR:s-jt1")).toMatchObject({ status: "RECUSADA", reason: { code: "REVISAO" } });
    expect(r2.items.find((i) => i.suggestion.id === "COMPLETAR_SIMETRIA:s-jt1")!.reason?.code).toBe("REVISAO");
    // terminal: liberar a região não "ressuscita" a sugestão recusada
    expect(reconcileProposal(r2, ctx(fresh(), policy)).items.find((i) => i.suggestion.id === "ALINHAR:s-js2")!.status).toBe("RECUSADA");
  });

  it("camada que a pessoa ocultou → recusada (CAMADA); objeto removido → OBJETO_REMOVIDO via escopo", () => {
    const s = fresh();
    const policy = personalPolicy("SUGESTOES");
    const p = createProposal(s, policy, suggest(s.doc, VIEW), { id: "pr1", now: T0, requested: false });
    const hidden = reconcileProposal(p, ctx(s, policy, { ...VIEW, hiddenLayerIds: ["cotas"] }));
    expect(hidden.items.filter((i) => i.status === "RECUSADA").map((i) => i.suggestion.id)).toEqual(["ENCAIXAR_GRADE:s-carimbo-escala", "PROPOR_COTAS:altura", "PROPOR_COTAS:cumeeira"]);
    expect(hidden.items.find((i) => i.suggestion.id === "PROPOR_COTAS:altura")!.reason).toEqual({ code: "CAMADA", layerId: "cotas" });
  });

  it("aceitar: patch de IA com escopo limitado passa pela mesma porta; sugestão que depende de outra do lote fica de fora", () => {
    const s = fresh();
    const policy = personalPolicy("SUGESTOES");
    const p = createProposal(s, policy, suggest(s.doc, VIEW), { id: "pr1", now: T0, requested: true });
    const items = pendingItems(p).filter((i) => i.suggestion.layerId === "esquadrias");
    const { parts, skipped } = buildBatch(items);
    expect(skipped).toEqual([{ id: "COMPLETAR_SIMETRIA:s-jt1", by: "ALINHAR:s-jt1" }]);
    expect(parts).toHaveLength(1);
    expect(parts[0]!.label).toEqual({ key: "drw2d.op.aiBatch", vars: { count: 3 } });
    const patch = batchPatch(parts[0]!, { id: "x", actorId: "eu", baseRevision: s.doc.revision, aiMode: "ACEITA" });
    const r = commit(s, patch, { now: T0, view: VIEW, autoReserve: true });
    if (!r.ok) throw new Error(JSON.stringify(r.denial));
    expect(shapeById(r.state.doc, "s-js2")!.geom).toMatchObject({ y: 290 });
    expect(shapeById(r.state.doc, "s-oculo")!.geom).toMatchObject({ cy: 200 });
    expect(r.state.log.at(-1)).toMatchObject({ kind: "PATCH", origin: "IA", aiMode: "ACEITA" });
    // as sugestões aceitas saem da lista de pendentes
    expect(pendingItems(setStatus(p, parts[0]!.itemIds, "ACEITA")).map((i) => i.suggestion.id)).not.toContain("ALINHAR:s-js2");
  });

  it("Assistido aplica só na seleção revisada; sem seleção → SEM_SELECAO; outro modo → MODO_NAO_PERMITE", () => {
    const s = fresh();
    const assisted = personalPolicy("ASSISTIDO");
    const p = createProposal(s, assisted, suggest(s.doc, VIEW), { id: "pr1", now: T0, requested: false });
    expect(assistedBatch(p, { ...ctx(s, assisted), selection: new Set() })).toEqual({ ok: false, reason: "SEM_SELECAO" });
    const r = assistedBatch(p, { ...ctx(s, assisted), selection: new Set(["s-js2", "s-oculo"]) });
    expect(r.ok && r.items.map((i) => i.suggestion.id)).toEqual(["ALINHAR:s-js2", "ENCAIXAR_GRADE:s-oculo"]);
    const sugg = personalPolicy("SUGESTOES");
    expect(assistedBatch({ ...p, policyVersion: sugg.version }, { ...ctx(s, sugg), selection: new Set(["s-js2"]) })).toEqual({ ok: false, reason: "MODO_NAO_PERMITE" });
  });

  it("validade por item usa proposalValidity (mesma regra do servidor)", () => {
    const s = fresh();
    const policy = personalPolicy("SUGESTOES");
    const p = createProposal(s, policy, suggest(s.doc, VIEW), { id: "pr1", now: T0, requested: false });
    expect(itemValidity(p, p.items[0]!, ctx(s, policy))).toEqual({ ok: true });
    expect(itemValidity(p, p.items[0]!, ctx(s, { ...policy, version: 9 }))).toMatchObject({ ok: false, denial: "PROPOSTA_OBSOLETA_POLITICA" });
  });
});
