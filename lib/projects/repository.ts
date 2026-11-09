/**
 * Repositório de projetos em memória (DEMO) — a API de projetos (`/api/projects/{id}/desk`, RF22) ainda não existe e não é
 * presumida. Mesmo contrato do DECIA (`lib/decia/repository.ts`): a UI só fala com `ProjectRepository`; um cliente HTTP real o
 * implementará depois. Os dados vivem só nesta aba do navegador — recarregar volta ao exemplo.
 */
"use client";
import { useSyncExternalStore } from "react";
import { applyCommand, type CommandContext, type CommandResult, type ProjectCommand } from "./commands";
import { buildDemoProject } from "./fixtures";
import type { ProjectModel } from "./types";

export interface ProjectRepository {
  readonly source: "DEMO" | "API";
  get(id: string): ProjectModel | undefined;
  /** aplica um comando e notifica; devolve o resultado (erros não mudam nada) */
  dispatch(id: string, cmd: ProjectCommand, ctx: CommandContext): CommandResult;
  subscribe(listener: () => void): () => void;
  snapshot(): number;
}

export function createMemoryProjectRepository(seed: readonly ProjectModel[]): ProjectRepository {
  const items = new Map(seed.map((p) => [p.id, p]));
  const listeners = new Set<() => void>();
  let tick = 0;
  return {
    source: "DEMO",
    get: (id) => items.get(id),
    dispatch(id, cmd, ctx) {
      const current = items.get(id);
      if (!current) return { ok: false, error: "NAO_ENCONTRADO", detail: id };
      const r = applyCommand(current, cmd, ctx);
      if (r.ok && r.model !== current) {
        items.set(id, r.model);
        tick += 1;
        listeners.forEach((l) => l());
      }
      return r;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => tick,
  };
}

let demo: ProjectRepository | null = null;
export function demoProjectRepository(): ProjectRepository {
  demo ??= createMemoryProjectRepository([buildDemoProject()]);
  return demo;
}
/** Só para testes: troca o repositório usado pelos hooks. */
export function setDemoProjectRepository(repo: ProjectRepository | null) {
  demo = repo;
}

export function useProject(id: string, repo: ProjectRepository = demoProjectRepository()): ProjectModel | undefined {
  useSyncExternalStore(repo.subscribe, repo.snapshot, repo.snapshot);
  return repo.get(id);
}
