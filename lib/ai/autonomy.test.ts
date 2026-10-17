import { describe, expect, it } from "vitest";
import {
  agentConnectors, AUTONOMY_MODES, changeMode, checkCharterConnectors, evaluateAiAction, proposalValidity, recordAgentStep, startAgentRun, stopAgentRun,
  type AgentCharter, type AiPolicy, type AiProposal, type SessionMember,
} from "./autonomy";

const NOW = new Date("2026-10-17T12:00:00Z");
const later = (min: number) => new Date(NOW.getTime() + min * 60_000);
const members: SessionMember[] = [
  { userId: "dono", role: "PROPRIETARIO" },
  { userId: "editor", role: "EDITOR" },
  { userId: "leitor", role: "LEITOR" },
];
const policy = (mode: AiPolicy["mode"], extra: Partial<AiPolicy> = {}): AiPolicy => ({ mode, version: 1, changedBy: "dono", changedAt: NOW.toISOString(), charter: null, ...extra });
const charter = (over: Partial<AgentCharter> = {}): AgentCharter => ({
  goal: "Fechar contornos abertos da camada de paredes", authorizedBy: "dono", scopeTargetIds: ["a", "b"], allowedTools: ["fechar_contorno"],
  maxSteps: 2, maxTokens: 1_000, expiresAt: later(60).toISOString(), connectorIds: [], ...over,
});
const proposal = (over: Partial<AiProposal> = {}): AiProposal => ({ id: "p1", policyVersion: 1, baseRevision: 7, targetIds: ["a"], reviewedBy: "dono", ...over });

describe("cada modo tem efeito concreto e distinto", () => {
  const matrix = (mode: AiPolicy["mode"]) => {
    const p = policy(mode);
    return {
      espontanea: evaluateAiAction(p, "SUGESTAO_ESPONTANEA", { requestedByUser: false }).ok,
      responde: evaluateAiAction(p, "RESPONDER", { requestedByUser: true }).ok,
      propoeSemPedido: evaluateAiAction(p, "PROPOR_ALTERACAO", { requestedByUser: false }).ok,
      propoePedido: evaluateAiAction(p, "PROPOR_ALTERACAO", { requestedByUser: true }).ok,
      aplica: evaluateAiAction(p, "APLICAR_ALTERACAO", { requestedByUser: true, proposal: proposal(), currentRevision: 7, editableIds: new Set(["a"]) }).ok,
    };
  };
  it("tabela de capacidades", () => {
    expect(matrix("MANUAL")).toEqual({ espontanea: false, responde: false, propoeSemPedido: false, propoePedido: false, aplica: false });
    expect(matrix("SOB_SOLICITACAO")).toEqual({ espontanea: false, responde: true, propoeSemPedido: false, propoePedido: true, aplica: false });
    expect(matrix("SUGESTOES")).toEqual({ espontanea: true, responde: true, propoeSemPedido: true, propoePedido: true, aplica: false });
    expect(matrix("ASSISTIDO")).toEqual({ espontanea: true, responde: true, propoeSemPedido: true, propoePedido: true, aplica: true });
    // nenhum par de modos é idêntico
    const sigs = new Set(AUTONOMY_MODES.map((m) => JSON.stringify(matrix(m)) + (m === "AGENTE" ? "+mandato" : "")));
    expect(sigs.size).toBe(AUTONOMY_MODES.length);
  });
  it("RESPONDER sem pedido explícito é negado mesmo quando o modo responde", () => {
    expect(evaluateAiAction(policy("SOB_SOLICITACAO"), "RESPONDER", { requestedByUser: false })).toEqual({ ok: false, reason: "SEM_PEDIDO_DO_USUARIO" });
  });
});

describe("Assistido: só após revisão, na seleção e sobre a mesma revisão", () => {
  const p = policy("ASSISTIDO");
  const base = { requestedByUser: true, currentRevision: 7, editableIds: new Set(["a"]) };
  it("exige revisão humana e seleção", () => {
    expect(evaluateAiAction(p, "APLICAR_ALTERACAO", { ...base, proposal: proposal({ reviewedBy: null }) })).toEqual({ ok: false, reason: "SEM_REVISAO_HUMANA" });
    expect(evaluateAiAction(p, "APLICAR_ALTERACAO", { ...base, editableIds: new Set(), proposal: proposal() })).toEqual({ ok: false, reason: "SEM_SELECAO" });
  });
  it("alvo fora da seleção, revisão alterada ou política trocada invalidam a proposta", () => {
    expect(proposalValidity(p, proposal({ targetIds: ["a", "z"] }), 7, new Set(["a"]))).toEqual({ ok: false, reason: "FORA_DO_ESCOPO" });
    expect(proposalValidity(p, proposal(), 8, new Set(["a"]))).toEqual({ ok: false, reason: "PROPOSTA_OBSOLETA_REVISAO" });
    expect(proposalValidity({ ...p, version: 2 }, proposal(), 7, new Set(["a"]))).toEqual({ ok: false, reason: "PROPOSTA_OBSOLETA_POLITICA" });
    expect(proposalValidity(p, proposal(), 7, new Set(["a"]))).toEqual({ ok: true });
  });
});

describe("troca de modo em sessão compartilhada", () => {
  it("só o proprietário troca; os demais participantes são avisados e a versão sobe", () => {
    expect(changeMode(policy("SUGESTOES"), members, "editor", "ASSISTIDO", NOW)).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    const r = changeMode(policy("SUGESTOES"), members, "dono", "ASSISTIDO", NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.policy).toMatchObject({ mode: "ASSISTIDO", version: 2, changedBy: "dono" });
    expect(r.notice).toMatchObject({ from: "SUGESTOES", to: "ASSISTIDO", notify: ["editor", "leitor"], policyVersion: 2 });
    // proposta gerada antes da troca não pode mais ser aplicada
    expect(proposalValidity(r.policy, proposal(), 7, new Set(["a"]))).toEqual({ ok: false, reason: "PROPOSTA_OBSOLETA_POLITICA" });
  });
  it("Agente exige mandato válido do próprio proprietário", () => {
    expect(changeMode(policy("ASSISTIDO"), members, "dono", "AGENTE", NOW)).toEqual({ ok: false, reason: "SEM_MANDATO" });
    expect(changeMode(policy("ASSISTIDO"), members, "dono", "AGENTE", NOW, charter({ authorizedBy: "editor" }))).toEqual({ ok: false, reason: "MANDATO_INVALIDO" });
    expect(changeMode(policy("ASSISTIDO"), members, "dono", "AGENTE", NOW, charter({ maxSteps: 0 }))).toEqual({ ok: false, reason: "MANDATO_INVALIDO" });
    expect(changeMode(policy("ASSISTIDO"), members, "dono", "AGENTE", NOW, charter({ expiresAt: later(60 * 24).toISOString() }))).toEqual({ ok: false, reason: "MANDATO_INVALIDO" });
    expect(changeMode(policy("ASSISTIDO"), members, "dono", "AGENTE", NOW, charter()).ok).toBe(true);
  });
});

describe("Agente: escopo, ferramentas, limites, registro e interrupção", () => {
  const agentPolicy = () => {
    const r = changeMode(policy("ASSISTIDO"), members, "dono", "AGENTE", NOW, charter());
    if (!r.ok) throw new Error(r.reason);
    return r.policy;
  };
  const step = (over: Partial<{ tool: string; targetIds: string[]; tokens: number }> = {}) => ({ tool: "fechar_contorno", targetIds: ["a"], tokens: 300, summary: "fechou", checkpointId: "cp", ...over });

  it("registra passos e para ao atingir o limite de passos", () => {
    const p = agentPolicy();
    const started = startAgentRun(p, NOW);
    if (!started.ok) throw new Error(started.reason);
    let run = started.run;
    for (let i = 0; i < 2; i++) {
      const r = recordAgentStep(p, run, step(), later(1));
      if (!r.ok) throw new Error(r.reason);
      run = r.run;
    }
    expect(run.steps.map((s) => s.n)).toEqual([1, 2]);
    const third = recordAgentStep(p, run, step(), later(2));
    expect(third).toMatchObject({ ok: false, reason: "LIMITE_DE_PASSOS" });
    expect(third.run.status).toBe("LIMITE_ATINGIDO");
  });
  it("nega ferramenta não permitida, alvo fora do escopo, excesso de tokens e mandato expirado", () => {
    const p = agentPolicy();
    const started = startAgentRun(p, NOW);
    if (!started.ok) throw new Error(started.reason);
    expect(recordAgentStep(p, started.run, step({ tool: "apagar_tudo" }), later(1))).toMatchObject({ ok: false, reason: "FERRAMENTA_NAO_PERMITIDA" });
    expect(recordAgentStep(p, started.run, step({ targetIds: ["c"] }), later(1))).toMatchObject({ ok: false, reason: "FORA_DO_ESCOPO" });
    expect(recordAgentStep(p, started.run, step({ tokens: 5_000 }), later(1))).toMatchObject({ ok: false, reason: "LIMITE_DE_TOKENS" });
    expect(recordAgentStep(p, started.run, step(), later(61))).toMatchObject({ ok: false, reason: "MANDATO_EXPIRADO" });
  });
  it("trocar o modo durante a execução encerra o agente; parar é imediato e restrito a quem edita", () => {
    const p = agentPolicy();
    const started = startAgentRun(p, NOW);
    if (!started.ok) throw new Error(started.reason);
    const back = changeMode(p, members, "dono", "SUGESTOES", later(1));
    if (!back.ok) throw new Error(back.reason);
    expect(recordAgentStep(back.policy, started.run, step(), later(2))).toMatchObject({ ok: false, reason: "EXECUCAO_ENCERRADA", run: { status: "INTERROMPIDO" } });

    expect(stopAgentRun(started.run, members, "leitor", later(1))).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    const stopped = stopAgentRun(started.run, members, "editor", later(1));
    if (!stopped.ok) throw new Error(stopped.reason);
    expect(stopped.run).toMatchObject({ status: "INTERROMPIDO", endedBy: "editor" });
    expect(recordAgentStep(p, stopped.run, step(), later(2))).toMatchObject({ ok: false, reason: "EXECUCAO_ENCERRADA" });
  });
  it("conectores: só os do autorizador e listados no mandato", () => {
    const byOwner = { dono: ["drive-dono"], editor: ["github-editor"] };
    expect(agentConnectors(charter({ connectorIds: ["drive-dono", "github-editor"] }), byOwner)).toEqual(["drive-dono"]);
    expect(checkCharterConnectors(charter({ connectorIds: ["github-editor"] }), byOwner)).toEqual({ ok: false, reason: "CONECTOR_DE_OUTRO_PARTICIPANTE" });
    expect(checkCharterConnectors(charter({ connectorIds: ["drive-dono"] }), byOwner)).toEqual({ ok: true });
  });
  it("modos sem mandato não executam passos nem iniciam agente", () => {
    expect(startAgentRun(policy("ASSISTIDO"), NOW)).toEqual({ ok: false, reason: "MODO_NAO_PERMITE" });
    expect(evaluateAiAction(policy("ASSISTIDO"), "EXECUTAR_PASSO", { requestedByUser: true })).toEqual({ ok: false, reason: "MODO_NAO_PERMITE" });
  });
});
