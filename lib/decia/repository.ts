/**
 * DECIA — repositório em memória (DEMO) e o contrato `DecisionRepository`. Com sessão autenticada a UI usa o cliente HTTP real
 * (lib/decia/http.ts, `source: "API"`, fase 7); no laboratório (perfil de visualização sem sessão) continua este DEMO — a escolha
 * fica em `useDecisionRepository` (lib/decia/useDecisionRepository.ts). A UI só fala com a interface por `useDecisions`/`useDecision`.
 * No DEMO os dados vivem só na memória desta aba do navegador — recarregar volta aos exemplos.
 */
"use client";
import { useSyncExternalStore } from "react";
import { createDecision, type NewDecisionInput } from "./commands";
import { buildDemoDecisions } from "./fixtures";
import type { DecisionAggregate } from "./types";

export interface DecisionRepository {
  /** marca de origem dos dados ("DEMO" no mock; o cliente real devolve "API") */
  readonly source: "DEMO" | "API";
  list(): readonly DecisionAggregate[];
  get(id: string): DecisionAggregate | undefined;
  /** substitui o agregado inteiro (o comando já calculou a nova versão) */
  save(agg: DecisionAggregate): void;
  create(input: NewDecisionInput, now?: Date): DecisionAggregate;
  subscribe(listener: () => void): () => void;
}

export function createMemoryRepository(seed: readonly DecisionAggregate[]): DecisionRepository {
  let items: readonly DecisionAggregate[] = [...seed];
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  return {
    source: "DEMO",
    list: () => items,
    get: (id) => items.find((a) => a.decision.id === id),
    save(agg) {
      const i = items.findIndex((a) => a.decision.id === agg.decision.id);
      items = i < 0 ? [agg, ...items] : items.map((a, j) => (j === i ? agg : a));
      emit();
    },
    create(input, now = new Date()) {
      const agg = createDecision(input, now);
      items = [agg, ...items];
      emit();
      return agg;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

let demo: DecisionRepository | null = null;
/** Repositório DEMO da aba (criado na primeira leitura, com as datas relativas ao agora). */
export function demoRepository(): DecisionRepository {
  demo ??= createMemoryRepository(buildDemoDecisions(new Date()));
  return demo;
}
/** Só para testes: troca o repositório usado pelos hooks. */
export function setDemoRepository(repo: DecisionRepository | null) {
  demo = repo;
}

export function useDecisions(repo: DecisionRepository = demoRepository()): readonly DecisionAggregate[] {
  return useSyncExternalStore(repo.subscribe, repo.list, repo.list);
}

export function useDecision(id: string, repo: DecisionRepository = demoRepository()): DecisionAggregate | undefined {
  const list = useDecisions(repo);
  // `get` resolve também o id provisório de uma decisão recém-criada na API (lib/decia/http.ts)
  return repo.get(id) ?? list.find((a) => a.decision.id === id);
}
