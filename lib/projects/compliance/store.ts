/**
 * Estado do Espelho de Conformidade (RF32) — repositório em memória (DEMO), no mesmo padrão de `lib/projects/repository.ts`. A API
 * (`/api/checklists`, `/api/projects/{id}/mirror`) ainda não existe e não é presumida. Guarda:
 *  - o checklist do DEPARTAMENTO, que o chefe cria e edita (RF32.CA01; cada edição sobe a versão);
 *  - por projeto: os itens marcados "não se aplica" com justificativa, as referências tarefa → item (tarefas criadas pelo Espelho)
 *    e a justificativa do chefe para passar à Aprovação com obrigatórios pendentes (RF32.CA04).
 * Os dados vivem só nesta aba do navegador.
 */
"use client";
import { useMemo, useSyncExternalStore } from "react";
import { departmentSeed, defaultChecklists } from "./catalog";
import type { ApprovalOverride } from "./evaluate";
import type { ComplianceChecklist, ComplianceItem, MirrorContext, TaskLink, Waiver } from "./types";

export interface ProjectComplianceState { waivers: Record<string, Waiver>; links: TaskLink[]; override: ApprovalOverride | null }

export interface ComplianceRepository {
  readonly source: "DEMO" | "API";
  department(): ComplianceChecklist;
  /** cria ou substitui um item do checklist do departamento (só o chefe; a tela confere o perfil) */
  saveDepartmentItem(item: ComplianceItem): void;
  removeDepartmentItem(id: string): void;
  project(projectId: string): ProjectComplianceState;
  waive(projectId: string, waiver: Waiver): void;
  unwaive(projectId: string, itemId: string): void;
  link(projectId: string, links: readonly TaskLink[]): void;
  setOverride(projectId: string, override: ApprovalOverride | null): void;
  subscribe(listener: () => void): () => void;
  snapshot(): number;
}

const EMPTY: ProjectComplianceState = { waivers: {}, links: [], override: null };

export function createMemoryComplianceRepository(department: ComplianceChecklist = departmentSeed()): ComplianceRepository {
  let dept = department;
  const projects = new Map<string, ProjectComplianceState>();
  const listeners = new Set<() => void>();
  let tick = 0;
  const emit = () => {
    tick += 1;
    listeners.forEach((l) => l());
  };
  const bump = (items: ComplianceItem[]) => {
    dept = { ...dept, items, version: String((Number(dept.version) || 0) + 1) };
    emit();
  };
  const update = (projectId: string, fn: (s: ProjectComplianceState) => ProjectComplianceState) => {
    projects.set(projectId, fn(projects.get(projectId) ?? EMPTY));
    emit();
  };
  return {
    source: "DEMO",
    department: () => dept,
    saveDepartmentItem(item) {
      const exists = dept.items.some((x) => x.id === item.id);
      bump(exists ? dept.items.map((x) => (x.id === item.id ? item : x)) : [...dept.items, item]);
    },
    removeDepartmentItem(id) {
      if (dept.items.some((x) => x.id === id)) bump(dept.items.filter((x) => x.id !== id));
    },
    project: (projectId) => projects.get(projectId) ?? EMPTY,
    waive: (projectId, waiver) => update(projectId, (s) => ({ ...s, waivers: { ...s.waivers, [waiver.itemId]: waiver } })),
    unwaive: (projectId, itemId) =>
      update(projectId, (s) => {
        const waivers = { ...s.waivers };
        delete waivers[itemId];
        return { ...s, waivers };
      }),
    link: (projectId, links) => update(projectId, (s) => ({ ...s, links: [...s.links.filter((l) => !links.some((n) => n.taskId === l.taskId)), ...links] })),
    setOverride: (projectId, override) => update(projectId, (s) => ({ ...s, override })),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => tick,
  };
}

let demo: ComplianceRepository | null = null;
export function demoComplianceRepository(): ComplianceRepository {
  demo ??= createMemoryComplianceRepository();
  return demo;
}
/** Só para testes: troca o repositório usado pelos hooks. */
export function setDemoComplianceRepository(repo: ComplianceRepository | null) {
  demo = repo;
}

/** Contexto da verificação: catálogo do sistema + checklist atual do departamento + o que foi marcado e ligado neste projeto. */
export function complianceContext(repo: ComplianceRepository, projectId: string): MirrorContext {
  const s = repo.project(projectId);
  return { checklists: defaultChecklists(repo.department()), waivers: s.waivers, links: s.links };
}

export function useCompliance(projectId: string, repo: ComplianceRepository = demoComplianceRepository()) {
  const tick = useSyncExternalStore(repo.subscribe, repo.snapshot, repo.snapshot);
  return useMemo(() => {
    void tick;
    return { department: repo.department(), state: repo.project(projectId), ctx: complianceContext(repo, projectId) };
  }, [repo, projectId, tick]);
}

/** Próximo código livre de item do departamento ("DEP-5"…). */
export function nextDepartmentCode(items: readonly ComplianceItem[]): string {
  const nums = items.map((x) => Number(x.code.replace(/^\D+/, ""))).filter((n) => Number.isFinite(n));
  return `DEP-${(nums.length ? Math.max(...nums) : 0) + 1}`;
}
