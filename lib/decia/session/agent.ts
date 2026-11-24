/**
 * Execução do agente de IA na sessão do DECIA (RF51.CA04, modo AGENTE; D-12, D-136). Executor DETERMINÍSTICO e simulado: nenhum
 * modelo é chamado — cada passo completa uma seção VAZIA da minuta só com o que a sessão registrou (evidências, perguntas abertas,
 * decisões em ata, encaminhamentos) ou com trechos EXATOS da Memória (`searchMemory`). Um passo por vez, cada um com checkpoint
 * (o texto antes do passo), motivo, ferramenta, alvos e tokens estimados.
 *
 * As regras de autonomia são as de lib/ai/autonomy.ts, sem alteração: `startAgentRun` (modo AGENTE + mandato válido),
 * `recordAgentStep` (política vigente, prazo, ferramenta, escopo, passos e tokens — ao estourar, LIMITE_ATINGIDO e o passo NÃO é
 * aplicado) e `stopAgentRun` (quem pode interromper). O que falta lá e foi feito aqui:
 *   - escopo por seção da minuta (`minuta:evidencias`…; o alvo "minuta" cobre todas as seções);
 *   - pausar/retomar e "desfazer até este checkpoint" (revisão nova da minuta, nada apagado; só se ninguém mudou a minuta depois);
 *   - teto absoluto AGENT_LIMITS também contado a partir do início (passos, tokens, horas), além do mandato;
 *   - encerramento imediato (INTERROMPIDO) quando a política efetiva muda (modo, teto da organização ou novo mandato), com aviso a
 *     todos os membros; e a intenção de auditoria de cada passo aplicado (antes/depois e quem autorizou o mandato).
 * Funções puras: o estado da execução e o relógio ficam em agentStore.ts.
 */
import {
  AGENT_LIMITS, checkCharterConnectors, recordAgentStep, roleOf, startAgentRun, stopAgentRun, type AgentCharter, type AgentRun, type AgentStep, type AutonomyDenial,
} from "@/lib/ai/autonomy";
import type { AuditInput } from "@/lib/decia/audit/types";
import { searchMemory, type MemorySearch } from "@/lib/memory/search";
import { evidenceMessages, openQuestions } from "./chat";
import { isMinutaEditable } from "./minuta";
import { effectivePolicy, MINUTA_TARGET } from "./policy";
import { can } from "./roles";
import type { DateOnly, DeciaSession, OrgAiPolicy, PeopleDirectory, SessionDenial, SessionMessage, SystemNotice } from "./types";

/* ── Ferramentas, seções e escopo ────────────────────────────────────────────────────────────────────────── */

/** Ferramentas que um mandato da sessão pode conceder (o formulário do mandato escolhe um subconjunto). */
export const SESSION_AGENT_TOOLS = ["propor_minuta", "organizar_encaminhamentos", "citar_memoria"] as const;
export type SessionAgentTool = (typeof SESSION_AGENT_TOOLS)[number];

/** Seções da minuta que o agente sabe completar, na ordem em que as visita. */
export const AGENT_SECTIONS = ["EVIDENCIAS", "PERGUNTAS", "DECISOES", "ENCAMINHAMENTOS", "FONTES"] as const;
export type AgentSection = (typeof AGENT_SECTIONS)[number];

export const SECTION_TOOL: Readonly<Record<AgentSection, SessionAgentTool>> = {
  EVIDENCIAS: "propor_minuta",
  PERGUNTAS: "propor_minuta",
  DECISOES: "propor_minuta",
  ENCAMINHAMENTOS: "organizar_encaminhamentos",
  FONTES: "citar_memoria",
};

export const sectionTarget = (s: AgentSection) => `${MINUTA_TARGET}:${s.toLowerCase()}`;
export const ALL_SECTION_TARGETS: readonly string[] = AGENT_SECTIONS.map(sectionTarget);

/** O alvo "minuta" cobre todas as seções; senão, só as seções listadas no mandato. */
export function expandScope(scope: readonly string[]): string[] {
  const out = new Set(scope);
  if (out.has(MINUTA_TARGET)) for (const t of ALL_SECTION_TARGETS) out.add(t);
  return [...out];
}
export const inScope = (scope: readonly string[], target: string) => expandScope(scope).includes(target);

/** Máximo de trechos da Memória citados num passo e de encaminhamentos propostos a partir de perguntas abertas. */
export const AGENT_MAX_CITATIONS = 3;
export const AGENT_MAX_PROPOSED_FOLLOWUPS = 3;
/** Tokens estimados de um passo: custo fixo de leitura do contexto + ~4 caracteres por token do texto escrito (simulado). */
export const AGENT_STEP_OVERHEAD_TOKENS = 150;
export const estimateTokens = (text: string) => AGENT_STEP_OVERHEAD_TOKENS + Math.ceil(text.length / 4);

/* ── Seções do texto da minuta ───────────────────────────────────────────────────────────────────────────── */

export const sectionHeading = (label: string) => `## ${label}`;

function sectionBounds(lines: readonly string[], heading: string): { start: number; end: number } | null {
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start < 0) return null;
  let end = start + 1;
  while (end < lines.length && !lines[end]!.startsWith("## ")) end++;
  return { start, end };
}

/** A seção não existe ou existe sem nenhuma linha preenchida. */
export function isSectionEmpty(text: string, heading: string): boolean {
  const lines = text.split("\n");
  const b = sectionBounds(lines, heading);
  return !b || lines.slice(b.start + 1, b.end).every((l) => !l.trim());
}

/** Preenche a seção (substitui o corpo vazio) ou a acrescenta no fim; o resto do texto fica idêntico. */
export function fillSection(text: string, heading: string, items: readonly string[]): string {
  const body = items.map((i) => `- ${i}`);
  const lines = text.split("\n");
  const b = sectionBounds(lines, heading);
  if (!b) {
    const head = text.trimEnd();
    return head ? `${head}\n\n${[heading, ...body].join("\n")}` : [heading, ...body].join("\n");
  }
  const tail = lines.slice(b.end);
  return [...lines.slice(0, b.start + 1), ...body, ...(tail.length ? ["", ...tail] : [])].join("\n");
}

/* ── Plano: o próximo passo ──────────────────────────────────────────────────────────────────────────────── */

export interface AgentLabels {
  /** títulos das seções na minuta (sem o "## ") */
  section: Readonly<Record<AgentSection, string>>;
  /** item de encaminhamento proposto a partir de uma pergunta aberta (responsável a definir) */
  followUpProposal: (question: string) => string;
  /** resumo e motivo de um passo (ficam na lista de passos e na auditoria) */
  summary: (section: string, n: number) => string;
  reason: (section: AgentSection, n: number) => string;
  formatDate: (d: DateOnly) => string;
}

export interface PlannedAgentStep {
  section: AgentSection;
  tool: SessionAgentTool;
  targetIds: string[];
  items: string[];
  tokens: number;
  summary: string;
  reason: string;
  after: string;
}

const nameOf = (people: PeopleDirectory, id: string) => people[id]?.name ?? id;
const authorOf = (m: SessionMessage, people: PeopleDirectory) => (m.author.kind === "PESSOA" ? nameOf(people, m.author.userId) : "—");

/** Itens de uma seção, só com dados da sessão (D-12). Lista vazia = nada a completar (o agente não inventa). */
export function sectionItems(session: DeciaSession, section: AgentSection, labels: AgentLabels, people: PeopleDirectory, search: MemorySearch = searchMemory): string[] {
  switch (section) {
    case "EVIDENCIAS":
      return evidenceMessages(session).map((m) => `${authorOf(m, people)}: ${m.text}${m.reference ? ` (${m.reference.label})` : ""}`);
    case "PERGUNTAS":
      return openQuestions(session).map((m) => `${authorOf(m, people)}: ${m.text}`);
    case "DECISOES":
      return session.meetings.filter((mt) => mt.status === "CONFIRMADA" || mt.status === "CONTESTADA").flatMap((mt) => (mt.draft?.decisions ?? []).map((d) => d.text));
    case "ENCAMINHAMENTOS": {
      const registered = session.followUps.map((f) => `${f.action} — ${nameOf(people, f.responsibleId)} · ${labels.formatDate(f.dueDate)}${f.status === "CUMPRIDO" ? " ✓" : ""}`);
      const proposed = openQuestions(session).slice(0, AGENT_MAX_PROPOSED_FOLLOWUPS).map((m) => labels.followUpProposal(m.text));
      return [...registered, ...proposed];
    }
    case "FONTES": {
      const query = (session.objective || session.title).trim();
      if (!query) return [];
      return search(query, { k: AGENT_MAX_CITATIONS, readable: ["PUBLICO", "INTERNO"] })
        .slice(0, AGENT_MAX_CITATIONS)
        .map((h, i) => `[${i + 1}] ${h.citation}: “${h.passage.text}”`);
    }
  }
}

/**
 * Próximo passo do plano: a primeira seção (na ordem de AGENT_SECTIONS) cuja ferramenta está no mandato, que está no escopo, que
 * está vazia na minuta, que ninguém desfez nesta execução e para a qual a sessão tem dados. null = objetivo concluído.
 */
export function nextAgentStep(
  session: DeciaSession,
  charter: Pick<AgentCharter, "allowedTools" | "scopeTargetIds">,
  labels: AgentLabels,
  people: PeopleDirectory,
  opts: { search?: MemorySearch; skip?: ReadonlySet<AgentSection> } = {},
): PlannedAgentStep | null {
  for (const section of AGENT_SECTIONS) {
    const tool = SECTION_TOOL[section];
    const target = sectionTarget(section);
    if (!charter.allowedTools.includes(tool) || !inScope(charter.scopeTargetIds, target) || opts.skip?.has(section)) continue;
    const heading = sectionHeading(labels.section[section]);
    if (!isSectionEmpty(session.minuta.text, heading)) continue;
    const items = sectionItems(session, section, labels, people, opts.search);
    if (!items.length) continue;
    const after = fillSection(session.minuta.text, heading, items);
    const written = [heading, ...items].join("\n");
    return {
      section, tool, targetIds: [target], items, after, tokens: estimateTokens(written),
      summary: labels.summary(labels.section[section], items.length), reason: labels.reason(section, items.length),
    };
  }
  return null;
}

/* ── Execução ────────────────────────────────────────────────────────────────────────────────────────────── */

export const AGENT_END_REASONS = [
  "OBJETIVO_CONCLUIDO", "PARADO_POR_PESSOA", "POLITICA_ALTERADA", "SESSAO_NAO_ATIVA", "MANDATO_EXPIRADO", "LIMITE_DE_PASSOS", "LIMITE_DE_TOKENS",
  "FERRAMENTA_NAO_PERMITIDA", "FORA_DO_ESCOPO", "EXECUCAO_ENCERRADA",
] as const;
export type AgentEndReason = (typeof AGENT_END_REASONS)[number];
const asEnd = (r: AutonomyDenial): AgentEndReason => ((AGENT_END_REASONS as readonly string[]).includes(r) ? (r as AgentEndReason) : "EXECUCAO_ENCERRADA");
export type AgentDenial = SessionDenial | "AGENTE_PAUSADO" | "AGENTE_NAO_PAUSADO" | "SEM_EXECUCAO" | "EXECUCAO_EM_ANDAMENTO" | "CHECKPOINT_INEXISTENTE";

export interface AgentStepRecord extends AgentStep {
  section: AgentSection;
  /** por que o agente fez este passo */
  reason: string;
  /** checkpoint = o texto antes do passo; "desfazer até este checkpoint" volta a ele */
  before: string;
  after: string;
  revisionBefore: number;
  revisionAfter: number;
  undoneAt?: string;
  undoneBy?: string;
}

export interface SessionAgentRun {
  id: string;
  sessionId: string;
  startedBy: string;
  startedAt: string;
  /** o mandato como foi dado (o `core.charter` tem o escopo expandido por seção) */
  charter: AgentCharter;
  /** execução de lib/ai/autonomy.ts (status, passos, tokens, versão da política) */
  core: AgentRun;
  steps: AgentStepRecord[];
  paused: boolean;
  pausedBy: string | null;
  endReason: AgentEndReason | null;
}

export type AgentResult<T> = ({ ok: true } & T) | { ok: false; reason: AgentDenial };

/** Quem inicia e retoma: quem autorizou o mandato ou a pessoa proprietária. */
export const canStartAgent = (session: Pick<DeciaSession, "participants">, charter: Pick<AgentCharter, "authorizedBy">, actor: string) =>
  actor === charter.authorizedBy || roleOf(session.participants, actor) === "PROPRIETARIO";
/** Quem pausa e interrompe: quem autorizou, a pessoa proprietária e editores (mesma regra de `stopAgentRun`). */
export const canControlAgent = (session: Pick<DeciaSession, "participants">, charter: Pick<AgentCharter, "authorizedBy">, actor: string) =>
  actor === charter.authorizedBy || ["PROPRIETARIO", "EDITOR"].includes(roleOf(session.participants, actor) ?? "");

export const isRunning = (run: SessionAgentRun | null | undefined) => run?.core.status === "EXECUTANDO";

const checkpointId = (runId: string, n: number) => `${runId}-cp${n}`;

/** Aviso do sistema na conversa, não lido por todos os membros (menos quem agiu). */
function withNotice(session: DeciaSession, notice: Extract<SystemNotice, { kind: "AGENTE" }>, at: string, messageId: string, actor: string | null): DeciaSession {
  const message: SessionMessage = { id: messageId, kind: "SISTEMA", author: { kind: "SISTEMA" }, at, text: "", reactions: {}, notice };
  const unread = { ...session.unread };
  for (const p of session.participants) if (p.userId !== actor) unread[p.userId] = [...(unread[p.userId] ?? []), messageId];
  return { ...session, updatedAt: at, messages: [...session.messages, message], unread };
}

function ended(run: SessionAgentRun, status: "CONCLUIDO" | "LIMITE_ATINGIDO" | "INTERROMPIDO", reason: AgentEndReason, by: string, at: string): SessionAgentRun {
  return { ...run, paused: false, pausedBy: null, endReason: reason, core: { ...run.core, status, endedBy: by, endedAt: at } };
}

function endNotice(session: DeciaSession, run: SessionAgentRun, at: string, messageId: string, actor: string | null): DeciaSession {
  const status = run.core.status as "CONCLUIDO" | "LIMITE_ATINGIDO" | "INTERROMPIDO";
  return withNotice(session, {
    kind: "AGENTE", event: status, reason: run.endReason, by: run.core.endedBy ?? "SISTEMA", steps: run.steps.filter((s) => !s.undoneAt).length,
    tokens: run.core.tokensUsed, policyVersion: run.core.policyVersion,
  }, at, messageId, actor);
}

/** Inicia a execução sob o mandato vigente (modo efetivo AGENTE, mandato válido). Avisa todos os membros. */
export function startSessionAgent(
  session: DeciaSession,
  org: Pick<OrgAiPolicy, "ceiling">,
  actor: string,
  current: SessionAgentRun | null,
  now: Date,
  ids: { run: string; message: string },
): AgentResult<{ run: SessionAgentRun; session: DeciaSession }> {
  const eff = effectivePolicy(session, org);
  if (isRunning(current)) return { ok: false, reason: "EXECUCAO_EM_ANDAMENTO" };
  if (!isMinutaEditable(session.status)) return { ok: false, reason: "SESSAO_NAO_ATIVA" };
  if (eff.charter && !canStartAgent(session, eff.charter, actor)) return { ok: false, reason: "SEM_PERMISSAO" };
  const r = startAgentRun(eff, now);
  if (!r.ok) return r;
  const charter = r.run.charter;
  // DEMO: nenhuma conexão externa é usada pela sessão; um mandato que liste conectores alheios é recusado
  const conn = checkCharterConnectors(charter, {});
  if (!conn.ok) return conn;
  const at = now.toISOString();
  const run: SessionAgentRun = {
    id: ids.run, sessionId: session.id, startedBy: actor, startedAt: at, charter, steps: [], paused: false, pausedBy: null, endReason: null,
    core: { ...r.run, charter: { ...charter, scopeTargetIds: expandScope(charter.scopeTargetIds) } },
  };
  const next = withNotice(session, { kind: "AGENTE", event: "INICIADO", reason: null, by: actor, steps: 0, tokens: 0, policyVersion: run.core.policyVersion }, at, ids.message, actor);
  return { ok: true, run, session: next };
}

/**
 * Por que a execução não pode continuar, sem olhar o próximo passo: política efetiva trocada (modo, teto ou novo mandato), sessão
 * fora de edição, prazo do mandato ou teto de horas do AGENT_LIMITS. null = pode continuar.
 */
export function haltReason(session: DeciaSession, org: Pick<OrgAiPolicy, "ceiling">, run: SessionAgentRun, now: Date): { status: "INTERROMPIDO" | "LIMITE_ATINGIDO"; reason: AgentEndReason } | null {
  const eff = effectivePolicy(session, org);
  if (eff.mode !== "AGENTE" || eff.version !== run.core.policyVersion) return { status: "INTERROMPIDO", reason: "POLITICA_ALTERADA" };
  if (!isMinutaEditable(session.status)) return { status: "INTERROMPIDO", reason: "SESSAO_NAO_ATIVA" };
  const t = now.getTime();
  if (t >= Date.parse(run.charter.expiresAt) || t - Date.parse(run.startedAt) >= AGENT_LIMITS.maxHours * 3_600_000) return { status: "LIMITE_ATINGIDO", reason: "MANDATO_EXPIRADO" };
  return null;
}

/**
 * Encerra já (INTERROMPIDO) uma execução cuja política mudou — chamado a cada mudança da sessão, sem esperar o próximo passo — e
 * avisa os membros. null = nada a fazer.
 */
export function reconcileAgent(
  session: DeciaSession,
  org: Pick<OrgAiPolicy, "ceiling">,
  run: SessionAgentRun,
  now: Date,
  messageId: string,
): { run: SessionAgentRun; session: DeciaSession } | null {
  if (!isRunning(run)) return null;
  const h = haltReason(session, org, run, now);
  if (!h) return null;
  const at = now.toISOString();
  const next = ended(run, h.status, h.reason, "SISTEMA", at);
  return { run: next, session: endNotice(session, next, at, messageId, null) };
}

export type AgentStepOutcome =
  | { kind: "APLICADO"; run: SessionAgentRun; session: DeciaSession; audit: AuditInput; step: AgentStepRecord }
  | { kind: "ENCERRADO"; run: SessionAgentRun; session: DeciaSession; reason: AgentEndReason }
  | { kind: "NEGADO"; reason: AgentDenial };

/**
 * Um passo: confere política, prazo e limites; planeja o próximo passo; valida com `recordAgentStep` (ferramenta, escopo, passos,
 * tokens do mandato) e com o teto AGENT_LIMITS; só então aplica na minuta (revisão nova, origem AGENTE) e devolve a auditoria. Ao
 * estourar um limite a execução para (LIMITE_ATINGIDO) e o passo NÃO é aplicado; sem passo a fazer, CONCLUIDO.
 */
export function runAgentStep(
  session: DeciaSession,
  org: Pick<OrgAiPolicy, "ceiling">,
  run: SessionAgentRun,
  labels: AgentLabels,
  people: PeopleDirectory,
  now: Date,
  messageId: string,
  opts: { search?: MemorySearch } = {},
): AgentStepOutcome {
  if (!isRunning(run)) return { kind: "NEGADO", reason: "EXECUCAO_ENCERRADA" };
  if (run.paused) return { kind: "NEGADO", reason: "AGENTE_PAUSADO" };
  const at = now.toISOString();
  const stop = (status: "CONCLUIDO" | "LIMITE_ATINGIDO" | "INTERROMPIDO", reason: AgentEndReason): AgentStepOutcome => {
    const next = ended(run, status, reason, "SISTEMA", at);
    return { kind: "ENCERRADO", run: next, reason, session: endNotice(session, next, at, messageId, null) };
  };
  const halt = haltReason(session, org, run, now);
  if (halt) return stop(halt.status, halt.reason);
  const skip = new Set(run.steps.filter((s) => s.undoneAt).map((s) => s.section));
  const plan = nextAgentStep(session, run.charter, labels, people, { search: opts.search, skip });
  if (!plan) return stop("CONCLUIDO", "OBJETIVO_CONCLUIDO");
  // teto do sistema, independente do mandato
  if (run.core.steps.length >= AGENT_LIMITS.maxSteps) return stop("LIMITE_ATINGIDO", "LIMITE_DE_PASSOS");
  if (run.core.tokensUsed + plan.tokens > AGENT_LIMITS.maxTokens) return stop("LIMITE_ATINGIDO", "LIMITE_DE_TOKENS");
  const n = run.core.steps.length + 1;
  const cp = checkpointId(run.id, n);
  const eff = effectivePolicy(session, org);
  const r = recordAgentStep(eff, run.core, { tool: plan.tool, targetIds: plan.targetIds, tokens: plan.tokens, summary: plan.summary, checkpointId: cp }, now);
  if (!r.ok) {
    if (r.run.status === "INTERROMPIDO") return stop("INTERROMPIDO", "POLITICA_ALTERADA");
    if (r.run.status === "LIMITE_ATINGIDO") return stop("LIMITE_ATINGIDO", asEnd(r.reason));
    // ferramenta ou escopo fora do mandato: incerteza impeditiva — para sem aplicar
    return stop("INTERROMPIDO", asEnd(r.reason));
  }
  const recorded = r.run.steps.at(-1)!;
  const revision = session.minuta.revision + 1;
  const step: AgentStepRecord = {
    ...recorded, section: plan.section, reason: plan.reason, before: session.minuta.text, after: plan.after, revisionBefore: session.minuta.revision, revisionAfter: revision,
  };
  const authorizedBy = run.charter.authorizedBy;
  const nextSession: DeciaSession = {
    ...session, updatedAt: at,
    minuta: { revision, text: plan.after, history: [...session.minuta.history, { revision, text: plan.after, by: authorizedBy, at, origin: "AGENTE" }] },
  };
  const audit: AuditInput = {
    at, actorId: authorizedBy, action: "AGENTE_APLICOU", source: "SESSAO", sessionId: session.id, decisionId: session.decisionId, contextTitle: session.title,
    target: { kind: "PASSO_AGENTE", id: cp, label: plan.summary }, policy: { mode: eff.mode, version: eff.version }, reason: plan.reason,
    before: session.minuta.text, proposed: null, after: plan.after,
    agent: { runId: run.id, step: n, tool: plan.tool, authorizedBy, checkpointId: cp, tokens: plan.tokens },
  };
  return { kind: "APLICADO", step, audit, session: nextSession, run: { ...run, core: r.run, steps: [...run.steps, step] } };
}

export function pauseAgent(session: DeciaSession, run: SessionAgentRun, actor: string): AgentResult<{ run: SessionAgentRun }> {
  if (!isRunning(run)) return { ok: false, reason: "EXECUCAO_ENCERRADA" };
  if (!canControlAgent(session, run.charter, actor)) return { ok: false, reason: "SEM_PERMISSAO" };
  if (run.paused) return { ok: false, reason: "AGENTE_PAUSADO" };
  return { ok: true, run: { ...run, paused: true, pausedBy: actor } };
}

export function resumeAgent(session: DeciaSession, run: SessionAgentRun, actor: string): AgentResult<{ run: SessionAgentRun }> {
  if (!isRunning(run)) return { ok: false, reason: "EXECUCAO_ENCERRADA" };
  if (!canStartAgent(session, run.charter, actor)) return { ok: false, reason: "SEM_PERMISSAO" };
  if (!run.paused) return { ok: false, reason: "AGENTE_NAO_PAUSADO" };
  return { ok: true, run: { ...run, paused: false, pausedBy: null } };
}

/** Interromper (pessoa): `stopAgentRun` decide quem pode; avisa os demais membros. */
export function stopAgent(session: DeciaSession, run: SessionAgentRun, actor: string, now: Date, messageId: string): AgentResult<{ run: SessionAgentRun; session: DeciaSession }> {
  if (!isRunning(run)) return { ok: false, reason: "EXECUCAO_ENCERRADA" };
  const r = stopAgentRun(run.core, session.participants, actor, now);
  if (!r.ok) return r;
  const next: SessionAgentRun = { ...run, paused: false, pausedBy: null, endReason: "PARADO_POR_PESSOA", core: r.run };
  return { ok: true, run: next, session: endNotice(session, next, now.toISOString(), messageId, actor) };
}

/** Passos ainda aplicados (não desfeitos), na ordem. */
export const appliedSteps = (run: SessionAgentRun) => run.steps.filter((s) => !s.undoneAt);

/** Dá para desfazer até o checkpoint do passo `n`: passo aplicado e a minuta ainda é a do último passo aplicado. */
export function canUndoTo(session: Pick<DeciaSession, "minuta" | "status">, run: SessionAgentRun, n: number): boolean {
  const applied = appliedSteps(run);
  return isMinutaEditable(session.status) && applied.some((s) => s.n === n) && applied.at(-1)!.revisionAfter === session.minuta.revision;
}

/**
 * "Desfazer até este checkpoint": volta a minuta ao texto de antes do passo `n` (desfaz ele e todos os seguintes) numa revisão NOVA
 * (origem AGENTE_DESFEITO; nada é apagado). Só enquanto ninguém mudou a minuta depois do último passo — senão desfaria trabalho de
 * outra pessoa. Uma execução em andamento fica pausada, e o agente não refaz as seções desfeitas.
 */
export function undoAgentTo(
  session: DeciaSession,
  org: Pick<OrgAiPolicy, "ceiling">,
  run: SessionAgentRun,
  actor: string,
  n: number,
  reason: string | null,
  now: Date,
): AgentResult<{ run: SessionAgentRun; session: DeciaSession; audit: AuditInput; undone: number }> {
  if (!can(session, actor, "DECIDIR_PROPOSTA")) return { ok: false, reason: "SEM_PERMISSAO" };
  if (!isMinutaEditable(session.status)) return { ok: false, reason: "SESSAO_NAO_ATIVA" };
  const applied = appliedSteps(run);
  const target = applied.find((s) => s.n === n);
  if (!target) return { ok: false, reason: "CHECKPOINT_INEXISTENTE" };
  if (applied.at(-1)!.revisionAfter !== session.minuta.revision) return { ok: false, reason: "MINUTA_MUDOU_DEPOIS" };
  const at = now.toISOString();
  const revision = session.minuta.revision + 1;
  const undone = applied.filter((s) => s.n >= n);
  const steps = run.steps.map((s) => (!s.undoneAt && s.n >= n ? { ...s, undoneAt: at, undoneBy: actor } : s));
  const eff = effectivePolicy(session, org);
  const nextRun: SessionAgentRun = { ...run, steps, ...(isRunning(run) && !run.paused ? { paused: true, pausedBy: actor } : {}) };
  const nextSession: DeciaSession = {
    ...session, updatedAt: at,
    minuta: { revision, text: target.before, history: [...session.minuta.history, { revision, text: target.before, by: actor, at, origin: "AGENTE_DESFEITO", revertedFrom: session.minuta.revision }] },
  };
  const audit: AuditInput = {
    at, actorId: actor, action: "REVERTEU", source: "SESSAO", sessionId: session.id, decisionId: session.decisionId, contextTitle: session.title,
    target: { kind: "PASSO_AGENTE", id: target.checkpointId, label: target.summary }, policy: { mode: eff.mode, version: eff.version }, reason: reason?.trim() || null,
    before: session.minuta.text, proposed: null, after: target.before,
    agent: { runId: run.id, step: n, tool: target.tool, authorizedBy: run.charter.authorizedBy, checkpointId: target.checkpointId, tokens: target.tokens },
  };
  return { ok: true, run: nextRun, session: nextSession, audit, undone: undone.length };
}
