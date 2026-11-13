/**
 * Chancelas DEMO (RF39): itens que podem ser chancelados — o projeto de exemplo e as tarefas dele (lib/projects/fixtures, só
 * leitura) e um plano anual fictício — com os fatos calculados por funções puras a partir dos próprios dados; chancelas da EMPRESA
 * ("Secretaria Exemplo") e do CHEFE do laboratório ("Chefia Exemplo", CPOE), benefícios e vínculos de exemplo (um aprovado com
 * benefícios para o "Pessoa Exemplo", dois na fila e um recusado). Reações são número de demonstração (o módulo de reações do
 * Mural ainda não existe); reutilizações vêm do Balcão. Datas relativas a `now`.
 */
import { DEMO_PROJECT_ID, buildDemoProject } from "@/lib/projects/fixtures";
import type { ProjectModel, Task } from "@/lib/projects/types";
import { evaluatePolicy, suggestionBasis } from "./criteria";
import type { Benefit, Seal, SealBond, SealTarget, TargetFacts } from "./types";

const DAY_MS = 86_400_000;
const ago = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();
const dayOf = (iso: string) => iso.slice(0, 10);
const addDays = (iso: string, days: number) => new Date(Date.parse(iso.slice(0, 10)) + days * DAY_MS).toISOString().slice(0, 10);

export const EMPRESA_ISSUER = { id: "secretaria.exemplo", name: "Secretaria Exemplo" } as const;
export const CHEFE_ISSUER = { id: "chefe.exemplo", name: "Chefia Exemplo", department: "CPOE" } as const;
export const DEMO_PLAN_ID = "plano-2027-cpoe";
/** Departamento do projeto de exemplo (o do "Pessoa Exemplo" no laboratório). */
export const DEMO_PROJECT_DEPARTMENT = "SECID-UTS";

/** Nomes do diretório DEMO (pessoas do DECIA e perfis do laboratório). */
export const DEMO_DIRECTORY: Readonly<Record<string, string>> = {
  "u-pessoa": "Pessoa Exemplo", "u-ana": "Ana Exemplo", "u-bruno": "Bruno Exemplo", "u-carla": "Carla Exemplo", "u-diego": "Diego Exemplo", "u-elisa": "Elisa Exemplo",
  "chefe.exemplo": "Chefia Exemplo", "curadoria.exemplo": "Curadoria Exemplo", "admin.exemplo": "Administração Exemplo", "secretaria.exemplo": "Secretaria Exemplo",
};
export const nameOf = (id: string) => DEMO_DIRECTORY[id] ?? id;

/** Reações de qualidade recebidas (número de demonstração até o Mural ter reações). */
const DEMO_REACTIONS: Readonly<Record<string, number>> = { [DEMO_PROJECT_ID]: 7, tA: 5, tP: 2 };

/** Prazo da atividade: `dueAt` quando existe; senão início + duração planejada. */
function taskOnTime(t: Task): boolean {
  if (t.status !== "CONCLUIDA" || !t.doneAt) return false;
  const due = t.dueAt ? dayOf(t.dueAt) : t.startedAt ? addDays(t.startedAt, t.durationDays) : null;
  return due !== null && dayOf(t.doneAt) <= due;
}

/** Fatos de uma atividade: conformidade = campos de controle preenchidos (responsável, pacote da EAP, revisor, MoSCoW). */
export function taskFacts(t: Task, reactions = 0, reuses = 0): TargetFacts {
  const filled = [t.responsibleId, t.wbsId, t.reviewerId, t.moscow].filter(Boolean).length;
  return {
    conformityPct: Math.round((100 * filled) / 4),
    traceComplete: !!t.reviewerId && t.reviewerId !== t.responsibleId,
    deadlineMet: taskOnTime(t),
    reactions,
    reuses,
    decisionValidated: false,
    pending: t.status === "CONCLUIDA" ? 0 : 1,
  };
}

/** Fatos do projeto: conformidade = atividades (fora os marcos) com responsável e pacote da EAP; rastro completo = todo portão decidido tem decisão do DECIA. */
export function projectFacts(p: ProjectModel, reactions = 0, reuses = 0): TargetFacts {
  const work = p.tasks.filter((t) => !t.milestone);
  const conform = work.filter((t) => t.responsibleId && t.wbsId).length;
  const done = p.tasks.filter((t) => t.status === "CONCLUIDA");
  const decided = p.gates.filter((g) => g.outcome !== "PENDENTE");
  return {
    conformityPct: work.length ? Math.round((100 * conform) / work.length) : 0,
    traceComplete: decided.length > 0 && decided.every((g) => !!g.decisionId),
    deadlineMet: done.length > 0 && done.every(taskOnTime),
    reactions,
    reuses,
    decisionValidated: p.decisionIds.length > 0 || decided.some((g) => !!g.decisionId),
    pending: p.tasks.filter((t) => t.status !== "CONCLUIDA").length,
  };
}

const PLAN_FACTS: TargetFacts = { conformityPct: 92, traceComplete: true, deadlineMet: true, reactions: 11, reuses: 0, decisionValidated: true, pending: 0 };

/** Itens chanceláveis do DEMO; `reusesOf` traz as reutilizações do Balcão (projeto oferecido como modelo). */
export function demoSealTargets(reusesOf: (target: { type: SealTarget["type"]; id: string }) => number = () => 0): SealTarget[] {
  const p = buildDemoProject();
  const project: SealTarget = {
    type: "PROJETO", id: p.id, title: p.title, ownerId: p.charter.managerId ?? p.team[0]!.userId, ownerName: nameOf(p.charter.managerId ?? p.team[0]!.userId),
    department: DEMO_PROJECT_DEPARTMENT, involvedIds: p.team.map((m) => m.userId),
    facts: projectFacts(p, DEMO_REACTIONS[p.id] ?? 0, reusesOf({ type: "PROJETO", id: p.id })),
  };
  const tasks = p.tasks.filter((t) => t.status === "CONCLUIDA").map((t): SealTarget => {
    const owner = t.responsibleId ?? t.createdBy;
    return {
      type: "TAREFA", id: `${p.id}:${t.id}`, title: `${t.code} · ${t.title}`, ownerId: owner, ownerName: nameOf(owner), department: DEMO_PROJECT_DEPARTMENT,
      involvedIds: [...new Set([t.responsibleId, t.createdBy, t.reviewerId].filter((x): x is string => !!x))],
      facts: taskFacts(t, DEMO_REACTIONS[t.id] ?? 0, reusesOf({ type: "TAREFA", id: `${p.id}:${t.id}` })),
    };
  });
  const plan: SealTarget = {
    type: "PLANO", id: DEMO_PLAN_ID, title: "Plano Anual 2027 · CPOE", ownerId: CHEFE_ISSUER.id, ownerName: CHEFE_ISSUER.name, department: CHEFE_ISSUER.department,
    involvedIds: [CHEFE_ISSUER.id, "curadoria.exemplo", "u-pessoa"], facts: PLAN_FACTS,
  };
  return [project, ...tasks, plan];
}

export interface SealsSeed {
  seals: Seal[];
  benefits: Benefit[];
  bonds: SealBond[];
}

export function buildDemoSeals(now: Date, targets: readonly SealTarget[] = demoSealTargets()): SealsSeed {
  const year = now.getUTCFullYear();
  const cycle = { availableFrom: `${year}-01-01`, availableUntil: `${year}-12-31` };
  const created = ago(now, 120);
  const empresa = { issuerKind: "EMPRESA" as const, issuerId: EMPRESA_ISSUER.id, issuerName: EMPRESA_ISSUER.name, department: null };
  const chefe = { issuerKind: "CHEFE" as const, issuerId: CHEFE_ISSUER.id, issuerName: CHEFE_ISSUER.name, department: CHEFE_ISSUER.department };
  const seals: Seal[] = [
    { id: "ch-tarefa-exemplar", name: "Tarefa exemplar", ...empresa, tier: "TAREFA", excellence: false, ...cycle, usageLimit: null, usageCount: 5, createdAt: created,
      policy: { mode: "AUTO", criteria: [{ criterion: "PRAZO_CUMPRIDO", threshold: null }, { criterion: "SEM_PENDENCIA", threshold: 0 }, { criterion: "REACOES_MIN", threshold: 3 }] } },
    { id: "ch-referencia-tecnica", name: "Referência técnica", ...chefe, tier: "TAREFA", excellence: false, ...cycle, usageLimit: 20, usageCount: 2, createdAt: created,
      policy: { mode: "REVISAO", criteria: [{ criterion: "RASTRO_COMPLETO", threshold: null }, { criterion: "PRAZO_CUMPRIDO", threshold: null }, { criterion: "CONFORMIDADE_MIN", threshold: 75 }] } },
    { id: "ch-projeto-conforme", name: "Projeto conforme", ...chefe, tier: "PROJETO", excellence: false, ...cycle, usageLimit: 12, usageCount: 3, createdAt: created,
      policy: { mode: "REVISAO", criteria: [{ criterion: "CONFORMIDADE_MIN", threshold: 80 }, { criterion: "RASTRO_COMPLETO", threshold: null }, { criterion: "PRAZO_CUMPRIDO", threshold: null }] } },
    { id: "ch-excelencia", name: "Excelência da Secretaria", ...empresa, tier: "PROJETO", excellence: true, ...cycle, usageLimit: 3, usageCount: 1, createdAt: created,
      policy: { mode: "REVISAO", criteria: [{ criterion: "CONFORMIDADE_MIN", threshold: 90 }, { criterion: "DECISAO_VALIDADA", threshold: null }, { criterion: "REUTILIZACOES_MIN", threshold: 3 }] } },
    { id: "ch-plano-integrado", name: "Plano integrado", ...empresa, tier: "PLANO", excellence: false, ...cycle, usageLimit: null, usageCount: 0, createdAt: created,
      policy: { mode: "REVISAO", criteria: [{ criterion: "RASTRO_COMPLETO", threshold: null }, { criterion: "SEM_PENDENCIA", threshold: 0 }, { criterion: "DECISAO_VALIDADA", threshold: null }] } },
  ];
  const benefit = (b: Omit<Benefit, "createdAt" | "expiresAt"> & { expiresAt?: string | null }): Benefit => ({ expiresAt: null, ...b, createdAt: created });
  const benefits: Benefit[] = [
    benefit({ id: "bf-bonus-tarefa", sealId: "ch-tarefa-exemplar", type: "PONTOS_BONUS", credits: null, totalQuota: null, perUserLimit: 1, redeemedCount: 9 }),
    benefit({ id: "bf-ia-tarefa", sealId: "ch-tarefa-exemplar", type: "CREDITOS_IA", credits: 10, totalQuota: 50, perUserLimit: 1, redeemedCount: 12 }),
    benefit({ id: "bf-capacitacao", sealId: "ch-referencia-tecnica", type: "CAPACITACAO", credits: null, totalQuota: 10, perUserLimit: 1, redeemedCount: 3 }),
    benefit({ id: "bf-ia-projeto", sealId: "ch-projeto-conforme", type: "CREDITOS_IA", credits: 20, totalQuota: 30, perUserLimit: 1, redeemedCount: 7 }),
    benefit({ id: "bf-certificado", sealId: "ch-excelencia", type: "CERTIFICADO", credits: null, totalQuota: 3, perUserLimit: 1, redeemedCount: 1 }),
    benefit({ id: "bf-bonus-excelencia", sealId: "ch-excelencia", type: "PONTOS_BONUS", credits: null, totalQuota: null, perUserLimit: 1, redeemedCount: 4 }),
    benefit({ id: "bf-prioridade", sealId: "ch-plano-integrado", type: "PRIORIDADE_REVISAO", credits: null, totalQuota: null, perUserLimit: 1, redeemedCount: 0, expiresAt: `${year}-12-31` }),
  ];
  const target = (id: string) => targets.find((t) => t.id === id);
  const seal = (id: string) => seals.find((s) => s.id === id)!;
  const bond = (id: string, sealId: string, targetId: string, extra: Partial<SealBond> & Pick<SealBond, "basis" | "status" | "requestedBy">, daysAgo: number): SealBond[] => {
    const t = target(targetId);
    if (!t) return [];
    const s = seal(sealId);
    return [{
      id, sealId, targetType: t.type, targetId: t.id, targetTitle: t.title, targetOwnerId: t.ownerId, involvedIds: t.involvedIds, issuerId: s.issuerId,
      confidence: null, report: evaluatePolicy(s.policy, t.facts).results, autoIssued: false, reviewNote: null, reviewedBy: null,
      createdAt: ago(now, daysAgo), decidedAt: null, ...extra,
    }];
  };
  const projectTarget = target(DEMO_PROJECT_ID);
  const bonds: SealBond[] = [
    ...bond("bd-tarefa-ta", "ch-tarefa-exemplar", `${DEMO_PROJECT_ID}:tA`, { basis: "POLITICA", status: "APROVADA", requestedBy: EMPRESA_ISSUER.id, autoIssued: true, decidedAt: ago(now, 6) }, 6),
    ...bond("bd-tarefa-tp", "ch-referencia-tecnica", `${DEMO_PROJECT_ID}:tP`, { basis: "INDICACAO", status: "EM_REVISAO", requestedBy: "u-ana" }, 2),
    ...bond("bd-plano", "ch-plano-integrado", DEMO_PLAN_ID, { basis: "POLITICA", status: "EM_REVISAO", requestedBy: EMPRESA_ISSUER.id }, 1),
    ...bond("bd-projeto", "ch-projeto-conforme", DEMO_PROJECT_ID, {
      basis: projectTarget ? suggestionBasis(projectTarget) : "DEPARTAMENTO_MATCH", status: "REJEITADA", requestedBy: CHEFE_ISSUER.id, confidence: 33,
      reviewNote: "Rastro incompleto: os portões do projeto não têm decisão registrada no DECIA.", reviewedBy: CHEFE_ISSUER.id, decidedAt: ago(now, 4),
    }, 5),
  ];
  return { seals, benefits, bonds };
}
