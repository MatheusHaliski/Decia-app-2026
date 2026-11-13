/**
 * Impedimentos (RF49) — de onde vêm, sempre SOMENTE LEITURA sobre os outros módulos:
 * - Acervo DEMO (`lib/social`): tarefa no estado BLOQUEADA com a causa registrada (o bloqueio já exige causa, TaskItem.block);
 * - Mesa do projeto DEMO (`lib/projects`): atividade ainda não iniciada que espera (FS) uma predecessora também não iniciada e de
 *   outra pessoa — o trabalho de alguém depende de outra pessoa começar. Quem depende = a atividade e as sucessoras dela;
 * - registro manual (comando REGISTRAR_IMPEDIMENTO): o que trava, desde quando e quem depende.
 * "Desde quando": o Acervo DEMO não guarda a data do bloqueio, então usa-se a data de criação da tarefa (o mais antigo possível,
 * nunca inventado); na Mesa, a data de entrada da atividade no projeto.
 */
import type { ProjectModel, Task as ProjectTask } from "@/lib/projects/types";
import type { SocialTask } from "@/lib/social/types";
import { departmentOf, personName, personOf, type OrgDirectory } from "./org";
import type { AccessClass, Impediment } from "./types";

export function impedimentsFromAcervo(tasks: readonly SocialTask[], org: OrgDirectory, projectsOf: (taskId: string) => readonly string[] = () => []): Impediment[] {
  return tasks
    .filter((t) => t.state === "BLOQUEADA")
    .map((t) => {
      const dependents: Impediment["dependents"] = [{ label: personName(org, t.ownerId), userId: t.ownerId }];
      if (t.responsibleId && t.responsibleId !== t.ownerId) dependents.push({ label: personName(org, t.responsibleId), userId: t.responsibleId });
      for (const title of projectsOf(t.id)) dependents.push({ label: title, userId: null });
      return {
        id: `imp-${t.id}`,
        source: "ACERVO" as const,
        taskId: t.id,
        title: t.title,
        blockedBy: t.blockReason?.trim() || "—",
        since: t.createdAt.slice(0, 10),
        dependents,
        ownerId: t.ownerId,
        departmentId: t.departmentId ?? personOf(org, t.ownerId)?.departmentId ?? "",
        accessClass: t.accessClass as AccessClass,
        suggestedTarget: null,
        watchers: [],
        createdAt: t.createdAt,
      };
    });
}

/** Sucessoras (transitivas) de uma atividade na Mesa — "quem depende" do desbloqueio. */
function successorsOf(model: ProjectModel, taskId: string): ProjectTask[] {
  const out: ProjectTask[] = [];
  const seen = new Set<string>([taskId]);
  const queue = [taskId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const d of model.dependencies.filter((x) => x.from === cur).sort((a, b) => (a.to < b.to ? -1 : 1))) {
      if (seen.has(d.to)) continue;
      seen.add(d.to);
      const t = model.tasks.find((x) => x.id === d.to);
      if (t) out.push(t);
      queue.push(d.to);
    }
  }
  return out;
}

export function impedimentsFromProject(model: ProjectModel, org: OrgDirectory, homeDepartmentId: string): Impediment[] {
  const manager = model.team.find((m) => m.role === "GERENTE")?.userId ?? model.charter.managerId ?? null;
  const out: Impediment[] = [];
  for (const dep of [...model.dependencies].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (dep.type !== "FS") continue;
    const pred = model.tasks.find((t) => t.id === dep.from);
    const succ = model.tasks.find((t) => t.id === dep.to);
    if (!pred || !succ || pred.status !== "A_FAZER" || succ.status !== "A_FAZER" || !pred.responsibleId) continue;
    const owner = succ.responsibleId ?? manager;
    if (!owner || owner === pred.responsibleId) continue;
    const label = (t: ProjectTask) => `${t.code} ${t.title}${t.responsibleId ? ` (${personName(org, t.responsibleId)})` : ""}`;
    const ownerDept = personOf(org, owner)?.departmentId ?? homeDepartmentId;
    const predDept = personOf(org, pred.responsibleId)?.departmentId ?? null;
    // só sugere pactuar com quem está na mesma empresa (escopo inicial do RF49)
    const sameCompany = !!predDept && departmentOf(org, predDept)?.companyId === departmentOf(org, ownerDept)?.companyId;
    out.push({
      id: `imp-mesa-${model.id}-${dep.id}`,
      source: "MESA",
      taskId: succ.id,
      title: `${succ.code} ${succ.title}`,
      blockedBy: `${pred.code} ${pred.title} — ainda não iniciada (${personName(org, pred.responsibleId)})`,
      since: (succ.createdAt ?? `${model.startDate}T00:00:00Z`).slice(0, 10),
      dependents: [succ, ...successorsOf(model, succ.id)].map((t) => ({ label: label(t), userId: t.responsibleId ?? null })),
      ownerId: owner,
      departmentId: ownerDept,
      accessClass: "INTERNO",
      suggestedTarget: sameCompany ? { kind: "PESSOA", departmentId: predDept!, userId: pred.responsibleId } : null,
      watchers: manager && manager !== owner ? [manager] : [],
      createdAt: succ.createdAt ?? `${model.startDate}T00:00:00Z`,
    });
  }
  return out;
}
