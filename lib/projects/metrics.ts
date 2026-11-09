/**
 * Indicadores de qualidade, governança e trabalho em grupo da Mesa — a base da janela segmentada "Feedback da IA".
 *
 * Regras (DECIA, 03_MODELO_FUNCIONAL §5; RF43 D-12): indicadores SEPARADOS, nunca um número mágico; todo indicador é calculado
 * aqui, de forma determinística, e a IA só redige a partir destes números; cada indicador diz de onde vem a regra (aula) e qual
 * área abrir para corrigir. Nenhum indicador mede pessoas para terceiros: os de grupo falam de distribuição do trabalho, não de nota
 * individual (GUIA_DE_CARREIRA §3.7).
 */
import { scheduleOf } from "./derive";
import { businessCase } from "./engine/finance";
import { agreementProblems, gut, PM_AUTHORITY, riskExposure } from "./engine/methods";
import { PHASE_META, type GateCriterionId } from "./lifecycle";
import type { ProjectModel, ProjectPhase } from "./types";
import { PROJECT_PHASES } from "./types";
import { evmView, raciMatrix, riskRows, timelineView, traceabilityView, wbsView } from "./views";

export type MetricStatus = "OK" | "ATENCAO" | "CRITICO" | "SEM_DADOS";
export type MetricGroup = "QUALIDADE" | "GOVERNANCA" | "GRUPO";
/** Abas da Mesa (o feedback aponta onde corrigir). */
export type WorkspaceTab = "quadro" | "canvas" | "cronograma" | "iniciacao" | "escopo" | "riscos" | "controle" | "governanca" | "encerramento";

export type MetricId =
  | "Q_PORTAO" | "Q_EAP_100" | "Q_EAP_SUBSTANTIVOS" | "Q_RACI" | "Q_RASTREABILIDADE" | "Q_GOLD_PLATING" | "Q_CRONOGRAMA" | "Q_PERT"
  | "Q_IDC" | "Q_IDP" | "Q_RESERVA" | "Q_RISCOS_RESPOSTA" | "Q_SCOPE_CREEP" | "Q_MUDANCAS_ANALISE" | "Q_LICOES"
  | "G_ALINHAMENTO" | "G_SMART" | "G_TAP_PATROCINADOR" | "G_GUT" | "G_DECISOES_PORTAO" | "G_DECISOES_MUDANCA" | "G_ISO38500"
  | "G_RUN_GROW_TRANSFORM" | "G_ACORDOS_SERVICO" | "G_AUTORIDADE_GP"
  | "W_CARGA" | "W_CRITICO_CONCENTRADO" | "W_QUATRO_OLHOS" | "W_SEM_RESPONSAVEL" | "W_PARTICIPACAO_EDICOES" | "W_PARTICIPACAO_DECISOES";

export interface Metric {
  id: MetricId;
  group: MetricGroup;
  status: MetricStatus;
  /** valor principal já formatável (número ou rótulo) */
  value: number | string | null;
  vars: Record<string, string | number>;
  tab: WorkspaceTab;
  /** referência acadêmica da regra (chave i18n `pm.ref.<ref>`) */
  ref: string;
}

export interface Finding { metricId: MetricId; severity: "CRITICO" | "ATENCAO"; vars: Record<string, string | number>; tab: WorkspaceTab; ref: string }

/** Mínimo de uma decisão do DECIA ligada ao projeto (portão, mudança ou seleção). */
export interface LinkedDecision {
  decision: { id: string; status: string; selectedAlternativeId?: string; projectId?: string };
  participants: readonly { userId: string; assessmentsSubmittedAt?: string }[];
  alternatives: readonly { id: string; label: string }[];
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
const band = (v: number, ok: number, warn: number, higherIsBetter = true): MetricStatus =>
  higherIsBetter ? (v >= ok ? "OK" : v >= warn ? "ATENCAO" : "CRITICO") : (v <= ok ? "OK" : v <= warn ? "ATENCAO" : "CRITICO");

// ------------------------------------------------------------------ portões
export interface GateCheck { id: GateCriterionId; ok: boolean }

export function evaluateGate(model: ProjectModel, phase: ProjectPhase): GateCheck[] {
  return PHASE_META[phase].gate.map((id) => ({ id, ok: criterion(model, id) }));
}

function criterion(model: ProjectModel, id: GateCriterionId): boolean {
  const c = model.charter;
  switch (id) {
    case "TAP_APROVADO": return Boolean(c.sponsorId && c.approvedBySponsorAt && c.sponsorId !== c.managerId);
    case "BUSINESS_CASE_VIAVEL": return model.businessCase.cashflows.length >= 2 && businessCase(model.businessCase.rate, model.businessCase.cashflows).viable;
    case "ALINHAMENTO_ESTRATEGICO": return c.objectives.some((o) => o.goalId && model.governance.goals.some((g) => g.id === o.goalId));
    case "GUT_AVALIADA": return Boolean(model.governance.gut);
    case "PARTES_INTERESSADAS_MAPEADAS": return model.stakeholders.length > 0;
    case "EAP_REGRA_100": {
      const v = wbsView(model);
      return v.nodes.length > 1 && !v.issues.some((i) => i.kind === "SOMA_DIFERENTE" || i.kind === "ATIVIDADE_SEM_PACOTE" || i.kind === "ATIVIDADE_FORA_DO_PACOTE");
    }
    case "CRONOGRAMA_SEM_CICLO": return model.tasks.length > 0 && scheduleOf(model).ok;
    case "RACI_UM_A": {
      const m = raciMatrix(model);
      return m.length > 0 && m.every((r) => r.problems.length === 0);
    }
    case "RISCOS_ANALISADOS": return model.risks.filter((r) => r.status === "ABERTO").every((r) => r.probability > 0 && (r.impact > 0 || r.impactLevel > 0) && Boolean(r.response));
    case "RESERVA_COBRE_VME": return model.reserves.contingency >= riskExposure(model.risks.map((r) => ({ ...r, closed: r.status !== "ABERTO" }))).net;
    case "LINHA_DE_BASE": return Boolean(model.baseline);
    case "RASTREABILIDADE_COMPLETA": {
      const t = traceabilityView(model);
      return t.rows.length > 0 && t.rows.every((r) => r.complete);
    }
    case "SEM_GOLD_PLATING": return traceabilityView(model).goldPlating.length === 0;
    case "RISCOS_CRITICOS_TRATADOS": return riskRows(model).filter((r) => r.open && r.kind === "AMEACA" && (r.band === "CRITICA" || r.band === "ALTA")).every((r) => Boolean(r.response));
    case "CONFORMIDADE_AVALIADA": return model.governance.iso38500.CONFORMIDADE === true;
    case "DECISAO_NO_DECIA": {
      const g = model.gates.find((x) => x.phase === "APROVACAO");
      return Boolean(g?.decisionId && (g.outcome === "APROVADO" || g.outcome === "APROVADO_COM_RESSALVAS"));
    }
    case "MUDANCAS_PELO_CCB": return !model.tasks.some((t) => t.addedAfterBaseline && !t.changeId);
    case "DESEMPENHO_IDC_IDP": {
      const e = evmView(model);
      return (e.cpi ?? 0) >= 0.9 && (e.spi ?? 0) >= 0.9;
    }
    case "ENTREGAS_REVISADAS": {
      const done = model.tasks.filter((t) => t.status === "CONCLUIDA" && !t.milestone);
      return done.length > 0 && done.every((t) => t.reviewerId && t.reviewerId !== t.responsibleId);
    }
    case "ACEITE_FORMAL": return model.closure.acceptance;
    case "LICOES_AO_LONGO": return new Set(model.lessons.map((l) => l.phase)).size >= 2;
    case "CONTRATOS_ENCERRADOS": return model.closure.contractsClosed;
    case "RECURSOS_LIBERADOS": return model.closure.resourcesReleased;
    case "ARQUIVAMENTO": return model.closure.finalReport;
    case "TRANSICAO_OPERACAO": {
      if (model.closure.cancelledReason) return true;
      const sv = model.closure.service;
      return Boolean(sv && sv.catalogEntry && sv.knowledgeBase && sv.cmdbUpdated && agreementProblems(sv.slaHours, sv.olaHours, sv.ucHours).length === 0);
    }
  }
}

// ------------------------------------------------------------------ indicadores
export interface ProjectMetrics { quality: Metric[]; governance: Metric[]; group: Metric[]; findings: Finding[]; gate: { phase: ProjectPhase; checks: GateCheck[] } }

export function computeMetrics(model: ProjectModel, decisions: readonly LinkedDecision[] = []): ProjectMetrics {
  const m = (id: MetricId, group: MetricGroup, status: MetricStatus, value: Metric["value"], vars: Metric["vars"], tab: WorkspaceTab, ref: string): Metric => ({ id, group, status, value, vars, tab, ref });
  const quality: Metric[] = [];
  const governance: Metric[] = [];
  const group: Metric[] = [];

  // --- qualidade do gerenciamento
  const gateChecks = evaluateGate(model, model.currentPhase);
  const passed = gateChecks.filter((c) => c.ok).length;
  quality.push(m("Q_PORTAO", "QUALIDADE", passed === gateChecks.length ? "OK" : band(pct(passed, gateChecks.length), 100, 50),
    `${passed}/${gateChecks.length}`, { phase: model.currentPhase, passed, total: gateChecks.length }, "quadro", "PORTAO_DE_FASE"));

  const wbs = wbsView(model);
  const wbs100 = wbs.issues.filter((i) => i.kind === "SOMA_DIFERENTE" || i.kind === "ATIVIDADE_SEM_PACOTE" || i.kind === "ATIVIDADE_FORA_DO_PACOTE").length;
  quality.push(m("Q_EAP_100", "QUALIDADE", wbs.nodes.length <= 1 ? "SEM_DADOS" : band(wbs100, 0, 2, false), wbs100, { n: wbs100 }, "escopo", "EAP_REGRA_100"));
  const verbs = wbs.issues.filter((i) => i.kind === "PARECE_ATIVIDADE").length;
  quality.push(m("Q_EAP_SUBSTANTIVOS", "QUALIDADE", verbs ? "ATENCAO" : wbs.nodes.length <= 1 ? "SEM_DADOS" : "OK", verbs, { n: verbs }, "escopo", "EAP_SUBSTANTIVOS"));

  const raci = raciMatrix(model);
  const raciBad = raci.filter((r) => r.problems.length).length;
  quality.push(m("Q_RACI", "QUALIDADE", raci.length ? band(pct(raciBad, raci.length), 0, 25, false) : "SEM_DADOS", raciBad, { n: raciBad, total: raci.length }, "riscos", "RACI_UM_A"));

  const trace = traceabilityView(model);
  quality.push(m("Q_RASTREABILIDADE", "QUALIDADE", trace.rows.length ? band(trace.coverage, 90, 60) : "SEM_DADOS", `${trace.coverage}%`,
    { coverage: trace.coverage, untraced: trace.untraced.length, untested: trace.untested.length }, "escopo", "RASTREABILIDADE"));
  quality.push(m("Q_GOLD_PLATING", "QUALIDADE", trace.goldPlating.length ? "ATENCAO" : "OK", trace.goldPlating.length, { n: trace.goldPlating.length }, "escopo", "GOLD_PLATING"));

  const tl = timelineView(model);
  if (!tl.ok) quality.push(m("Q_CRONOGRAMA", "QUALIDADE", "CRITICO", null, { cycle: (tl.cycle ?? []).length }, "canvas", "CPM"));
  else {
    const criticalShare = pct(tl.criticalPath.length, model.tasks.length);
    quality.push(m("Q_CRONOGRAMA", "QUALIDADE", model.tasks.length ? (criticalShare > 70 && model.tasks.length >= 4 ? "ATENCAO" : "OK") : "SEM_DADOS", tl.finish,
      { finish: tl.finish, critical: tl.criticalPath.length, total: model.tasks.length, share: criticalShare }, "cronograma", "CPM"));
  }
  if (tl.pert && tl.pert.sd > 0) {
    const p = Math.round(tl.pert.probability * 100);
    quality.push(m("Q_PERT", "QUALIDADE", band(p, 80, 50), `${p}%`, { probability: p, target: tl.pert.target, p80: Math.round(tl.pert.p80 * 10) / 10, te: Math.round(tl.pert.te * 10) / 10 }, "cronograma", "PERT"));
  } else {
    quality.push(m("Q_PERT", "QUALIDADE", "SEM_DADOS", null, {}, "cronograma", "PERT"));
  }

  const e = evmView(model);
  quality.push(m("Q_IDC", "QUALIDADE", e.cpi === null ? "SEM_DADOS" : band(e.cpi, 0.95, 0.85), e.cpi, { cpi: e.cpi ?? 0, cv: e.cv, eac: e.eac ?? 0, bac: e.bac }, "controle", "EVM_IDC"));
  quality.push(m("Q_IDP", "QUALIDADE", e.spi === null ? "SEM_DADOS" : band(e.spi, 0.95, 0.85), e.spi, { spi: e.spi ?? 0, sv: e.sv }, "controle", "EVM_IDP"));

  const exposure = riskExposure(model.risks.map((r) => ({ ...r, closed: r.status !== "ABERTO" })));
  const reserve = model.reserves.contingency;
  quality.push(m("Q_RESERVA", "QUALIDADE", exposure.net <= 0 ? "OK" : band(pct(reserve, exposure.net), 100, 70), reserve,
    { reserve, exposure: exposure.net, threats: exposure.threats }, "riscos", "VME_RESERVA"));
  const noResponse = model.risks.filter((r) => r.status === "ABERTO" && !r.response).length;
  quality.push(m("Q_RISCOS_RESPOSTA", "QUALIDADE", model.risks.length ? (noResponse ? "ATENCAO" : "OK") : "SEM_DADOS", noResponse, { n: noResponse }, "riscos", "RESPOSTA_RISCO"));

  const creep = model.tasks.filter((t) => t.addedAfterBaseline && !t.changeId);
  quality.push(m("Q_SCOPE_CREEP", "QUALIDADE", creep.length ? "CRITICO" : model.baseline ? "OK" : "SEM_DADOS", creep.length,
    { n: creep.length, codes: creep.map((t) => t.code).join(", ") }, "controle", "SCOPE_CREEP"));
  const open = model.changes.filter((c) => c.status === "SOLICITADA" || c.status === "EM_ANALISE");
  const incomplete = open.filter((c) => Object.values(c.sevenRs).filter((v) => v && String(v).trim()).length < 7 || Object.values(c.impact).every((v) => v === 0));
  quality.push(m("Q_MUDANCAS_ANALISE", "QUALIDADE", open.length ? (incomplete.length ? "ATENCAO" : "OK") : "SEM_DADOS", incomplete.length, { n: incomplete.length, open: open.length }, "controle", "CONTROLE_MUDANCAS"));

  const elapsed = PROJECT_PHASES.indexOf(model.currentPhase) + 1;
  const phasesWithLessons = new Set(model.lessons.map((l) => l.phase)).size;
  quality.push(m("Q_LICOES", "QUALIDADE", elapsed <= 1 ? (phasesWithLessons ? "OK" : "SEM_DADOS") : band(pct(phasesWithLessons, elapsed), 50, 20), `${phasesWithLessons}/${elapsed}`,
    { phases: phasesWithLessons, elapsed, total: model.lessons.length }, "encerramento", "LICOES_AO_LONGO"));

  // --- governança
  const objs = model.charter.objectives;
  const aligned = objs.filter((o) => o.goalId && model.governance.goals.some((g) => g.id === o.goalId)).length;
  governance.push(m("G_ALINHAMENTO", "GOVERNANCA", objs.length ? band(pct(aligned, objs.length), 100, 50) : "SEM_DADOS", `${aligned}/${objs.length}`, { aligned, total: objs.length }, "governanca", "CASCATA_OBJETIVOS"));
  const smart = objs.filter((o) => o.smart).length;
  governance.push(m("G_SMART", "GOVERNANCA", objs.length ? band(pct(smart, objs.length), 100, 50) : "SEM_DADOS", `${smart}/${objs.length}`, { smart, total: objs.length }, "iniciacao", "META_SMART"));
  const c = model.charter;
  const tapOk = Boolean(c.approvedBySponsorAt && c.sponsorId && c.sponsorId !== c.managerId);
  governance.push(m("G_TAP_PATROCINADOR", "GOVERNANCA", tapOk ? "OK" : c.approvedBySponsorAt ? "CRITICO" : "ATENCAO", tapOk ? "OK" : "—",
    { sameAsManager: c.sponsorId && c.sponsorId === c.managerId ? 1 : 0 }, "iniciacao", "TAP_PATROCINADOR"));
  const g = model.governance.gut;
  const gutR = g ? gut(g.g, g.u, g.t) : null;
  governance.push(m("G_GUT", "GOVERNANCA", gutR ? "OK" : "ATENCAO", gutR?.score ?? null, gutR ? { score: gutR.score, band: gutR.band } : {}, "governanca", "GUT"));
  const decidedGates = model.gates.filter((x) => x.outcome !== "PENDENTE");
  const gatesInDecia = decidedGates.filter((x) => x.decisionId).length;
  governance.push(m("G_DECISOES_PORTAO", "GOVERNANCA", decidedGates.length ? band(pct(gatesInDecia, decidedGates.length), 100, 50) : "SEM_DADOS", `${gatesInDecia}/${decidedGates.length}`,
    { inDecia: gatesInDecia, total: decidedGates.length }, "governanca", "GOVERNANCA_X_GESTAO"));
  const decidedChanges = model.changes.filter((x) => x.type === "NORMAL" && (x.status === "APROVADA" || x.status === "REJEITADA" || x.status === "IMPLEMENTADA"));
  const changesInDecia = decidedChanges.filter((x) => x.decisionId).length;
  governance.push(m("G_DECISOES_MUDANCA", "GOVERNANCA", decidedChanges.length ? band(pct(changesInDecia, decidedChanges.length), 100, 50) : "SEM_DADOS", `${changesInDecia}/${decidedChanges.length}`,
    { inDecia: changesInDecia, total: decidedChanges.length }, "controle", "CCB_CAB"));
  const iso = Object.values(model.governance.iso38500).filter(Boolean).length;
  governance.push(m("G_ISO38500", "GOVERNANCA", band(iso, 6, 3), `${iso}/6`, { n: iso }, "governanca", "ISO_38500"));
  const spend = { RUN: 0, GROW: 0, TRANSFORM: 0 };
  for (const b of model.budgetLines) spend[b.spend] += b.amount;
  const spendTotal = spend.RUN + spend.GROW + spend.TRANSFORM;
  governance.push(m("G_RUN_GROW_TRANSFORM", "GOVERNANCA", spendTotal ? "OK" : "SEM_DADOS", model.governance.spend,
    { run: pct(spend.RUN, spendTotal), grow: pct(spend.GROW, spendTotal), transform: pct(spend.TRANSFORM, spendTotal) }, "governanca", "RUN_GROW_TRANSFORM"));
  const sv = model.closure.service;
  const agr = sv ? agreementProblems(sv.slaHours, sv.olaHours, sv.ucHours) : [];
  governance.push(m("G_ACORDOS_SERVICO", "GOVERNANCA", sv?.slaHours === undefined ? "SEM_DADOS" : agr.length ? "CRITICO" : "OK", agr.length,
    { sla: sv?.slaHours ?? 0, ola: sv?.olaHours ?? 0, uc: sv?.ucHours ?? 0, problems: agr.length }, "encerramento", "SLA_OLA_UC"));
  const auth = PM_AUTHORITY[model.governance.orgStructure];
  governance.push(m("G_AUTORIDADE_GP", "GOVERNANCA", auth.authority === "NENHUMA" || auth.authority === "BAIXA" ? "ATENCAO" : "OK", model.governance.orgStructure,
    { structure: model.governance.orgStructure, authority: auth.authority, budgetOwner: auth.budgetOwner }, "governanca", "ESTRUTURA_AUTORIDADE"));

  // --- trabalho em grupo
  const s = scheduleOf(model);
  const work = model.tasks.filter((t) => !t.milestone);
  const load = new Map<string, number>();
  for (const t of work) if (t.responsibleId) load.set(t.responsibleId, (load.get(t.responsibleId) ?? 0) + Math.max(1, t.durationDays));
  const loadTotal = [...load.values()].reduce((a, b) => a + b, 0);
  const [topUser, topLoad] = [...load.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  const topShare = pct(topLoad, loadTotal);
  group.push(m("W_CARGA", "GRUPO", loadTotal === 0 ? "SEM_DADOS" : model.team.length >= 3 && topShare > 50 ? "ATENCAO" : "OK", `${topShare}%`,
    { userId: topUser, share: topShare, people: load.size, team: model.team.length }, "riscos", "RECURSOS_EQUIPE"));
  const crit = s.ok ? work.filter((t) => s.rows[t.id]?.critical) : [];
  const critBy = new Map<string, number>();
  for (const t of crit) if (t.responsibleId) critBy.set(t.responsibleId, (critBy.get(t.responsibleId) ?? 0) + 1);
  const [critUser, critN] = [...critBy.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  const critShare = pct(critN, crit.length);
  group.push(m("W_CRITICO_CONCENTRADO", "GRUPO", crit.length < 3 ? "SEM_DADOS" : critShare > 60 ? "ATENCAO" : "OK", `${critShare}%`,
    { userId: critUser, share: critShare, critical: crit.length }, "cronograma", "CAMINHO_CRITICO_PESSOAS"));
  const done = work.filter((t) => t.status === "CONCLUIDA");
  const reviewed = done.filter((t) => t.reviewerId && t.reviewerId !== t.responsibleId).length;
  group.push(m("W_QUATRO_OLHOS", "GRUPO", done.length ? band(pct(reviewed, done.length), 80, 50) : "SEM_DADOS", `${reviewed}/${done.length}`,
    { reviewed, done: done.length }, "quadro", "QUALIDADE_REVISAO"));
  const unassigned = work.filter((t) => !t.responsibleId && t.status !== "CONCLUIDA").length;
  group.push(m("W_SEM_RESPONSAVEL", "GRUPO", unassigned ? "ATENCAO" : "OK", unassigned, { n: unassigned }, "quadro", "RACI_UM_A"));
  const authors = new Set(model.versions.map((v) => v.actorId));
  const team = Math.max(1, model.team.length);
  group.push(m("W_PARTICIPACAO_EDICOES", "GRUPO", model.versions.length ? band(pct(authors.size, team), 60, 30) : "SEM_DADOS", `${authors.size}/${model.team.length}`,
    { authors: authors.size, team: model.team.length }, "canvas", "COLABORACAO"));
  const linked = decisions.filter((d) => model.decisionIds.includes(d.decision.id));
  const seats = linked.flatMap((d) => d.participants);
  const submitted = seats.filter((p) => p.assessmentsSubmittedAt).length;
  group.push(m("W_PARTICIPACAO_DECISOES", "GRUPO", seats.length ? band(pct(submitted, seats.length), 70, 40) : "SEM_DADOS", `${submitted}/${seats.length}`,
    { submitted, seats: seats.length, decisions: linked.length }, "governanca", "DECISAO_COLEGIADA"));

  const all = [...quality, ...governance, ...group];
  const findings: Finding[] = all
    .filter((x) => x.status === "CRITICO" || x.status === "ATENCAO")
    .map((x) => ({ metricId: x.id, severity: x.status as "CRITICO" | "ATENCAO", vars: x.vars, tab: x.tab, ref: x.ref }))
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "CRITICO" ? -1 : 1));
  return { quality, governance, group, findings, gate: { phase: model.currentPhase, checks: gateChecks } };
}
