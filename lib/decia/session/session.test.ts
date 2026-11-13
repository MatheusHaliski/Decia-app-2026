import { describe, expect, it } from "vitest";
import { proposalValidity, type AgentCharter } from "@/lib/ai/autonomy";
import type { MemorySearch } from "@/lib/memory/search";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { askAi, composeAnswer, factIntents, spontaneousAnswer } from "./assistant";
import { acceptAnswer, confirmEvidence, markNoticesRead, postMessage, safeHref, similarity, toggleReaction, unreadFor } from "./chat";
import { buildDemoOrgPolicy, buildDemoSessions, DEMO_SESSION_IDS } from "./fixtures";
import { canTransition, isChatOpen, reasonRequired, SESSION_TRANSITIONS, transitionSession } from "./machine";
import {
  aiVisibility, applyOrgCeiling, changeOrgPolicy, changeSessionMode, effectivePolicy, initialSessionPolicy, mostRestrictive, proposalView, validateOrgPolicy, viewerMode,
} from "./policy";
import { can, ROLE_ACTIONS, roleCan } from "./roles";
import { SESSION_STATUSES, type DeciaSession } from "./types";

const NOW = new Date("2026-11-12T15:00:00Z");
const later = (min: number) => new Date(NOW.getTime() + min * 60_000);
const sessions = () => Object.fromEntries(buildDemoSessions(NOW).map((s) => [s.id, s])) as Record<string, DeciaSession>;
const infra = () => sessions()[DEMO_SESSION_IDS.infra]!;
const ORG = buildDemoOrgPolicy(NOW); // teto ASSISTIDO, padrão SOB_SOLICITACAO

describe("máquina de estados da sessão (§A.1)", () => {
  it("12 estados, terminais sem saída e caminho feliz RASCUNHO → … → ARQUIVADA", () => {
    expect(SESSION_STATUSES).toHaveLength(12);
    expect(SESSION_TRANSITIONS.ARQUIVADA).toEqual([]);
    expect(SESSION_TRANSITIONS.CANCELADA).toEqual([]);
    const path = ["RASCUNHO", "AGENDADA", "ABERTA", "CONVERGINDO", "DECISAO_PROPOSTA", "EM_REVISAO", "VALIDADA", "ENCERRADA", "ARQUIVADA"] as const;
    for (let i = 0; i < path.length - 1; i++) expect(canTransition(path[i]!, path[i + 1]!), `${path[i]} → ${path[i + 1]}`).toBe(true);
    expect(canTransition("ABERTA", "VALIDADA")).toBe(false);
    expect(canTransition("EM_REVISAO", "DEVOLVIDA") && canTransition("DEVOLVIDA", "REABERTA") && canTransition("REABERTA", "CONVERGINDO")).toBe(true);
  });
  it("chat só em ABERTA/REABERTA; motivo obrigatório para cancelar, devolver e encerrar sem decisão", () => {
    expect(SESSION_STATUSES.filter(isChatOpen)).toEqual(["ABERTA", "REABERTA"]);
    expect(reasonRequired("ABERTA", "ENCERRADA")).toBe(true);
    expect(reasonRequired("VALIDADA", "ENCERRADA")).toBe(false);
    expect(reasonRequired("EM_REVISAO", "DEVOLVIDA")).toBe(true);
  });
  it("só o proprietário muda o estado; transição inválida e falta de motivo são recusadas; aviso no chat", () => {
    const s = infra();
    expect(transitionSession(s, "u-bruno", "CONVERGINDO", null, NOW, "x")).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    expect(transitionSession(s, "u-pessoa", "VALIDADA", null, NOW, "x")).toEqual({ ok: false, reason: "TRANSICAO_INVALIDA" });
    expect(transitionSession(s, "u-pessoa", "ENCERRADA", "ok", NOW, "x")).toEqual({ ok: false, reason: "MOTIVO_OBRIGATORIO" });
    const r = transitionSession(s, "u-pessoa", "CONVERGINDO", null, NOW, "msg-1");
    if (!r.ok) throw new Error(r.reason);
    expect(r.session).toMatchObject({ status: "CONVERGINDO", phase: "DECIDIR" });
    expect(r.session.statusLog.at(-1)).toMatchObject({ from: "ABERTA", to: "CONVERGINDO", by: "u-pessoa" });
    expect(r.message.notice).toMatchObject({ kind: "ESTADO_ALTERADO", from: "ABERTA", to: "CONVERGINDO" });
  });
});

describe("papéis", () => {
  it("PROPRIETARIO faz tudo; EDITOR delibera mas não troca modo nem estado; COMENTADOR pergunta e reage; LEITOR só lê", () => {
    expect(roleCan("PROPRIETARIO", "TROCAR_MODO")).toBe(true);
    expect(roleCan("EDITOR", "TROCAR_MODO") || roleCan("EDITOR", "MUDAR_ESTADO")).toBe(false);
    expect(roleCan("EDITOR", "ENVIAR_EVIDENCIA")).toBe(true);
    expect(ROLE_ACTIONS.COMENTADOR).toEqual(["LER", "PERGUNTAR", "REAGIR", "PERGUNTAR_IA", "RATIFICAR_ATA", "CONTESTAR_ATA"]);
    expect(ROLE_ACTIONS.LEITOR).toEqual(["LER"]);
    expect(can(infra(), "u-desconhecido", "LER")).toBe(false);
  });
});

describe("autonomia da IA na sessão (RF51, D-136, D-156)", () => {
  it("modo efetivo = o mais restritivo entre teto da organização, sessão e preferência pessoal", () => {
    expect(mostRestrictive("AGENTE", "SUGESTOES", "ASSISTIDO")).toBe("SUGESTOES");
    const s = infra(); // sessão em SUGESTOES, teto ASSISTIDO
    expect(viewerMode(s, ORG, "AGENTE")).toMatchObject({ mode: "SUGESTOES", limitedBy: ["SESSAO"] });
    expect(viewerMode(s, ORG, "SOB_SOLICITACAO")).toMatchObject({ mode: "SOB_SOLICITACAO", limitedBy: ["PESSOAL"] });
    expect(viewerMode(s, { ceiling: "MANUAL" }, "AGENTE")).toMatchObject({ mode: "MANUAL", limitedBy: ["ORGANIZACAO"] });
    expect(viewerMode({ policy: { ...s.policy, mode: "ASSISTIDO" } }, ORG, "ASSISTIDO").limitedBy).toEqual(["ORGANIZACAO", "SESSAO", "PESSOAL"]);
    expect(effectivePolicy({ policy: { ...s.policy, mode: "AGENTE" } }, ORG).mode).toBe("ASSISTIDO");
  });

  it("troca de modo: só o proprietário, nunca acima do teto; aviso do sistema a todos os outros membros com selo de não lido", () => {
    const s = infra();
    expect(changeSessionMode(s, ORG, "u-bruno", "ASSISTIDO", NOW, null, "m")).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    expect(changeSessionMode(s, ORG, "u-pessoa", "AGENTE", NOW, null, "m")).toEqual({ ok: false, reason: "ACIMA_DO_TETO" });
    expect(changeSessionMode(s, ORG, "u-pessoa", "SUGESTOES", NOW, null, "m")).toEqual({ ok: false, reason: "SEM_ALTERACAO" });
    const r = changeSessionMode(s, ORG, "u-pessoa", "ASSISTIDO", NOW, null, "aviso-1");
    if (!r.ok) throw new Error(r.reason);
    expect(r.session.policy).toMatchObject({ mode: "ASSISTIDO", version: 3, changedBy: "u-pessoa" });
    expect(r.message).toMatchObject({ kind: "SISTEMA", notice: { kind: "MODO_ALTERADO", from: "SUGESTOES", to: "ASSISTIDO", policyVersion: 3, invalidated: 1 } });
    for (const u of ["u-bruno", "u-carla", "u-diego", "u-elisa"]) expect(unreadFor(r.session, u)).toContain("aviso-1");
    expect(unreadFor(r.session, "u-pessoa")).toEqual([]);
    expect(unreadFor(markNoticesRead(r.session, "u-diego"), "u-diego")).toEqual([]);
  });

  it("proposta calculada na política anterior fica OBSOLETA (não aplicável) com o motivo", () => {
    const s = infra();
    const pending = s.proposals.find((p) => p.id.endsWith("p-new"))!;
    const old = s.proposals.find((p) => p.id.endsWith("p-old"))!;
    expect(proposalView(s, ORG, pending)).toEqual({ state: "PENDENTE" });
    expect(proposalView(s, ORG, old)).toEqual({ state: "OBSOLETA", reason: "PROPOSTA_OBSOLETA_POLITICA" });
    const r = changeSessionMode(s, ORG, "u-pessoa", "SOB_SOLICITACAO", NOW, null, "a");
    if (!r.ok) throw new Error(r.reason);
    expect(proposalView(r.session, ORG, pending)).toEqual({ state: "OBSOLETA", reason: "PROPOSTA_OBSOLETA_POLITICA" });
    expect(proposalValidity(effectivePolicy(r.session, ORG), pending, r.session.minuta.revision, new Set(["minuta"])).ok).toBe(false);
  });

  it("AGENTE exige mandato válido do próprio proprietário (quando o teto permite)", () => {
    const s = infra();
    const org = { ceiling: "AGENTE" as const };
    const charter: AgentCharter = { goal: "Manter a minuta atualizada com as evidências", authorizedBy: "u-pessoa", scopeTargetIds: ["minuta"], allowedTools: ["atualizar_minuta"], maxSteps: 5, maxTokens: 10_000, expiresAt: later(60).toISOString(), connectorIds: [] };
    expect(changeSessionMode(s, org, "u-pessoa", "AGENTE", NOW, null, "m")).toEqual({ ok: false, reason: "SEM_MANDATO" });
    expect(changeSessionMode(s, org, "u-pessoa", "AGENTE", NOW, { ...charter, maxSteps: 99 }, "m")).toEqual({ ok: false, reason: "MANDATO_INVALIDO" });
    const r = changeSessionMode(s, org, "u-pessoa", "AGENTE", NOW, charter, "m");
    expect(r.ok && r.session.policy.charter?.goal).toBe(charter.goal);
  });

  it("teto da organização: só ADMIN/EMPRESA editam; padrão nunca acima do teto nem AGENTE; aplicar o teto avisa todos e invalida", () => {
    expect(changeOrgPolicy(ORG, "CHEFE", "x", { ceiling: "SUGESTOES", defaultMode: "MANUAL" }, NOW)).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    expect(validateOrgPolicy({ ceiling: "SUGESTOES", defaultMode: "ASSISTIDO" })).toEqual({ ok: false, reason: "PADRAO_ACIMA_DO_TETO" });
    expect(validateOrgPolicy({ ceiling: "AGENTE", defaultMode: "AGENTE" })).toEqual({ ok: false, reason: "PADRAO_AGENTE_PROIBIDO" });
    const r = changeOrgPolicy(ORG, "EMPRESA", "org:EMPRESA", { ceiling: "SOB_SOLICITACAO", defaultMode: "MANUAL" }, NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.org).toMatchObject({ ceiling: "SOB_SOLICITACAO", version: 2, changedBy: "org:EMPRESA" });
    expect(r.org.history).toHaveLength(2);
    const s = infra();
    const applied = applyOrgCeiling(s, ORG, r.org, "org:EMPRESA", NOW, "teto-1");
    expect(applied.session.policy).toMatchObject({ mode: "SUGESTOES", version: 3 }); // o modo configurado fica; o efetivo cai
    expect(effectivePolicy(applied.session, r.org).mode).toBe("SOB_SOLICITACAO");
    expect(applied.message.notice).toMatchObject({ kind: "TETO_ALTERADO", before: "SUGESTOES", after: "SOB_SOLICITACAO", invalidated: 1 });
    expect(Object.keys(applied.session.unread).sort()).toEqual(["u-bruno", "u-carla", "u-diego", "u-elisa", "u-pessoa"]);
    expect(applied.session.proposals.every((p) => proposalView(applied.session, r.org, p).state !== "PENDENTE")).toBe(true);
    expect(initialSessionPolicy(r.org, "u-ana", NOW)).toMatchObject({ mode: "MANUAL", version: 1 });
  });

  it("o que cada pessoa vê da IA: Manual oculta, Sob solicitação mostra só o que pediu (o resto sob pedido), Sugestões mostra tudo", () => {
    const p = (mode: "MANUAL" | "SOB_SOLICITACAO" | "SUGESTOES") => ({ mode, version: 1, changedBy: "x", changedAt: NOW.toISOString(), charter: null });
    expect(aiVisibility(p("MANUAL"), "u-ana", "u-ana")).toBe("OCULTA");
    expect(aiVisibility(p("SOB_SOLICITACAO"), "u-ana", "u-ana")).toBe("VISIVEL");
    expect(aiVisibility(p("SOB_SOLICITACAO"), null, "u-ana")).toBe("SOB_PEDIDO");
    expect(aiVisibility(p("SUGESTOES"), null, "u-ana")).toBe("VISIVEL");
  });
});

describe("chat: mensagens, evidências, perguntas e reações", () => {
  it("permissões por papel e estado; evidência exige referência; endereço inseguro recusado", () => {
    const s = infra();
    expect(postMessage(s, "u-elisa", { kind: "MENSAGEM", text: "Oi" }, NOW, "m")).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    expect(postMessage(s, "u-diego", { kind: "MENSAGEM", text: "Oi" }, NOW, "m")).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    expect(postMessage(s, "u-diego", { kind: "PERGUNTA", text: "Qual o custo?" }, NOW, "m").ok).toBe(true);
    expect(postMessage(s, "u-bruno", { kind: "EVIDENCIA", text: "Evidência sem fonte nenhuma aqui." }, NOW, "m")).toEqual({ ok: false, reason: "REFERENCIA_OBRIGATORIA" });
    expect(postMessage(s, "u-bruno", { kind: "EVIDENCIA", text: "x", reference: { kind: "LINK", label: "x", href: "javascript:alert(1)" } }, NOW, "m")).toEqual({ ok: false, reason: "REFERENCIA_INVALIDA" });
    expect(postMessage(s, "u-bruno", { kind: "RESPOSTA", text: "Sim", replyTo: "nao-existe" }, NOW, "m")).toEqual({ ok: false, reason: "RESPOSTA_SEM_PERGUNTA" });
    expect(postMessage({ ...s, status: "CONVERGINDO" }, "u-bruno", { kind: "MENSAGEM", text: "Oi" }, NOW, "m")).toEqual({ ok: false, reason: "SESSAO_NAO_ATIVA" });
    expect(safeHref("/tasks/1")).toBe("/tasks/1");
    expect(safeHref("//evil.example")).toBe(false);
  });

  it("argumento com evidência confirmado gera intenção de ARGUMENTO_EVIDENCIA; curto ou repetido não", () => {
    const s = infra();
    const ref = { kind: "DOCUMENTO" as const, label: "Planilha de custos (financeiro)", href: null };
    const ok = postMessage(s, "u-carla", { kind: "EVIDENCIA", text: "A planilha do financeiro mostra que C custa R$ 84 mil por ano.", reference: ref }, NOW, "m1");
    expect(ok.ok && ok.points).toMatchObject({ userId: "u-carla", event: "ARGUMENTO_EVIDENCIA", ref: { type: "MENSAGEM", id: "m1" }, sessionId: s.id });
    const repeated = s.messages.find((m) => m.kind === "EVIDENCIA")!.text;
    expect(confirmEvidence(repeated, ref, [repeated])).toEqual({ ok: false, reason: "REPETIDA" });
    expect(confirmEvidence("curta", ref, [])).toEqual({ ok: false, reason: "TEXTO_CURTO" });
    expect(similarity("O teste de carga passou", "o TESTE de carga passou")).toBe(1);
  });

  it("pergunta respondida: só quem perguntou (ou o proprietário) aceita; pontua quem respondeu, uma vez", () => {
    const s = infra();
    const q = s.messages.find((m) => m.kind === "PERGUNTA" && m.author.kind === "PESSOA" && m.author.userId === "u-carla")!;
    const a = s.messages.find((m) => m.replyTo === q.id)!;
    expect(acceptAnswer(s, "u-diego", q.id, a.id)).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    const r = acceptAnswer(s, "u-carla", q.id, a.id);
    if (!r.ok) throw new Error(r.reason);
    expect(r.points).toMatchObject({ userId: "u-bruno", event: "PERGUNTA_RESPONDIDA", ref: { type: "PERGUNTA", id: q.id } });
    expect(acceptAnswer(r.session, "u-carla", q.id, a.id)).toEqual({ ok: false, reason: "JA_RESPONDIDA" });
  });

  it("reações de qualidade: liga/desliga, sem auto-reação, leitor não reage, nunca pontuam", () => {
    const s = infra();
    const msg = s.messages.find((m) => m.kind === "EVIDENCIA")!; // de u-bruno
    expect(toggleReaction(s, "u-bruno", msg.id, "UTIL")).toEqual({ ok: false, reason: "AUTO_REACAO" });
    expect(toggleReaction(s, "u-elisa", msg.id, "UTIL")).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    const on = toggleReaction(s, "u-diego", msg.id, "UTIL");
    if (!on.ok) throw new Error(on.reason);
    expect(on.on).toBe(true);
    const off = toggleReaction(on.session, "u-diego", msg.id, "UTIL");
    expect(off.ok && off.on).toBe(false);
    expect(Object.keys(on)).not.toContain("points");
  });
});

describe("IA do DECIA: só fatos do sistema e trechos exatos da Memória", () => {
  const body = "Portaria 12/2025. §3 Os dados de cidadãos devem ser armazenados em território nacional. §4 Outras regras.";
  const start = body.indexOf("Os dados");
  const end = body.indexOf("nacional.") + "nacional.".length;
  const search: MemorySearch = (q) => (/dados|regi[aã]o/i.test(q) ? [{
    docId: "doc-1", kind: "PORTARIA", title: "Portaria 12/2025", department: "SECID", year: 2025, href: "/memory?doc=doc-1", score: 0.8,
    passage: { text: body.slice(start, end), start, end }, citation: "Portaria 12/2025 — SECID, §3",
  }] : []);

  it("com fonte: citações numeradas com o trecho exato (sem nada além do trecho)", () => {
    const a = composeAnswer("Os dados podem ficar fora do país?", infra(), DEMO_PEOPLE, { search });
    expect(a.citations).toEqual([{ n: 1, docId: "doc-1", kind: "PORTARIA", title: "Portaria 12/2025", citation: "Portaria 12/2025 — SECID, §3", passage: "Os dados de cidadãos devem ser armazenados em território nacional.", href: "/memory?doc=doc-1" }]);
    expect(body.slice(start, end)).toBe(a.citations[0]!.passage);
  });
  it("sem fonte e sem fato: resposta vazia (a tela diz que não encontrou)", () => {
    const a = composeAnswer("Qual o melhor time de futebol?", infra(), DEMO_PEOPLE, { search: () => [] });
    expect(a).toEqual({ query: "Qual o melhor time de futebol?", citations: [], facts: [] });
  });
  it("fatos da sessão calculados (perguntas abertas, evidências)", () => {
    expect(factIntents("Quais perguntas estão abertas?")).toEqual(["PERGUNTAS_ABERTAS"]);
    const a = composeAnswer("Quais perguntas estão abertas e quais evidências temos?", infra(), DEMO_PEOPLE, { search: () => [] });
    expect(a.facts.map((f) => f.key)).toEqual(["PERGUNTAS_ABERTAS", "EVIDENCIAS"]);
    expect(a.facts[0]).toMatchObject({ n: 2 });
  });
  it("perguntar à IA respeita o modo efetivo de quem pergunta (Manual recusa)", () => {
    const s = infra();
    const manual = { ...s.policy, mode: "MANUAL" as const };
    expect(askAi(s, "u-bruno", manual, "dados?", DEMO_PEOPLE, NOW, { question: "q", answer: "a" }, { search })).toEqual({ ok: false, reason: "MODO_NAO_PERMITE" });
    const r = askAi(s, "u-bruno", s.policy, "Onde devem ficar os dados?", DEMO_PEOPLE, NOW, { question: "q", answer: "a" }, { search });
    if (!r.ok) throw new Error(r.reason);
    expect(r.question).toMatchObject({ kind: "PERGUNTA", toAi: true });
    expect(r.answer).toMatchObject({ kind: "RESPOSTA", author: { kind: "IA" }, replyTo: "q", requestedBy: "u-bruno" });
    expect(r.answer.ai!.citations).toHaveLength(1);
  });
  it("sugestão espontânea só com iniciativa permitida e só com fonte", () => {
    const s = infra();
    const q = { id: "q1", kind: "PERGUNTA" as const, author: { kind: "PESSOA" as const, userId: "u-carla" }, at: NOW.toISOString(), text: "E a região dos dados?", reactions: {} };
    expect(spontaneousAnswer(s, s.policy, q, DEMO_PEOPLE, NOW, "a", { search })?.answer.requestedBy).toBeNull();
    expect(spontaneousAnswer(s, { ...s.policy, mode: "SOB_SOLICITACAO" }, q, DEMO_PEOPLE, NOW, "a", { search })).toBeNull();
    expect(spontaneousAnswer(s, s.policy, q, DEMO_PEOPLE, NOW, "a", { search: () => [] })).toBeNull();
  });
});
