/**
 * Dependência circular (RF49.CA08): "A espera B" vira aresta A → B entre tarefas. Um pacto liga a tarefa travada de quem pede
 * (`dependentTaskId`) à tarefa que produz a entrega (`deliverableTaskId`); as dependências da Mesa entram como "sucessora espera
 * predecessora". Antes de gravar, se já existe caminho B →* A, o pacto fecharia um ciclo: é recusado com a causa (o caminho),
 * sem gravar nada. Prioridade entre pedidos nunca é decidida aqui (nem pela IA) — vai para as chefias.
 */
import type { ProjectModel } from "@/lib/projects/types";
import { OPEN_PACT_STATES, type CooperationPact } from "./types";

export interface DependencyEdge {
  /** tarefa que espera */
  from: string;
  /** tarefa esperada */
  to: string;
  /** origem da aresta (id do pacto ou "mesa:<id da dependência>") */
  via: string;
}

/** Arestas dos pactos em aberto que ligam tarefa travada → tarefa que entrega. */
export function edgesFromPacts(pacts: readonly CooperationPact[]): DependencyEdge[] {
  return pacts
    .filter((p) => OPEN_PACT_STATES.includes(p.status) && p.dependentTaskId && p.deliverableTaskId)
    .map((p) => ({ from: p.dependentTaskId!, to: p.deliverableTaskId!, via: p.id }));
}

/** Arestas da Mesa do projeto (somente leitura): a sucessora espera a predecessora. */
export function edgesFromProject(model: Pick<ProjectModel, "dependencies">): DependencyEdge[] {
  return model.dependencies.map((d) => ({ from: d.to, to: d.from, via: `mesa:${d.id}` }));
}

/**
 * Se acrescentar `from → to` fecha um ciclo, devolve o caminho que já existe de `to` até `from` (as tarefas na ordem), senão
 * null. Busca em largura determinística (arestas ordenadas).
 */
export function findCycle(edges: readonly DependencyEdge[], from: string, to: string): string[] | null {
  if (from === to) return [from];
  const next = new Map<string, string[]>();
  for (const e of [...edges].sort((a, b) => (a.from + a.to < b.from + b.to ? -1 : 1))) next.set(e.from, [...(next.get(e.from) ?? []), e.to]);
  const prev = new Map<string, string>();
  const queue = [to];
  const seen = new Set([to]);
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === from) {
      const path = [from];
      let p = from;
      while (prev.has(p)) {
        p = prev.get(p)!;
        path.unshift(p);
      }
      return path;
    }
    for (const n of next.get(cur) ?? []) {
      if (seen.has(n)) continue;
      seen.add(n);
      prev.set(n, cur);
      queue.push(n);
    }
  }
  return null;
}
