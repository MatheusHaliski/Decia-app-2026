/**
 * Cenários salvos do Simulador (RF31.CA03 "salvar como variante") — repositório em memória (DEMO). A API de cenários
 * (`/api/projects/{id}/scenarios`) ainda não existe e não é presumida: a UI só fala com `ScenarioRepository`; um cliente HTTP real
 * o implementará depois. O cenário salvo guarda as ALAVANCAS (o `variablesJson`) e um retrato dos números de quando foi salvo; os
 * números mostrados são sempre recalculados sobre o projeto atual. Os dados vivem só nesta aba do navegador.
 */
"use client";
import { useSyncExternalStore } from "react";
import { DEMO_PROJECT_ID } from "../fixtures";
import type { Lever } from "./types";

export interface SavedScenario {
  id: string;
  projectId: string;
  name: string;
  levers: Lever[];
  savedAt: string;
  savedBy: string;
  /** versão do projeto quando foi salvo (para avisar que o projeto mudou desde então) */
  projectVersion: number;
  /** números de quando foi salvo (o `impactReportJson`, resumido) */
  snapshot?: { finish: number; eac: number; probability: number | null; p80: number | null };
  /** enviado à aprovação: a solicitação de mudança aberta e a decisão do comitê no DECIA */
  submission?: { changeId: string; changeCode: string; decisionId: string; at: string; by: string };
}

export interface ScenarioRepository {
  readonly source: "DEMO" | "API";
  list(projectId: string): SavedScenario[];
  get(id: string): SavedScenario | undefined;
  save(scenario: SavedScenario): SavedScenario;
  remove(id: string): void;
  subscribe(listener: () => void): () => void;
  snapshot(): number;
}

export function createMemoryScenarioRepository(seed: readonly SavedScenario[] = []): ScenarioRepository {
  const items = new Map(seed.map((s) => [s.id, s]));
  const listeners = new Set<() => void>();
  let tick = 0;
  const emit = () => {
    tick += 1;
    listeners.forEach((l) => l());
  };
  return {
    source: "DEMO",
    list: (projectId) => [...items.values()].filter((s) => s.projectId === projectId),
    get: (id) => items.get(id),
    save(scenario) {
      items.set(scenario.id, scenario);
      emit();
      return scenario;
    },
    remove(id) {
      if (items.delete(id)) emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => tick,
  };
}

let seq = 0;
/** Identificador local (DEMO); a API real devolverá UUIDs. */
export const newScenarioId = () => `sc-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/** Três cenários de exemplo do projeto DEMO (os do README: corte, atraso de fornecedor e mudança de escopo). */
export function demoScenarios(): SavedScenario[] {
  const base = { projectId: DEMO_PROJECT_ID, savedAt: "2026-11-11T15:00:00Z", savedBy: "u-pessoa", projectVersion: 4 } as const;
  return [
    { ...base, id: "sc-corte-escopo", name: "Corte de 10% no escopo de menor prioridade", levers: [{ kind: "CORTE_ORCAMENTO", mode: "PERCENTUAL", value: 10, source: "ESCOPO" }] },
    {
      ...base, id: "sc-nuvem-atrasa", name: "Fornecedor de nuvem atrasa 10 dias",
      levers: [{ kind: "ATRASO_FORNECEDOR", days: 10, mode: "ENTREGA", supplier: "Fornecedor de nuvem", target: { riskIds: ["k1"] } }],
    },
    {
      ...base, id: "sc-relatorios", name: "Módulo de relatórios (MUD-01) e nuvem 15% mais cara",
      levers: [
        { kind: "ESCOPO_INCLUIR", title: "Módulo de relatórios gerenciais", phase: "EXECUCAO", durationDays: 5, budget: 8000, afterTaskId: "tD", beforeTaskId: "tE", moscow: "SHOULD" },
        { kind: "REAJUSTE_PRECO", pct: 15, budgetLineIds: ["b2"], target: {} },
      ],
    },
  ];
}

let demo: ScenarioRepository | null = null;
export function demoScenarioRepository(): ScenarioRepository {
  demo ??= createMemoryScenarioRepository(demoScenarios());
  return demo;
}
/** Só para testes: troca o repositório usado pelos hooks. */
export function setDemoScenarioRepository(repo: ScenarioRepository | null) {
  demo = repo;
}

export function useSavedScenarios(projectId: string, repo: ScenarioRepository = demoScenarioRepository()): SavedScenario[] {
  useSyncExternalStore(repo.subscribe, repo.snapshot, repo.snapshot);
  return repo.list(projectId);
}

/** `?compare=a,b,c` → até 3 ids distintos, na ordem; o resto é ignorado (o servidor recusaria com 422 VALIDACAO details.ids). */
export function parseCompare(param: string | null | undefined, max = 3): { ids: string[]; ignored: string[] } {
  const all = (param ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ids: string[] = [];
  const ignored: string[] = [];
  for (const id of all) {
    if (ids.includes(id)) continue;
    if (ids.length < max) ids.push(id);
    else ignored.push(id);
  }
  return { ids, ignored };
}

export const compareParam = (ids: readonly string[]) => ids.filter(Boolean).slice(0, 3).join(",");
