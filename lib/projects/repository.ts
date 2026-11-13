/**
 * Repositório de projetos em memória (DEMO) — a API de projetos (`/api/projects/{id}/desk`, RF22) ainda não existe e não é
 * presumida. Mesmo contrato do DECIA (`lib/decia/repository.ts`): a UI só fala com `ProjectRepository`; um cliente HTTP real o
 * implementará depois. Os dados vivem só nesta aba do navegador — recarregar volta ao exemplo.
 *
 * Histórico (RF22.CA02): a cada versão o repositório guarda o RETRATO do projeto (`ProjectVersion.snapshotJson`) — estrutura,
 * prazos e posições do canvas. Ajustes de posição (que não geram versão, RF22.CA03) atualizam o retrato da versão vigente; assim
 * "voltar a esta versão" devolve o projeto como estava logo antes da versão seguinte, com o canvas daquele momento.
 */
"use client";
import { useMemo, useSyncExternalStore } from "react";
import { applyCommand, snapshotOf, type CommandContext, type CommandResult, type ProjectCommand } from "./commands";
import { buildDemoProject } from "./fixtures";
import type { ProjectModel, ProjectSnapshot } from "./types";

export type CreateProjectResult = { ok: true; model: ProjectModel } | { ok: false; error: "JA_EXISTE" | "VALOR_INVALIDO"; detail?: string };

export interface ProjectRepository {
  readonly source: "DEMO" | "API";
  get(id: string): ProjectModel | undefined;
  /** aplica um comando e notifica; devolve o resultado (erros não mudam nada) */
  dispatch(id: string, cmd: ProjectCommand, ctx: CommandContext): CommandResult;
  subscribe(listener: () => void): () => void;
  snapshot(): number;
  // --- capacidades de catálogo e histórico (RF21 "Minha mesa", RF30 Autopiloto, RF22.CA02); o cliente HTTP real terá todas,
  //     um repositório só de leitura (ex.: em testes) pode omiti-las ---
  /** projetos desta aba, do alterado mais recentemente ao mais antigo (`GET /api/projects?mine`) */
  list?(): ProjectModel[];
  /** cria um projeto (em branco, de modelo ou gerado pelo Autopiloto) já com a versão 1; recusa id repetido (`POST /api/projects`) */
  create?(model: ProjectModel): CreateProjectResult;
  /** retrato de uma versão (`GET /api/projects/{id}/versions/{n}`); ausente para versões anteriores a esta aba */
  versionSnapshot?(id: string, number: number): ProjectSnapshot | undefined;
  /** volta à versão `number` gerando uma versão nova (`POST /api/projects/{id}/versions/{n}/restore`) */
  restoreVersion?(id: string, number: number, ctx: CommandContext): CommandResult;
}

const VALID_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;

export function createMemoryProjectRepository(seed: readonly ProjectModel[]): ProjectRepository {
  const items = new Map(seed.map((p) => [p.id, p]));
  /** retratos por projeto e número de versão */
  const history = new Map<string, Map<number, ProjectSnapshot>>();
  /** ordem de uso (maior = alterado mais recentemente); a semente fica na ordem em que veio */
  const touched = new Map<string, number>(seed.map((p, i) => [p.id, -seed.length + i]));
  const listeners = new Set<() => void>();
  let tick = 0;

  const remember = (model: ProjectModel) => {
    const byVersion = history.get(model.id) ?? new Map<number, ProjectSnapshot>();
    byVersion.set(model.version, snapshotOf(model));
    history.set(model.id, byVersion);
  };
  seed.forEach(remember);
  const changed = (id: string) => {
    tick += 1;
    touched.set(id, tick);
    listeners.forEach((l) => l());
  };

  const repo: ProjectRepository = {
    source: "DEMO",
    get: (id) => items.get(id),
    dispatch(id, cmd, ctx) {
      const current = items.get(id);
      if (!current) return { ok: false, error: "NAO_ENCONTRADO", detail: id };
      const r = applyCommand(current, cmd, ctx);
      if (r.ok && r.model !== current) {
        items.set(id, r.model);
        // versão nova ganha retrato próprio; ajuste sem versão (posição no canvas) atualiza o retrato da versão vigente
        remember(r.model);
        changed(id);
      }
      return r;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => tick,
    list: () => [...items.values()].sort((a, b) => (touched.get(b.id) ?? 0) - (touched.get(a.id) ?? 0)),
    create(model) {
      if (!VALID_ID.test(model.id)) return { ok: false, error: "VALOR_INVALIDO", detail: "id" };
      if (!model.title.trim()) return { ok: false, error: "VALOR_INVALIDO", detail: "title" };
      if (items.has(model.id)) return { ok: false, error: "JA_EXISTE", detail: model.id };
      items.set(model.id, model);
      remember(model);
      changed(model.id);
      return { ok: true, model };
    },
    versionSnapshot: (id, number) => history.get(id)?.get(number),
    restoreVersion(id, number, ctx) {
      const snapshot = history.get(id)?.get(number);
      if (!items.has(id)) return { ok: false, error: "NAO_ENCONTRADO", detail: id };
      if (!snapshot) return { ok: false, error: "NAO_ENCONTRADO", detail: `v${number}` };
      return repo.dispatch(id, { type: "VERSION_RESTORE", number, snapshot }, ctx);
    },
  };
  return repo;
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

/** Projetos da aba (RF21 "Minha mesa"); repositório sem `list` devolve lista vazia. */
export function useProjects(repo: ProjectRepository = demoProjectRepository()): ProjectModel[] {
  const tick = useSyncExternalStore(repo.subscribe, repo.snapshot, repo.snapshot);
  // `tick` muda a cada alteração do repositório: é ele que refaz a lista
  return useMemo(() => repo.list?.() ?? [], [repo, tick]);
}
