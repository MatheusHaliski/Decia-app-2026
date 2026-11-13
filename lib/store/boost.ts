/**
 * Alvos do impulso no Mural (RF42.CA04, `MuralEntry.boostUntil`): os itens de trabalho DEMO que podem subir no Mural da empresa —
 * o projeto de exemplo e as tarefas dele já concluídas (lib/projects/fixtures, só leitura). O Mural real (RF27) passa a ler o
 * impulso quando a API existir; aqui ele fica registrado na Loja com a validade.
 */
import { buildDemoProject } from "@/lib/projects/fixtures";

export interface BoostTarget {
  type: "PROJETO" | "TAREFA";
  id: string;
  title: string;
}

let cache: readonly BoostTarget[] | null = null;

export function demoBoostTargets(): readonly BoostTarget[] {
  if (cache) return cache;
  const project = buildDemoProject();
  cache = [
    { type: "PROJETO", id: project.id, title: project.title },
    ...project.tasks.filter((t) => t.status === "CONCLUIDA").map((t): BoostTarget => ({ type: "TAREFA", id: `${project.id}:${t.id}`, title: `${t.code} · ${t.title}` })),
  ];
  return cache;
}
