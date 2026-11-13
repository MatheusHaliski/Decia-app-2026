/**
 * Sessões DEMO (fictícias) ligadas às decisões DEMO de lib/decia/fixtures.ts — mesmas pessoas ("Ana Exemplo"…), datas
 * relativas a `now`. Três situações: uma sessão ABERTA com a política de IA trocada há um dia (uma proposta obsoleta e uma
 * válida, um aviso não lido), uma sessão VALIDADA com ata ratificada e encaminhamentos, e uma AGENDADA com a IA em Manual.
 * Também os registros iniciais da trilha de auditoria (coerentes com essas sessões). A API ainda não existe: tudo vive só na
 * memória da aba.
 */
import { DEMO_CURRENT_USER_ID, DEMO_DECISION_IDS } from "@/lib/decia/fixtures";
import type { AuditInput } from "@/lib/decia/audit/types";
import type { DeciaSession, Meeting, MinutesDraft, OrgAiPolicy, SessionMessage } from "./types";

export const DEMO_SESSION_IDS = { infra: "s-infraestrutura", fornecedor: "s-fornecedor", sprint: "s-sprint-5" } as const;
export const NEW_SESSION_PREFIX = "s-nova-";
export const isKnownSessionId = (id: string) =>
  (Object.values(DEMO_SESSION_IDS) as string[]).includes(id) || (id.startsWith(NEW_SESSION_PREFIX) && /^[a-z0-9-]{8,80}$/.test(id));

/** Rótulo de quem muda a política da organização (o perfil, não uma pessoa: ADMIN ou EMPRESA). */
export const orgActor = (profile: "ADMIN" | "EMPRESA") => `org:${profile}`;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const at = (now: Date, ms: number) => new Date(now.getTime() + ms).toISOString();
const dateOnly = (now: Date, days: number) => new Date(now.getTime() + days * DAY).toISOString().slice(0, 10);
const sys = (id: string, when: string, notice: SessionMessage["notice"]): SessionMessage => ({ id, kind: "SISTEMA", author: { kind: "SISTEMA" }, at: when, text: "", reactions: {}, notice });

export function buildDemoOrgPolicy(now: Date): OrgAiPolicy {
  const v1 = { ceiling: "ASSISTIDO" as const, defaultMode: "SOB_SOLICITACAO" as const, version: 1, changedBy: orgActor("ADMIN"), changedAt: at(now, -30 * DAY) };
  return { ...v1, history: [v1] };
}

/* ── 1. Infraestrutura (ABERTA, fase Esclarecer) ─────────────────────────────────────────────────────────── */

const INFRA_BASE = "Minuta da sessão — infraestrutura\n\nContexto: o plano atual atinge o limite de conexões nos horários de pico; a previsão é de 2× acessos em 12 meses.\nOpções em discussão: Railway, AWS e Azure híbrido.";
const INFRA_R1 = "Resumo parcial da sessão\n\nOpções: Railway, AWS, Azure híbrido.";
const INFRA_R4 = `${INFRA_BASE}\nEvidências: teste de carga em homologação (Railway e AWS abaixo de 300 ms com o dobro do pico).`;

function infra(now: Date): DeciaSession {
  const id = DEMO_SESSION_IDS.infra;
  const m = (n: number) => `${id}-m${n}`;
  const messages: SessionMessage[] = [
    sys(m(1), at(now, -6 * DAY), { kind: "ESTADO_ALTERADO", from: "AGENDADA", to: "ABERTA", by: "u-pessoa", reason: null }),
    { id: m(2), kind: "MENSAGEM", author: { kind: "PESSOA", userId: "u-pessoa" }, at: at(now, -6 * DAY + HOUR), text: "Objetivo da sessão: escolher a infraestrutura que suporte o dobro de acessos sem queda, com custo mensal previsível.", reactions: { UTIL: ["u-bruno"] } },
    { id: m(3), kind: "EVIDENCIA", author: { kind: "PESSOA", userId: "u-bruno" }, at: at(now, -5 * DAY), text: "Com o dobro do pico atual, Railway e AWS mantiveram a latência abaixo de 300 ms no teste de carga de homologação.", reference: { kind: "DOCUMENTO", label: "Relatório do teste de carga (homologação)", href: `/decia/decisoes/${DEMO_DECISION_IDS.arquitetura}?secao=evidencias` }, reactions: { BEM_FUNDAMENTADO: ["u-carla", "u-pessoa"] } },
    { id: m(4), kind: "PERGUNTA", author: { kind: "PESSOA", userId: "u-carla" }, at: at(now, -5 * DAY + 2 * HOUR), text: "O plano contratável do Railway tem região no Brasil? Dados no país são exigência eliminatória.", reactions: {} },
    { id: m(5), kind: "RESPOSTA", author: { kind: "PESSOA", userId: "u-bruno" }, at: at(now, -4 * DAY - 3 * HOUR), text: "Pela documentação do provedor, o plano atual não oferece região nacional; só com contrato corporativo.", replyTo: m(4), reference: { kind: "LINK", label: "Documentação do provedor A (demo)", href: null }, reactions: {} },
    { id: m(6), kind: "PROPOSTA_IA", author: { kind: "IA" }, at: at(now, -2 * DAY), text: "", proposalId: `${id}-p-old`, requestedBy: "u-carla", reactions: {} },
    sys(m(7), at(now, -DAY), { kind: "MODO_ALTERADO", from: "SOB_SOLICITACAO", to: "SUGESTOES", by: "u-pessoa", policyVersion: 2, invalidated: 1 }),
    { id: m(8), kind: "PROPOSTA_IA", author: { kind: "IA" }, at: at(now, -20 * HOUR), text: "", proposalId: `${id}-p-new`, requestedBy: null, reactions: {} },
    { id: m(9), kind: "PERGUNTA", author: { kind: "PESSOA", userId: "u-diego" }, at: at(now, -3 * HOUR), text: "Alguém já calculou o custo de saída de dados (egress) da AWS para o nosso volume?", reactions: {} },
  ];
  const proposalNew = `${INFRA_R4}\n\nPerguntas em aberto (1):\n- Carla Exemplo: O plano contratável do Railway tem região no Brasil? Dados no país são exigência eliminatória.\n\nEncaminhamentos: nenhum registrado ainda.`;
  return {
    id, title: "Infraestrutura para os próximos 12 meses", objective: "Escolher a infraestrutura que suporte o dobro de acessos sem queda, com custo mensal previsível.",
    status: "ABERTA", phase: "ESCLARECER", decisionId: DEMO_DECISION_IDS.arquitetura, projectId: "p-plataforma", accessClass: "INTERNO",
    createdAt: at(now, -9 * DAY), updatedAt: at(now, -3 * HOUR), scheduledAt: at(now, -6 * DAY),
    participants: [
      { userId: "u-pessoa", role: "PROPRIETARIO", joinedAt: at(now, -9 * DAY) },
      { userId: "u-bruno", role: "EDITOR", joinedAt: at(now, -8 * DAY) },
      { userId: "u-carla", role: "EDITOR", joinedAt: at(now, -8 * DAY) },
      { userId: "u-diego", role: "COMENTADOR", joinedAt: at(now, -8 * DAY) },
      { userId: "u-elisa", role: "LEITOR", joinedAt: at(now, -7 * DAY) },
    ],
    policy: { mode: "SUGESTOES", version: 2, changedBy: "u-pessoa", changedAt: at(now, -DAY), charter: null },
    messages,
    proposals: [
      {
        id: `${id}-p-rj`, kind: "MINUTA", policyVersion: 1, baseRevision: 1, targetIds: ["minuta"], reviewedBy: "u-pessoa", createdAt: at(now, -5 * DAY - HOUR), mode: "SOB_SOLICITACAO",
        requestedBy: "u-carla", baseText: INFRA_BASE, text: `${INFRA_BASE}\nAvaliação: a AWS é claramente a melhor opção.`, status: "REJEITADA", resolvedBy: "u-pessoa", resolvedAt: at(now, -5 * DAY),
        reason: "Mistura opinião com evidência; a minuta registra fontes, não preferências.",
      },
      {
        id: `${id}-p-r1`, kind: "MINUTA", policyVersion: 1, baseRevision: 1, targetIds: ["minuta"], reviewedBy: "u-bruno", createdAt: at(now, -4 * DAY - HOUR), mode: "SOB_SOLICITACAO",
        requestedBy: "u-bruno", baseText: INFRA_BASE, text: INFRA_R1, status: "ACEITA", resolvedBy: "u-bruno", resolvedAt: at(now, -4 * DAY), appliedRevision: 2, revertedAt: at(now, -3 * DAY), reason: null,
      },
      {
        id: `${id}-p-old`, kind: "MINUTA", policyVersion: 1, baseRevision: 4, targetIds: ["minuta"], reviewedBy: null, createdAt: at(now, -2 * DAY), mode: "SOB_SOLICITACAO",
        requestedBy: "u-carla", baseText: INFRA_R4, text: `${INFRA_R4}\n\nPergunta em aberto: região nacional do Railway.`, status: "PENDENTE",
      },
      {
        id: `${id}-p-new`, kind: "MINUTA", policyVersion: 2, baseRevision: 4, targetIds: ["minuta"], reviewedBy: null, createdAt: at(now, -20 * HOUR), mode: "SUGESTOES",
        requestedBy: null, baseText: INFRA_R4, text: proposalNew, status: "PENDENTE",
      },
    ],
    minuta: {
      revision: 4, text: INFRA_R4,
      history: [
        { revision: 1, text: INFRA_BASE, by: "u-pessoa", at: at(now, -6 * DAY), origin: "HUMANO" },
        { revision: 2, text: INFRA_R1, by: "u-bruno", at: at(now, -4 * DAY), origin: "PROPOSTA_IA", proposalId: `${id}-p-r1` },
        { revision: 3, text: INFRA_BASE, by: "u-pessoa", at: at(now, -3 * DAY), origin: "REVERSAO", proposalId: `${id}-p-r1`, revertedFrom: 2 },
        { revision: 4, text: INFRA_R4, by: "u-bruno", at: at(now, -2 * DAY - 12 * HOUR), origin: "HUMANO" },
      ],
    },
    meetings: [], followUps: [],
    unread: { "u-diego": [m(7)], "u-elisa": [m(7)] },
    statusLog: [
      { from: "RASCUNHO", to: "AGENDADA", by: "u-pessoa", at: at(now, -8 * DAY), reason: null },
      { from: "AGENDADA", to: "ABERTA", by: "u-pessoa", at: at(now, -6 * DAY), reason: null },
    ],
  };
}

/* ── 2. Fornecedor de suporte (VALIDADA, ata ratificada) ─────────────────────────────────────────────────── */

/** "AAAA-MM-DD" → "DD/MM/AAAA" (as falas e os registros DEMO são texto em pt-BR). */
const br = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

function fornecedor(now: Date): DeciaSession {
  const id = DEMO_SESSION_IDS.fornecedor;
  const m = (n: number) => `${id}-m${n}`;
  const meetingId = `${id}-r1`;
  const base = dateOnly(now, -14);
  const d1 = dateOnly(now, -10);
  const d2 = dateOnly(now, 3);
  const span = (line: number, speaker: string, text: string) => ({ segment: line - 2, line, speaker, text });
  const lines = [
    "Pauta: escolha do fornecedor de suporte; transição dos chamados",
    "Ana Exemplo: Comparamos as três propostas com o mesmo critério de SLA.",
    "Elisa Exemplo: Fica aprovada a contratação do Fornecedor Beta (demo), com SLA de 4 horas.",
    `Ana Exemplo: Eu fico com o termo de referência até ${br(d1)}.`,
    `Elisa Exemplo: A operação assistida de duas semanas fica planejada até ${br(d2)}.`,
    "Pessoa Exemplo: Bruno vai avisar o financeiro sobre o custo 20 % maior até amanhã.",
  ];
  const say = (n: number) => lines[n - 1]!.replace(/^[^:]+:\s*/, "");
  const compiled: MinutesDraft = {
    baseDate: base,
    participants: [{ name: "Ana Exemplo", userId: "u-ana" }, { name: "Elisa Exemplo", userId: "u-elisa" }, { name: "Pessoa Exemplo", userId: "u-pessoa" }],
    agenda: [{ id: "ag-1", text: "escolha do fornecedor de suporte", source: null }, { id: "ag-2", text: "transição dos chamados", source: null }],
    speeches: [],
    decisions: [{ id: "dc-1", text: "Fica aprovada a contratação do Fornecedor Beta (demo), com SLA de 4 horas.", source: span(3, "Elisa Exemplo", say(3)) }],
    followUps: [
      { id: "fu-1", action: "Termo de referência", responsible: { status: "CASADO", userId: "u-ana", raw: "Ana Exemplo" }, due: { date: d1, raw: br(d1), kind: "ABSOLUTA" }, source: span(4, "Ana Exemplo", say(4)), accepted: null },
      { id: "fu-2", action: "Planejar a operação assistida de duas semanas", responsible: { status: "A_DEFINIR", raw: null }, due: { date: d2, raw: br(d2), kind: "ABSOLUTA" }, source: span(5, "Elisa Exemplo", say(5)), accepted: null },
      { id: "fu-3", action: "Avisar o financeiro sobre o custo 20 % maior", responsible: { status: "CASADO", userId: "u-bruno", raw: "Bruno" }, due: { date: dateOnly(now, -13), raw: "amanhã", kind: "RELATIVA" }, source: span(6, "Pessoa Exemplo", say(6)), accepted: null },
    ],
    pending: [],
    stats: { segments: 6, speakers: 3, words: 74 },
  };
  const ratified: MinutesDraft = {
    ...compiled,
    followUps: [
      { ...compiled.followUps[0]!, action: "Preparar o termo de referência", accepted: true },
      { ...compiled.followUps[1]!, responsible: { status: "CASADO", userId: "u-pessoa", raw: "Pessoa Exemplo" }, accepted: true },
      { ...compiled.followUps[2]!, accepted: false },
    ],
  };
  const meeting: Meeting = {
    id: meetingId, title: "Reunião de seleção do fornecedor", organizerId: "u-ana", createdAt: at(now, -14 * DAY), baseDate: base, source: "TRANSCRICAO_COLADA",
    status: "CONFIRMADA", participantIds: ["u-ana", "u-elisa", "u-pessoa"], consents: [], transcript: lines.join("\n"),
    fileName: null, compiled, draft: ratified, version: 1, ratifiedAt: at(now, -13 * DAY), ratifiedBy: "u-ana", ratificationDeadlineAt: at(now, -11 * DAY),
    ratifications: [{ userId: "u-ana", at: at(now, -13 * DAY) }, { userId: "u-elisa", at: at(now, -12 * DAY) }], contests: [], minutesMessageId: m(3),
  };
  return {
    id, title: "Fornecedor de suporte técnico", objective: "Contratar atendimento de segundo nível com SLA de 4 horas em horário estendido.",
    status: "VALIDADA", phase: "DECIDIR", decisionId: DEMO_DECISION_IDS.fornecedor, projectId: "p-suporte", accessClass: "INTERNO",
    createdAt: at(now, -40 * DAY), updatedAt: at(now, -9 * DAY), scheduledAt: null,
    participants: [
      { userId: "u-ana", role: "PROPRIETARIO", joinedAt: at(now, -40 * DAY) },
      { userId: "u-pessoa", role: "EDITOR", joinedAt: at(now, -38 * DAY) },
      { userId: "u-elisa", role: "EDITOR", joinedAt: at(now, -38 * DAY) },
      { userId: "u-bruno", role: "LEITOR", joinedAt: at(now, -30 * DAY) },
    ],
    policy: { mode: "SOB_SOLICITACAO", version: 1, changedBy: "u-ana", changedAt: at(now, -40 * DAY), charter: null },
    messages: [
      sys(m(1), at(now, -14 * DAY), { kind: "REUNIAO_INICIADA", meetingId, title: meeting.title, by: "u-ana" }),
      { id: m(2), kind: "EVIDENCIA", author: { kind: "PESSOA", userId: "u-pessoa" }, at: at(now, -14 * DAY + HOUR), text: "A referência de outra instituição mostra SLA cumprido em 96 % dos chamados em 2025.", reference: { kind: "DOCUMENTO", label: "Referência de outra instituição (demo)", href: `/decia/decisoes/${DEMO_DECISION_IDS.fornecedor}?secao=evidencias` }, reactions: { BEM_FUNDAMENTADO: ["u-ana"] } },
      { id: m(3), kind: "ATA", author: { kind: "PESSOA", userId: "u-ana" }, at: at(now, -13 * DAY), text: "", meetingId, minutesVersion: 1, minutes: ratified, meetingTitle: meeting.title, reactions: {} },
      sys(m(4), at(now, -11 * DAY), { kind: "ESTADO_ALTERADO", from: "EM_REVISAO", to: "VALIDADA", by: "u-ana", reason: null }),
      sys(m(5), at(now, -9 * DAY), { kind: "ENCAMINHAMENTO_CUMPRIDO", followUpId: `${id}-e1`, action: "Preparar o termo de referência", by: "u-ana", responsibleId: "u-ana" }),
    ],
    proposals: [],
    minuta: {
      revision: 1, text: "Minuta — fornecedor de suporte\n\nDecisão: contratar o Fornecedor Beta (demo), SLA de 4 horas, horário estendido.",
      history: [{ revision: 1, text: "Minuta — fornecedor de suporte\n\nDecisão: contratar o Fornecedor Beta (demo), SLA de 4 horas, horário estendido.", by: "u-ana", at: at(now, -12 * DAY), origin: "HUMANO" }],
    },
    meetings: [meeting],
    followUps: [
      { id: `${id}-e1`, meetingId, draftId: "fu-1", action: "Preparar o termo de referência", responsibleId: "u-ana", dueDate: d1, status: "CUMPRIDO", createdAt: at(now, -13 * DAY), completedAt: at(now, -9 * DAY), completedBy: "u-ana", sourceText: say(4) },
      { id: `${id}-e2`, meetingId, draftId: "fu-2", action: "Planejar a operação assistida de duas semanas", responsibleId: "u-pessoa", dueDate: d2, status: "ABERTO", createdAt: at(now, -13 * DAY), sourceText: say(5) },
    ],
    unread: {},
    statusLog: [
      { from: "DECISAO_PROPOSTA", to: "EM_REVISAO", by: "u-ana", at: at(now, -12 * DAY), reason: null },
      { from: "EM_REVISAO", to: "VALIDADA", by: "u-ana", at: at(now, -11 * DAY), reason: null },
    ],
  };
}

/* ── 3. Escopo da Sprint 5 (AGENDADA, IA em Manual) ──────────────────────────────────────────────────────── */

function sprint(now: Date): DeciaSession {
  const id = DEMO_SESSION_IDS.sprint;
  return {
    id, title: "Escopo da Sprint 5", objective: "Escolher a funcionalidade de maior valor para quem atende o público, dentro da capacidade da sprint.",
    status: "AGENDADA", phase: "CONTEXTO", decisionId: DEMO_DECISION_IDS.sprint, projectId: "p-atendimento", accessClass: "INTERNO",
    createdAt: at(now, -3 * DAY), updatedAt: at(now, -2 * DAY), scheduledAt: at(now, 2 * DAY),
    participants: [
      { userId: "u-ana", role: "PROPRIETARIO", joinedAt: at(now, -3 * DAY) },
      { userId: DEMO_CURRENT_USER_ID, role: "EDITOR", joinedAt: at(now, -3 * DAY) },
      { userId: "u-carla", role: "COMENTADOR", joinedAt: at(now, -2 * DAY) },
    ],
    policy: { mode: "MANUAL", version: 1, changedBy: "u-ana", changedAt: at(now, -3 * DAY), charter: null },
    messages: [sys(`${id}-m1`, at(now, -2 * DAY), { kind: "ESTADO_ALTERADO", from: "RASCUNHO", to: "AGENDADA", by: "u-ana", reason: null })],
    proposals: [],
    minuta: { revision: 1, text: "", history: [{ revision: 1, text: "", by: "u-ana", at: at(now, -3 * DAY), origin: "HUMANO" }] },
    meetings: [], followUps: [], unread: {},
    statusLog: [{ from: "RASCUNHO", to: "AGENDADA", by: "u-ana", at: at(now, -2 * DAY), reason: null }],
  };
}

export function buildDemoSessions(now: Date): DeciaSession[] {
  return [infra(now), fornecedor(now), sprint(now)];
}

/** Registros iniciais da trilha (em ordem cronológica), coerentes com as sessões acima. */
export function buildDemoAudit(now: Date): AuditInput[] {
  const f = DEMO_SESSION_IDS.fornecedor;
  const i = DEMO_SESSION_IDS.infra;
  const sob = { mode: "SOB_SOLICITACAO" as const, version: 1 };
  const fs = { source: "SESSAO" as const, sessionId: f, decisionId: DEMO_DECISION_IDS.fornecedor, contextTitle: "Fornecedor de suporte técnico", policy: sob, before: "" };
  const is = { source: "SESSAO" as const, sessionId: i, decisionId: DEMO_DECISION_IDS.arquitetura, contextTitle: "Infraestrutura para os próximos 12 meses", policy: sob };
  const d1 = dateOnly(now, -10);
  const d2 = dateOnly(now, 3);
  const ataProposed = "Ata — Reunião de seleção do fornecedor\n\nDecisões\n- Fica aprovada a contratação do Fornecedor Beta (demo), com SLA de 4 horas.\n\nEncaminhamentos\n- Termo de referência — Ana Exemplo\n- Planejar a operação assistida de duas semanas — a definir\n- Avisar o financeiro sobre o custo 20 % maior — Bruno Exemplo";
  const ataFinal = "Ata — Reunião de seleção do fornecedor\n\nDecisões\n- Fica aprovada a contratação do Fornecedor Beta (demo), com SLA de 4 horas.\n\nEncaminhamentos\n- Preparar o termo de referência — Ana Exemplo\n- Planejar a operação assistida de duas semanas — Pessoa Exemplo";
  return [
    { ...fs, at: at(now, -13 * DAY), actorId: "u-ana", action: "EDITOU_E_ACEITOU", target: { kind: "ATA", id: `${f}-r1`, label: "Reunião de seleção do fornecedor" }, reason: null, proposed: ataProposed, after: ataFinal },
    { ...fs, at: at(now, -13 * DAY), actorId: "u-ana", action: "EDITOU_E_ACEITOU", target: { kind: "ENCAMINHAMENTO", id: `${f}-r1:fu-1`, label: "Preparar o termo de referência" }, reason: null, proposed: `Termo de referência — Ana Exemplo — ${br(d1)}`, after: `Preparar o termo de referência — Ana Exemplo — ${br(d1)}` },
    { ...fs, at: at(now, -13 * DAY), actorId: "u-ana", action: "EDITOU_E_ACEITOU", target: { kind: "ENCAMINHAMENTO", id: `${f}-r1:fu-2`, label: "Planejar a operação assistida de duas semanas" }, reason: null, proposed: `Planejar a operação assistida de duas semanas — a definir — ${br(d2)}`, after: `Planejar a operação assistida de duas semanas — Pessoa Exemplo — ${br(d2)}` },
    { ...fs, at: at(now, -13 * DAY), actorId: "u-ana", action: "REJEITOU", target: { kind: "ENCAMINHAMENTO", id: `${f}-r1:fu-3`, label: "Avisar o financeiro sobre o custo 20 % maior" }, reason: "Já tratado no processo de empenho.", proposed: `Avisar o financeiro sobre o custo 20 % maior — Bruno Exemplo — ${br(dateOnly(now, -13))}`, after: "" },
    { ...is, at: at(now, -5 * DAY), actorId: "u-pessoa", action: "REJEITOU", target: { kind: "PROPOSTA_MINUTA", id: `${i}-p-rj`, label: "Minuta da sessão — infraestrutura" }, reason: "Mistura opinião com evidência; a minuta registra fontes, não preferências.", before: INFRA_BASE, proposed: `${INFRA_BASE}\nAvaliação: a AWS é claramente a melhor opção.`, after: INFRA_BASE },
    { ...is, at: at(now, -4 * DAY), actorId: "u-bruno", action: "ACEITOU", target: { kind: "PROPOSTA_MINUTA", id: `${i}-p-r1`, label: "Resumo parcial da sessão" }, reason: null, before: INFRA_BASE, proposed: INFRA_R1, after: INFRA_R1 },
    { ...is, at: at(now, -3 * DAY), actorId: "u-pessoa", action: "REVERTEU", target: { kind: "PROPOSTA_MINUTA", id: `${i}-p-r1`, label: "Resumo parcial da sessão" }, reason: "A proposta tirou o contexto que o grupo escreveu; volto ao texto anterior.", before: INFRA_R1, proposed: null, after: INFRA_BASE },
  ];
}
