import { describe, expect, it } from "vitest";
import { AGENT_LIMITS, type AgentCharter } from "@/lib/ai/autonomy";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import type { MemorySearch } from "@/lib/memory/search";
import {
  canUndoTo, expandScope, fillSection, isSectionEmpty, nextAgentStep, pauseAgent, reconcileAgent, resumeAgent, runAgentStep, sectionHeading, sectionTarget,
  startSessionAgent, stopAgent, undoAgentTo, type AgentLabels, type AgentStepOutcome, type SessionAgentRun,
} from "./agent";
import { buildDemoOrgPolicy, buildDemoSessions, DEMO_SESSION_IDS } from "./fixtures";
import { editMinuta } from "./minuta";
import { MINUTA_TARGET, applyOrgCeiling, changeSessionMode } from "./policy";
import type { DeciaSession, OrgAiPolicy } from "./types";

const NOW = new Date("2026-11-12T15:00:00Z");
const later = (min: number) => new Date(NOW.getTime() + min * 60_000);
const ORG: OrgAiPolicy = { ...buildDemoOrgPolicy(NOW), ceiling: "AGENTE" };
const PASSAGE = "Os dados de cidadãos devem ser armazenados em território nacional.";
const search: MemorySearch = () => [{
  docId: "doc-1", kind: "PORTARIA", title: "Portaria 12/2025", department: "SECID", year: 2025, href: null, score: 0.8,
  passage: { text: PASSAGE, start: 0, end: PASSAGE.length }, citation: "Portaria 12/2025 — SECID, §3",
}];
const LABELS: AgentLabels = {
  section: { EVIDENCIAS: "Evidências", PERGUNTAS: "Perguntas", DECISOES: "Decisões", ENCAMINHAMENTOS: "Encaminhamentos", FONTES: "Fontes" },
  followUpProposal: (q) => `Proposta: responder “${q}”`,
  summary: (s, n) => `Seção ${s}: ${n}`,
  reason: (s, n) => `vazia ${s} ${n}`,
  formatDate: (d) => d,
};
const charter = (over: Partial<AgentCharter> = {}): AgentCharter => ({
  goal: "Completar a minuta com o que a sessão registrou", authorizedBy: "u-pessoa", scopeTargetIds: [MINUTA_TARGET],
  allowedTools: ["propor_minuta", "organizar_encaminhamentos", "citar_memoria"], maxSteps: 10, maxTokens: 20_000, expiresAt: later(120).toISOString(), connectorIds: [], ...over,
});
/** sessão "infraestrutura" no modo Agente (teto da organização AGENTE) com o mandato dado pela proprietária */
function agentSession(c: AgentCharter = charter()): DeciaSession {
  const s = buildDemoSessions(NOW).find((x) => x.id === DEMO_SESSION_IDS.infra)!;
  const r = changeSessionMode(s, ORG, "u-pessoa", "AGENTE", NOW, c, "m-mode");
  if (!r.ok) throw new Error(r.reason);
  return r.session;
}
function started(c: AgentCharter = charter()) {
  const r = startSessionAgent(agentSession(c), ORG, "u-pessoa", null, NOW, { run: "run1", message: "m-start" });
  if (!r.ok) throw new Error(r.reason);
  return r;
}
let msg = 0;
const step = (s: DeciaSession, run: SessionAgentRun, at = later(1), org: Pick<OrgAiPolicy, "ceiling"> = ORG) => runAgentStep(s, org, run, LABELS, DEMO_PEOPLE, at, `m${msg++}`, { search });
const applied = (o: AgentStepOutcome) => {
  if (o.kind !== "APLICADO") throw new Error(`esperava APLICADO, veio ${o.kind} ${"reason" in o ? o.reason : ""}`);
  return o;
};

describe("seções da minuta", () => {
  it("seção ausente ou sem linhas é vazia; preencher acrescenta no fim ou substitui o corpo, sem mexer no resto", () => {
    const h = sectionHeading("Perguntas");
    expect(isSectionEmpty("Texto", h)).toBe(true);
    expect(fillSection("Texto", h, ["a"])).toBe("Texto\n\n## Perguntas\n- a");
    expect(fillSection("", h, ["a"])).toBe("## Perguntas\n- a");
    const withEmpty = "Intro\n## Perguntas\n\n## Outra\n- x";
    expect(isSectionEmpty(withEmpty, h)).toBe(true);
    expect(fillSection(withEmpty, h, ["a", "b"])).toBe("Intro\n## Perguntas\n- a\n- b\n\n## Outra\n- x");
    expect(isSectionEmpty("## Perguntas\n- já tem", h)).toBe(false);
    expect(expandScope([MINUTA_TARGET])).toContain(sectionTarget("FONTES"));
    expect(expandScope([sectionTarget("PERGUNTAS")])).toEqual([sectionTarget("PERGUNTAS")]);
  });
});

describe("início da execução (startAgentRun + mandato)", () => {
  it("só no modo Agente efetivo, por quem autorizou ou pela proprietária; avisa os demais membros", () => {
    const plain = buildDemoSessions(NOW).find((x) => x.id === DEMO_SESSION_IDS.infra)!;
    expect(startSessionAgent(plain, ORG, "u-pessoa", null, NOW, { run: "r", message: "m" })).toEqual({ ok: false, reason: "MODO_NAO_PERMITE" });
    // teto da organização abaixo de Agente: o mandato fica inativo
    expect(startSessionAgent(agentSession(), { ceiling: "ASSISTIDO" }, "u-pessoa", null, NOW, { run: "r", message: "m" })).toEqual({ ok: false, reason: "MODO_NAO_PERMITE" });
    expect(startSessionAgent(agentSession(), ORG, "u-bruno", null, NOW, { run: "r", message: "m" })).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    const r = started();
    expect(r.run.core.status).toBe("EXECUTANDO");
    expect(r.run.core.policyVersion).toBe(r.session.policy.version);
    const notice = r.session.messages.at(-1)!;
    expect(notice.notice).toMatchObject({ kind: "AGENTE", event: "INICIADO", by: "u-pessoa" });
    expect(r.session.unread["u-elisa"]).toContain("m-start");
    expect(r.session.unread["u-pessoa"] ?? []).not.toContain("m-start");
    expect(startSessionAgent(r.session, ORG, "u-pessoa", r.run, NOW, { run: "r2", message: "m" })).toEqual({ ok: false, reason: "EXECUCAO_EM_ANDAMENTO" });
  });
  it("mandato com conector externo é recusado (a sessão DEMO não concede conexões)", () => {
    const s = agentSession();
    const withConn = { ...s, policy: { ...s.policy, charter: { ...s.policy.charter!, connectorIds: ["drive-da-carla"] } } };
    expect(startSessionAgent(withConn, ORG, "u-pessoa", null, NOW, { run: "r", message: "m" })).toEqual({ ok: false, reason: "CONECTOR_DE_OUTRO_PARTICIPANTE" });
  });
});

describe("passos: um por vez, com checkpoint, motivo e auditoria", () => {
  it("completa só seções vazias com fatos da sessão e cita a Memória; conclui quando não há mais o que fazer", () => {
    const { run, session } = started();
    const s1 = applied(step(session, run));
    expect(s1.step).toMatchObject({ n: 1, tool: "propor_minuta", section: "EVIDENCIAS", targetIds: [sectionTarget("EVIDENCIAS")], checkpointId: "run1-cp1", reason: "vazia EVIDENCIAS 1" });
    expect(s1.step.before).toBe(session.minuta.text);
    expect(s1.session.minuta.revision).toBe(session.minuta.revision + 1);
    expect(s1.session.minuta.text.startsWith(session.minuta.text)).toBe(true);
    expect(s1.session.minuta.text).toContain("## Evidências\n- Bruno");
    expect(s1.session.minuta.history.at(-1)).toMatchObject({ origin: "AGENTE", by: "u-pessoa" });
    // auditoria: antes/depois e quem autorizou o mandato
    expect(s1.audit).toMatchObject({
      action: "AGENTE_APLICOU", actorId: "u-pessoa", target: { kind: "PASSO_AGENTE", id: "run1-cp1" }, before: session.minuta.text, after: s1.session.minuta.text,
      policy: { mode: "AGENTE" }, agent: { runId: "run1", step: 1, tool: "propor_minuta", authorizedBy: "u-pessoa", tokens: s1.step.tokens },
    });
    const s2 = applied(step(s1.session, s1.run));
    expect(s2.step.section).toBe("PERGUNTAS");
    // sem ata ratificada, "Decisões" fica de fora (o agente não inventa)
    const s3 = applied(step(s2.session, s2.run));
    expect(s3.step).toMatchObject({ section: "ENCAMINHAMENTOS", tool: "organizar_encaminhamentos" });
    expect(s3.session.minuta.text).toContain("Proposta: responder “Alguém já calculou o custo de saída");
    const s4 = applied(step(s3.session, s3.run));
    expect(s4.step).toMatchObject({ section: "FONTES", tool: "citar_memoria" });
    expect(s4.session.minuta.text).toContain(`[1] Portaria 12/2025 — SECID, §3: “${PASSAGE}”`);
    expect(s4.run.core.tokensUsed).toBe([s1, s2, s3, s4].reduce((n, x) => n + x.step.tokens, 0));
    const end = step(s4.session, s4.run);
    expect(end).toMatchObject({ kind: "ENCERRADO", reason: "OBJETIVO_CONCLUIDO", run: { core: { status: "CONCLUIDO" } } });
    if (end.kind === "ENCERRADO") {
      expect(end.session.minuta).toBe(s4.session.minuta);
      expect(end.session.messages.at(-1)!.notice).toMatchObject({ kind: "AGENTE", event: "CONCLUIDO", steps: 4 });
    }
  });

  it("escopo e ferramentas do mandato: só a seção do escopo e só com as ferramentas concedidas", () => {
    const { run, session } = started(charter({ scopeTargetIds: [sectionTarget("PERGUNTAS"), sectionTarget("FONTES")], allowedTools: ["propor_minuta"] }));
    const s1 = applied(step(session, run));
    expect(s1.step.section).toBe("PERGUNTAS");
    // FONTES está no escopo mas citar_memoria não foi concedida
    expect(step(s1.session, s1.run)).toMatchObject({ kind: "ENCERRADO", reason: "OBJETIVO_CONCLUIDO" });
    expect(nextAgentStep(session, { allowedTools: ["citar_memoria"], scopeTargetIds: [sectionTarget("EVIDENCIAS")] }, LABELS, DEMO_PEOPLE, { search })).toBeNull();
  });

  it("pausado não avança; só controla quem autorizou, a proprietária ou editores; retomar é de quem autorizou ou da proprietária", () => {
    const { run, session } = started();
    expect(pauseAgent(session, run, "u-diego")).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    const p = pauseAgent(session, run, "u-bruno");
    if (!p.ok) throw new Error();
    expect(step(session, p.run)).toEqual({ kind: "NEGADO", reason: "AGENTE_PAUSADO" });
    expect(resumeAgent(session, p.run, "u-bruno")).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    const r = resumeAgent(session, p.run, "u-pessoa");
    expect(r.ok && r.run.paused).toBe(false);
  });

  it("interromper: comentador não pode; editor pode e os membros são avisados; depois nenhum passo roda", () => {
    const { run, session } = started();
    expect(stopAgent(session, run, "u-diego", later(1), "m")).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    const s = stopAgent(session, run, "u-bruno", later(1), "m-stop");
    if (!s.ok) throw new Error();
    expect(s.run).toMatchObject({ endReason: "PARADO_POR_PESSOA", core: { status: "INTERROMPIDO", endedBy: "u-bruno" } });
    expect(s.session.messages.at(-1)!.notice).toMatchObject({ kind: "AGENTE", event: "INTERROMPIDO", by: "u-bruno" });
    expect(s.session.unread["u-pessoa"]).toContain("m-stop");
    expect(step(s.session, s.run)).toEqual({ kind: "NEGADO", reason: "EXECUCAO_ENCERRADA" });
  });
});

describe("limites do mandato e do AGENT_LIMITS: LIMITE_ATINGIDO sem aplicar o passo", () => {
  it("passos: com maxSteps = 1, o segundo passo para a execução e a minuta não muda", () => {
    const { run, session } = started(charter({ maxSteps: 1 }));
    const s1 = applied(step(session, run));
    const s2 = step(s1.session, s1.run, later(2));
    expect(s2).toMatchObject({ kind: "ENCERRADO", reason: "LIMITE_DE_PASSOS", run: { core: { status: "LIMITE_ATINGIDO", steps: [{ n: 1 }] } } });
    if (s2.kind === "ENCERRADO") {
      expect(s2.session.minuta).toBe(s1.session.minuta);
      expect(s2.session.messages.at(-1)!.notice).toMatchObject({ event: "LIMITE_ATINGIDO", reason: "LIMITE_DE_PASSOS" });
    }
  });
  it("tokens: um passo que estouraria o orçamento não é aplicado", () => {
    const { run, session } = started(charter({ maxTokens: 100 }));
    const s = step(session, run);
    expect(s).toMatchObject({ kind: "ENCERRADO", reason: "LIMITE_DE_TOKENS", run: { core: { status: "LIMITE_ATINGIDO", tokensUsed: 0, steps: [] } } });
    if (s.kind === "ENCERRADO") expect(s.session.minuta).toBe(session.minuta);
  });
  it("prazo: mandato vencido para a execução; o teto de horas do AGENT_LIMITS vale mesmo se o mandato for adulterado", () => {
    const { run, session } = started(charter({ expiresAt: later(30).toISOString() }));
    expect(step(session, run, later(31))).toMatchObject({ kind: "ENCERRADO", reason: "MANDATO_EXPIRADO", run: { core: { status: "LIMITE_ATINGIDO" } } });
    const tampered = { ...run, charter: { ...run.charter, expiresAt: later(60 * 24).toISOString() }, core: { ...run.core, charter: { ...run.core.charter, expiresAt: later(60 * 24).toISOString() } } };
    expect(step(session, tampered, later(AGENT_LIMITS.maxHours * 60))).toMatchObject({ kind: "ENCERRADO", reason: "MANDATO_EXPIRADO" });
  });
  it("passos do sistema: mesmo com mandato adulterado acima de 50 passos, o teto AGENT_LIMITS para", () => {
    const { run, session } = started();
    const fake = Array.from({ length: AGENT_LIMITS.maxSteps }, (_, i) => ({ n: i + 1, tool: "propor_minuta", targetIds: [sectionTarget("PERGUNTAS")], tokens: 1, summary: "", at: NOW.toISOString(), checkpointId: `x${i}` }));
    const tampered = { ...run, charter: { ...run.charter, maxSteps: 999 }, core: { ...run.core, steps: fake, tokensUsed: fake.length, charter: { ...run.core.charter, maxSteps: 999 } } };
    expect(step(session, tampered)).toMatchObject({ kind: "ENCERRADO", reason: "LIMITE_DE_PASSOS" });
  });
});

describe("troca de política ou de mandato encerra a execução (INTERROMPIDO) e avisa os membros", () => {
  it("trocar o modo: reconcileAgent encerra na hora; o passo seguinte também não roda", () => {
    const { run, session } = started();
    const s1 = applied(step(session, run));
    const changed = changeSessionMode(s1.session, ORG, "u-pessoa", "SUGESTOES", later(2), null, "m-mode2");
    if (!changed.ok) throw new Error(changed.reason);
    const r = reconcileAgent(changed.session, ORG, s1.run, later(2), "m-end");
    expect(r?.run).toMatchObject({ endReason: "POLITICA_ALTERADA", core: { status: "INTERROMPIDO", endedBy: "SISTEMA", steps: [{ n: 1 }] } });
    expect(r?.session.messages.at(-1)!.notice).toMatchObject({ kind: "AGENTE", event: "INTERROMPIDO", reason: "POLITICA_ALTERADA" });
    expect(r?.session.unread["u-pessoa"]).toContain("m-end");
    expect(step(changed.session, s1.run, later(3))).toMatchObject({ kind: "ENCERRADO", reason: "POLITICA_ALTERADA", run: { core: { status: "INTERROMPIDO" } } });
    // sem mudança, nada a reconciliar
    expect(reconcileAgent(s1.session, ORG, s1.run, later(2), "m")).toBeNull();
  });
  it("novo mandato (mesmo modo Agente) e teto da organização rebaixado também encerram", () => {
    const { run, session } = started();
    const again = changeSessionMode(session, ORG, "u-pessoa", "AGENTE", later(1), charter({ maxSteps: 3 }), "m");
    if (!again.ok) throw new Error(again.reason);
    expect(reconcileAgent(again.session, ORG, run, later(1), "m")?.run.core.status).toBe("INTERROMPIDO");
    const lowered = applyOrgCeiling(session, ORG, { ceiling: "ASSISTIDO" }, "org:ADMIN", later(1), "m");
    expect(reconcileAgent(lowered.session, { ceiling: "ASSISTIDO" }, run, later(1), "m")?.run.endReason).toBe("POLITICA_ALTERADA");
  });
});

describe("desfazer até um checkpoint", () => {
  it("volta ao texto de antes do passo (revisão nova, nada apagado), marca os passos desfeitos, pausa e não refaz", () => {
    const { run, session } = started();
    const s1 = applied(step(session, run));
    const s2 = applied(step(s1.session, s1.run));
    expect(undoAgentTo(s2.session, ORG, s2.run, "u-elisa", 1, null, later(3))).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    expect(undoAgentTo(s2.session, ORG, s2.run, "u-bruno", 9, null, later(3))).toEqual({ ok: false, reason: "CHECKPOINT_INEXISTENTE" });
    expect(canUndoTo(s2.session, s2.run, 1)).toBe(true);
    const u = undoAgentTo(s2.session, ORG, s2.run, "u-bruno", 1, "Revisar à mão", later(3));
    if (!u.ok) throw new Error(u.reason);
    expect(u.undone).toBe(2);
    expect(u.session.minuta.text).toBe(session.minuta.text);
    expect(u.session.minuta.revision).toBe(s2.session.minuta.revision + 1);
    expect(u.session.minuta.history.at(-1)).toMatchObject({ origin: "AGENTE_DESFEITO", by: "u-bruno", revertedFrom: s2.session.minuta.revision });
    expect(u.session.minuta.history).toHaveLength(s2.session.minuta.history.length + 1);
    expect(u.run.steps.every((s) => s.undoneAt && s.undoneBy === "u-bruno")).toBe(true);
    expect(u.run.paused).toBe(true);
    expect(u.audit).toMatchObject({ action: "REVERTEU", actorId: "u-bruno", reason: "Revisar à mão", before: s2.session.minuta.text, after: session.minuta.text, agent: { step: 1, authorizedBy: "u-pessoa" } });
    // retomado, o agente não refaz as seções desfeitas
    const resumed = resumeAgent(u.session, u.run, "u-pessoa");
    if (!resumed.ok) throw new Error();
    const next = applied(step(u.session, resumed.run, later(4)));
    expect(next.step.section).toBe("ENCAMINHAMENTOS");
    expect(next.step.n).toBe(3);
  });
  it("se alguém editou a minuta depois do último passo, desfazer é recusado", () => {
    const { run, session } = started();
    const s1 = applied(step(session, run));
    const edited = editMinuta(s1.session, "u-carla", `${s1.session.minuta.text}\nNota da Carla.`, later(2));
    if (!edited.ok) throw new Error();
    expect(canUndoTo(edited.session, s1.run, 1)).toBe(false);
    expect(undoAgentTo(edited.session, ORG, s1.run, "u-carla", 1, null, later(3))).toEqual({ ok: false, reason: "MINUTA_MUDOU_DEPOIS" });
  });
});
