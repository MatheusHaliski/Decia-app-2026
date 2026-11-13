/**
 * Plano de desenvolvimento da profissão (RF75.CA05/CA19 + RF81.CA04): as tarefas-guia do pacote da profissão preferida, na ordem de
 * `guidedTasks.priority`, sem as excluídas, cada uma já como modelo do criador (`packTemplates`, o mesmo do Acervo), e o progresso
 * pelas tarefas que a pessoa já criou a partir delas (`extensions.guidedTask` + `extensions.studyField` de um ramo do pacote).
 * Progresso por evidência ("3 de 12"), nunca score nem ranking (RF75.CA08); nada aqui sai da pessoa (D-147). Determinístico (D-12).
 * O código da tarefa-guia (L1, D4, X1…) é interno: a tela mostra o título, o tempo, o nível e o editor (D-153).
 */
import { COMPUTER_ONLY_TASKS, type GuidedTaskCode, type OccupationPack } from "./occupationPack";
import { packTemplates, type TaskTemplate } from "@/lib/tasks/templates";
import type { WorkArea } from "@/lib/tasks/client";

export const PLAN_STATUSES = ["CONCLUIDA", "EM_ANDAMENTO", "A_FAZER"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

/** O mínimo de uma tarefa do Acervo para medir o plano (a `TaskView` da API serve). */
export interface PlanTaskInput {
  id?: string;
  title?: string;
  state?: string;
  extensions?: Record<string, string>;
}

export interface PlanItem {
  /** modelo pronto para o criador (`/tasks/new?modelo=<id>`) */
  template: TaskTemplate;
  /** código interno da tarefa-guia — só para ligar ao modelo e ao progresso; nunca exibido */
  code: string;
  editor: "letters" | "drawings";
  /** exige computador (3D e vista explodida — d4 do guia) */
  computerOnly: boolean;
  status: PlanStatus;
  /** tarefa da pessoa que conta para o item (a concluída, se houver; senão a mais recente em andamento) */
  taskId?: string;
}

export interface DevelopmentPlan {
  fieldCode: string;
  area: WorkArea;
  items: PlanItem[];
  done: number;
  started: number;
  total: number;
  /** tarefas-guia priorizadas pelo pacote que ainda não têm modelo parametrizado para a profissão */
  withoutModel: number;
}

const DRAWINGS_TYPES = new Set(["DESENHO_TECNICO", "IMAGEM_EDITADA", "IMAGEM_WEB", "DIAGRAMA"]);

export function developmentPlan(pack: OccupationPack, fieldCode: string, area: WorkArea, tasks: readonly PlanTaskInput[] = []): DevelopmentPlan {
  const ownFields = new Set(pack.fields.length ? pack.fields : [fieldCode]);
  // só conta o que nasceu de uma tarefa-guia DESTA profissão: trocar de profissão não leva o progresso junto (RF81.CA08)
  const mine = tasks.filter((t) => t.extensions?.guidedTask && ownFields.has(t.extensions.studyField ?? "") && t.state !== "ARQUIVADA");
  const items = packTemplates(pack, area).map((template): PlanItem => {
    const code = template.tags?.[0] ?? template.id.split(".").pop() ?? "";
    const related = mine.filter((t) => t.extensions?.guidedTask === code);
    const finished = related.find((t) => t.state === "CONCLUIDA");
    const status: PlanStatus = finished ? "CONCLUIDA" : related.length ? "EM_ANDAMENTO" : "A_FAZER";
    return {
      template,
      code,
      editor: DRAWINGS_TYPES.has(template.type) ? "drawings" : "letters",
      computerOnly: (COMPUTER_ONLY_TASKS as readonly string[]).includes(code),
      status,
      taskId: (finished ?? related[0])?.id,
    };
  });
  const excluded = new Set(pack.guidedTasks.excluded.map((e) => e.code));
  const withoutModel = pack.guidedTasks.priority.filter((c: GuidedTaskCode) => !excluded.has(c) && !pack.guidedTasks.parameters[c]).length;
  return {
    fieldCode,
    area,
    items,
    done: items.filter((i) => i.status === "CONCLUIDA").length,
    started: items.filter((i) => i.status === "EM_ANDAMENTO").length,
    total: items.length,
    withoutModel,
  };
}

/** Próxima tarefa do plano: a primeira em andamento; senão a primeira a fazer (a ordem já é a prioridade do pacote). */
export const nextPlanItem = (plan: DevelopmentPlan): PlanItem | undefined =>
  plan.items.find((i) => i.status === "EM_ANDAMENTO") ?? plan.items.find((i) => i.status === "A_FAZER");
