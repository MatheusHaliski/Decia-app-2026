/**
 * Tarefa do Dia (RF44.CA01) com o prazo em primeiro lugar (RF41.CA04): regra PURA e determinística (D-12; nada de IA). Entre as tarefas
 * que dá para tocar hoje (rascunho, a realizar, em andamento — bloqueada não entra), vence a de prazo efetivo mais próximo (o menor entre
 * o prazo da tarefa e o prazo legal; vencidas primeiro); empate → prazo legal, prioridade maior, em andamento, título. Sem nenhuma com
 * prazo, vale a de maior prioridade. O motivo volta junto, para a tela dizer POR QUE esta é a sugerida.
 */
import { effectiveDueOf } from "./acervo";
import type { PriorityName, TaskStateName, TaskView } from "./client";
import { deadlineStatus } from "./legalDeadline";

/** Por que a tarefa foi sugerida: situação do prazo efetivo, ou só a prioridade (sem prazo). */
export type DailyReason = "VENCIDA" | "HOJE" | "PROXIMA" | "COM_PRAZO" | "PRIORIDADE";

export interface DailySuggestion {
  task: TaskView;
  reason: DailyReason;
  /** prazo efetivo AAAA-MM-DD (nulo quando o motivo é a prioridade) */
  due: string | null;
  /** dias até o prazo (negativo = vencida há |days| dias) */
  days: number | null;
  /** o prazo efetivo é o legal */
  legal: boolean;
  /** as próximas na mesma ordem (até 2), para a pessoa ver o que vem depois */
  next: TaskView[];
}

const WORKABLE: ReadonlySet<TaskStateName> = new Set<TaskStateName>(["RASCUNHO", "DISPONIVEL", "EM_USO"]);
const RANK: Record<PriorityName, number> = { CRITICA: 3, ALTA: 2, MEDIA: 1, BAIXA: 0 };
const rank = (p: PriorityName | undefined) => RANK[p ?? "MEDIA"] ?? 1;
const dueOf = (t: TaskView) => effectiveDueOf(t.dueAt, t.legalDueAt);
const isLegal = (t: TaskView, due: string | null) => !!due && !!t.legalDueAt && t.legalDueAt.slice(0, 10) === due;

/** Ordem da sugestão (exportada para os testes): com prazo antes, prazo mais próximo, legal, prioridade, em andamento, título. */
export function compareDaily(a: TaskView, b: TaskView): number {
  const da = dueOf(a);
  const db = dueOf(b);
  if (da && db && da !== db) return da < db ? -1 : 1;
  if (!!da !== !!db) return da ? -1 : 1;
  const legal = Number(isLegal(b, db)) - Number(isLegal(a, da));
  if (legal) return legal;
  const pr = rank(b.priority) - rank(a.priority);
  if (pr) return pr;
  const started = Number(b.state === "EM_USO") - Number(a.state === "EM_USO");
  if (started) return started;
  return (a.title ?? "").localeCompare(b.title ?? "", "pt-BR");
}

export function suggestDailyTask(tasks: readonly TaskView[], today: string): DailySuggestion | null {
  const candidates = tasks.filter((t) => !!t.id && WORKABLE.has((t.state ?? "RASCUNHO") as TaskStateName)).sort(compareDaily);
  const task = candidates[0];
  if (!task) return null;
  const due = dueOf(task);
  const next = candidates.slice(1, 3);
  if (!due) return { task, reason: "PRIORIDADE", due: null, days: null, legal: false, next };
  const st = deadlineStatus(due, today);
  const reason: DailyReason = st.kind === "VENCIDA" ? "VENCIDA" : st.kind === "HOJE" ? "HOJE" : st.kind === "PROXIMA" ? "PROXIMA" : "COM_PRAZO";
  return { task, reason, due, days: st.days, legal: isLegal(task, due), next };
}

/** Chave i18n do motivo (singular/plural por dias). */
export function dailyReasonKey(s: Pick<DailySuggestion, "reason" | "days">): string {
  const one = s.days !== null && Math.abs(s.days) === 1;
  switch (s.reason) {
    case "VENCIDA": return one ? "prazosdiarios.daily.reason.overdueOne" : "prazosdiarios.daily.reason.overdue";
    case "HOJE": return "prazosdiarios.daily.reason.today";
    case "PROXIMA":
    case "COM_PRAZO": return one ? "prazosdiarios.daily.reason.soonOne" : "prazosdiarios.daily.reason.soon";
    default: return "prazosdiarios.daily.reason.priority";
  }
}
