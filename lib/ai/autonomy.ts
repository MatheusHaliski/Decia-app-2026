/**
 * Autonomia da IA em Letters, Drawings e DECIA (RF51; auditoria de 17/10/2026). Cinco modos com efeito verificável —
 * nunca um percentual de "influência". Funções puras: o servidor é a fonte de verdade e aplica as mesmas regras; a UI
 * usa estas funções para habilitar/desabilitar ações e explicar o motivo (Amershi et al. G1/G2/G9/G10/G16).
 *
 * | Modo            | Inicia sozinha | Responde a pedido | Propõe alteração     | Altera conteúdo                        |
 * |-----------------|----------------|-------------------|----------------------|----------------------------------------|
 * | MANUAL          | não            | não               | não                  | não                                    |
 * | SOB_SOLICITACAO | não            | sim               | só quando pedido     | não                                    |
 * | SUGESTOES       | só sugestões   | sim               | sim                  | não                                    |
 * | ASSISTIDO       | só sugestões   | sim               | sim                  | após revisão, só na seleção, reversível|
 * | AGENTE          | passos do plano| sim               | sim                  | dentro do mandato, com log e parada    |
 */

export const AUTONOMY_MODES = ["MANUAL", "SOB_SOLICITACAO", "SUGESTOES", "ASSISTIDO", "AGENTE"] as const;
export type AutonomyMode = (typeof AUTONOMY_MODES)[number];

export type AiAction =
  /** a IA toma a iniciativa de comentar/sugerir, sem pedido */
  | "SUGESTAO_ESPONTANEA"
  /** responde a uma pergunta ou análise pedida explicitamente */
  | "RESPONDER"
  /** gera proposta (diff/prévia) sem alterar o conteúdo */
  | "PROPOR_ALTERACAO"
  /** aplica uma proposta revisada ao conteúdo */
  | "APLICAR_ALTERACAO"
  /** executa um passo de um plano de agente */
  | "EXECUTAR_PASSO";

export interface ModeCapabilities {
  spontaneous: boolean;
  answers: boolean;
  proposes: "NUNCA" | "SOB_PEDIDO" | "SEMPRE";
  applies: "NUNCA" | "APOS_REVISAO" | "DENTRO_DO_MANDATO";
}

export const MODE_CAPABILITIES: Record<AutonomyMode, ModeCapabilities> = {
  MANUAL: { spontaneous: false, answers: false, proposes: "NUNCA", applies: "NUNCA" },
  SOB_SOLICITACAO: { spontaneous: false, answers: true, proposes: "SOB_PEDIDO", applies: "NUNCA" },
  SUGESTOES: { spontaneous: true, answers: true, proposes: "SEMPRE", applies: "NUNCA" },
  ASSISTIDO: { spontaneous: true, answers: true, proposes: "SEMPRE", applies: "APOS_REVISAO" },
  AGENTE: { spontaneous: true, answers: true, proposes: "SEMPRE", applies: "DENTRO_DO_MANDATO" },
};

export type AutonomyDenial =
  | "MODO_NAO_PERMITE"
  | "SEM_PEDIDO_DO_USUARIO"
  | "SEM_REVISAO_HUMANA"
  | "SEM_SELECAO"
  | "FORA_DO_ESCOPO"
  | "PROPOSTA_OBSOLETA_POLITICA"
  | "PROPOSTA_OBSOLETA_REVISAO"
  | "SEM_MANDATO"
  | "MANDATO_INVALIDO"
  | "FERRAMENTA_NAO_PERMITIDA"
  | "LIMITE_DE_PASSOS"
  | "LIMITE_DE_TOKENS"
  | "MANDATO_EXPIRADO"
  | "EXECUCAO_ENCERRADA"
  | "SEM_PERMISSAO"
  | "CONECTOR_DE_OUTRO_PARTICIPANTE";

export type Verdict = { ok: true } | { ok: false; reason: AutonomyDenial };
const OK: Verdict = { ok: true };
const deny = (reason: AutonomyDenial): Verdict => ({ ok: false, reason });

/* ── Mandato do agente ───────────────────────────────────────────────────────────────────────────────────── */

export interface AgentCharter {
  goal: string;
  /** quem autorizou (e cujas conexões externas, apenas as listadas, o agente pode usar) */
  authorizedBy: string;
  /** objetos/blocos/regiões que o agente pode alterar */
  scopeTargetIds: readonly string[];
  allowedTools: readonly string[];
  maxSteps: number;
  maxTokens: number;
  expiresAt: string;
  connectorIds: readonly string[];
}

export const AGENT_LIMITS = { maxSteps: 50, maxTokens: 200_000, maxHours: 8 } as const;

export function validateCharter(charter: AgentCharter, now: Date): Verdict {
  const expires = Date.parse(charter.expiresAt);
  const ok =
    charter.goal.trim().length >= 10 &&
    charter.scopeTargetIds.length > 0 &&
    charter.allowedTools.length > 0 &&
    Number.isInteger(charter.maxSteps) && charter.maxSteps >= 1 && charter.maxSteps <= AGENT_LIMITS.maxSteps &&
    Number.isInteger(charter.maxTokens) && charter.maxTokens >= 1 && charter.maxTokens <= AGENT_LIMITS.maxTokens &&
    Number.isFinite(expires) && expires > now.getTime() && expires - now.getTime() <= AGENT_LIMITS.maxHours * 3_600_000;
  return ok ? OK : deny("MANDATO_INVALIDO");
}

/**
 * Conectores que o agente pode usar: só os listados no mandato E pertencentes a quem autorizou. Compartilhar a sessão
 * nunca concede ao agente as conexões privadas dos demais participantes.
 */
export function agentConnectors(charter: AgentCharter, connectorsByOwner: Readonly<Record<string, readonly string[]>>): string[] {
  const own = new Set(connectorsByOwner[charter.authorizedBy] ?? []);
  return charter.connectorIds.filter((id) => own.has(id));
}

export function checkCharterConnectors(charter: AgentCharter, connectorsByOwner: Readonly<Record<string, readonly string[]>>): Verdict {
  return agentConnectors(charter, connectorsByOwner).length === charter.connectorIds.length ? OK : deny("CONECTOR_DE_OUTRO_PARTICIPANTE");
}

/* ── Política da sessão e troca de modo ──────────────────────────────────────────────────────────────────── */

export type SessionRole = "PROPRIETARIO" | "EDITOR" | "COMENTADOR" | "LEITOR";
export interface SessionMember { userId: string; role: SessionRole }

export interface AiPolicy {
  mode: AutonomyMode;
  /** incrementa a cada troca: propostas e execuções de versões anteriores deixam de valer */
  version: number;
  changedBy: string;
  changedAt: string;
  charter: AgentCharter | null;
}

export interface ModeChangeNotice {
  from: AutonomyMode;
  to: AutonomyMode;
  by: string;
  at: string;
  policyVersion: number;
  /** todos os participantes, exceto quem mudou, recebem o aviso */
  notify: string[];
}

/** Política pessoal (peça própria, fora de sessão compartilhada) a partir da preferência salva. */
export const personalPolicy = (mode: AutonomyMode): AiPolicy => ({ mode, version: 1, changedBy: "self", changedAt: "1970-01-01T00:00:00.000Z", charter: null });

export const roleOf = (members: readonly SessionMember[], userId: string) => members.find((m) => m.userId === userId)?.role ?? null;

/** Só o proprietário da sessão/peça altera a autonomia; editores podem pedir, mas não trocar. */
export const canChangeMode = (members: readonly SessionMember[], actor: string) => roleOf(members, actor) === "PROPRIETARIO";

export function changeMode(
  policy: AiPolicy,
  members: readonly SessionMember[],
  actor: string,
  to: AutonomyMode,
  now: Date,
  charter: AgentCharter | null = null,
): { ok: true; policy: AiPolicy; notice: ModeChangeNotice } | { ok: false; reason: AutonomyDenial } {
  if (!canChangeMode(members, actor)) return { ok: false, reason: "SEM_PERMISSAO" };
  if (to === "AGENTE") {
    if (!charter) return { ok: false, reason: "SEM_MANDATO" };
    if (charter.authorizedBy !== actor) return { ok: false, reason: "MANDATO_INVALIDO" };
    const v = validateCharter(charter, now);
    if (!v.ok) return v;
  }
  const at = now.toISOString();
  const next: AiPolicy = { mode: to, version: policy.version + 1, changedBy: actor, changedAt: at, charter: to === "AGENTE" ? charter : null };
  return {
    ok: true,
    policy: next,
    notice: { from: policy.mode, to, by: actor, at, policyVersion: next.version, notify: members.map((m) => m.userId).filter((id) => id !== actor) },
  };
}

/* ── Propostas ───────────────────────────────────────────────────────────────────────────────────────────── */

export interface AiProposal {
  id: string;
  policyVersion: number;
  /** revisão do documento/cena sobre a qual a proposta foi calculada */
  baseRevision: number;
  targetIds: readonly string[];
  reviewedBy: string | null;
}

/**
 * Proposta só vale se a política e a revisão não mudaram desde que foi gerada e se todos os alvos continuam editáveis
 * (seleção, camada, região reservada). Qualquer mudança exige nova análise; o rascunho é preservado.
 */
export function proposalValidity(policy: AiPolicy, proposal: AiProposal, currentRevision: number, editableIds: ReadonlySet<string>): Verdict {
  if (proposal.policyVersion !== policy.version) return deny("PROPOSTA_OBSOLETA_POLITICA");
  if (proposal.baseRevision !== currentRevision) return deny("PROPOSTA_OBSOLETA_REVISAO");
  if (!proposal.targetIds.length || proposal.targetIds.some((id) => !editableIds.has(id))) return deny("FORA_DO_ESCOPO");
  return OK;
}

/* ── Execução do agente ──────────────────────────────────────────────────────────────────────────────────── */

export type AgentRunStatus = "EXECUTANDO" | "INTERROMPIDO" | "CONCLUIDO" | "LIMITE_ATINGIDO";
export interface AgentStep { n: number; tool: string; targetIds: readonly string[]; tokens: number; summary: string; at: string; checkpointId: string }
export interface AgentRun {
  policyVersion: number;
  charter: AgentCharter;
  status: AgentRunStatus;
  steps: AgentStep[];
  tokensUsed: number;
  endedBy: string | null;
  endedAt: string | null;
}

export function startAgentRun(policy: AiPolicy, now: Date): { ok: true; run: AgentRun } | { ok: false; reason: AutonomyDenial } {
  if (policy.mode !== "AGENTE") return { ok: false, reason: "MODO_NAO_PERMITE" };
  if (!policy.charter) return { ok: false, reason: "SEM_MANDATO" };
  const v = validateCharter(policy.charter, now);
  if (!v.ok) return v;
  return { ok: true, run: { policyVersion: policy.version, charter: policy.charter, status: "EXECUTANDO", steps: [], tokensUsed: 0, endedBy: null, endedAt: null } };
}

/** Valida e registra um passo; ao estourar limite a execução para (LIMITE_ATINGIDO) e o passo não é aplicado. */
export function recordAgentStep(
  policy: AiPolicy,
  run: AgentRun,
  step: Omit<AgentStep, "n" | "at">,
  now: Date,
): { ok: true; run: AgentRun } | { ok: false; reason: AutonomyDenial; run: AgentRun } {
  const fail = (reason: AutonomyDenial, status: AgentRunStatus = run.status) =>
    ({ ok: false as const, reason, run: status === run.status ? run : { ...run, status, endedBy: "SISTEMA", endedAt: now.toISOString() } });
  if (run.status !== "EXECUTANDO") return fail("EXECUCAO_ENCERRADA");
  // trocar o modo (ou o mandato) durante a execução encerra o agente: nada roda sob uma política antiga
  if (policy.mode !== "AGENTE" || policy.version !== run.policyVersion) return fail("EXECUCAO_ENCERRADA", "INTERROMPIDO");
  const c = run.charter;
  if (now.getTime() >= Date.parse(c.expiresAt)) return fail("MANDATO_EXPIRADO", "LIMITE_ATINGIDO");
  if (!c.allowedTools.includes(step.tool)) return fail("FERRAMENTA_NAO_PERMITIDA");
  const scope = new Set(c.scopeTargetIds);
  if (!step.targetIds.length || step.targetIds.some((id) => !scope.has(id))) return fail("FORA_DO_ESCOPO");
  if (run.steps.length >= c.maxSteps) return fail("LIMITE_DE_PASSOS", "LIMITE_ATINGIDO");
  if (run.tokensUsed + step.tokens > c.maxTokens) return fail("LIMITE_DE_TOKENS", "LIMITE_ATINGIDO");
  const recorded: AgentStep = { ...step, n: run.steps.length + 1, at: now.toISOString() };
  return { ok: true, run: { ...run, steps: [...run.steps, recorded], tokensUsed: run.tokensUsed + step.tokens } };
}

/** Parar está sempre disponível para quem autorizou, o proprietário e editores; comentadores e leitores não. */
export function stopAgentRun(run: AgentRun, members: readonly SessionMember[], actor: string, now: Date): { ok: true; run: AgentRun } | { ok: false; reason: AutonomyDenial } {
  const role = roleOf(members, actor);
  if (actor !== run.charter.authorizedBy && role !== "PROPRIETARIO" && role !== "EDITOR") return { ok: false, reason: "SEM_PERMISSAO" };
  if (run.status !== "EXECUTANDO") return { ok: true, run };
  return { ok: true, run: { ...run, status: "INTERROMPIDO", endedBy: actor, endedAt: now.toISOString() } };
}

/* ── Decisão única para a UI e para o servidor ───────────────────────────────────────────────────────────── */

export interface ActionContext {
  /** a ação foi disparada explicitamente pelo usuário (botão, comando, pergunta) */
  requestedByUser: boolean;
  /** ids editáveis da seleção atual (já filtrados por camada/região/trava) */
  editableIds?: ReadonlySet<string>;
  proposal?: AiProposal;
  currentRevision?: number;
  run?: AgentRun;
  step?: Omit<AgentStep, "n" | "at">;
  /** relógio da verificação (expiração do mandato); obrigatório para EXECUTAR_PASSO */
  now?: Date;
}

export function evaluateAiAction(policy: AiPolicy, action: AiAction, ctx: ActionContext): Verdict {
  const caps = MODE_CAPABILITIES[policy.mode];
  switch (action) {
    case "SUGESTAO_ESPONTANEA":
      return caps.spontaneous ? OK : deny("MODO_NAO_PERMITE");
    case "RESPONDER":
      if (!caps.answers) return deny("MODO_NAO_PERMITE");
      return ctx.requestedByUser ? OK : deny("SEM_PEDIDO_DO_USUARIO");
    case "PROPOR_ALTERACAO":
      if (caps.proposes === "NUNCA") return deny("MODO_NAO_PERMITE");
      if (caps.proposes === "SOB_PEDIDO" && !ctx.requestedByUser) return deny("SEM_PEDIDO_DO_USUARIO");
      return OK;
    case "APLICAR_ALTERACAO": {
      if (caps.applies === "NUNCA") return deny("MODO_NAO_PERMITE");
      if (!ctx.proposal) return deny("SEM_REVISAO_HUMANA");
      if (!ctx.proposal.reviewedBy) return deny("SEM_REVISAO_HUMANA");
      if (!ctx.editableIds || ctx.editableIds.size === 0) return deny("SEM_SELECAO");
      return proposalValidity(policy, ctx.proposal, ctx.currentRevision ?? -1, ctx.editableIds);
    }
    case "EXECUTAR_PASSO": {
      if (caps.applies !== "DENTRO_DO_MANDATO") return deny("MODO_NAO_PERMITE");
      if (!ctx.run || !ctx.step || !ctx.now) return deny("SEM_MANDATO");
      const r = recordAgentStep(policy, ctx.run, ctx.step, ctx.now);
      return r.ok ? OK : deny(r.reason);
    }
  }
}
