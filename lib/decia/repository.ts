/**
 * DECIA — repositório em memória (DEMO) e o contrato `DecisionRepository`. Com sessão autenticada a UI usa o cliente HTTP real
 * (lib/decia/http.ts, `source: "API"`, fase 7); no laboratório (perfil de visualização sem sessão) continua este DEMO — a escolha
 * é ÚNICA e fica em `useDecisionSource` (lib/decia/useDecisionRepository.ts): toda tela que lê ou cria decisões (DECIA, Mesa de
 * projetos, tarefa, Relações, handoff, Memória) passa por ela. A UI só fala com a interface por `useDecisions`/`useDecision`.
 * No DEMO os dados vivem só na memória desta aba do navegador — recarregar volta aos exemplos.
 */
"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createDecision, type NewDecisionInput } from "./commands";
import { buildDemoDecisions } from "./fixtures";
import type { DecisionAggregate, WorkLinkTarget } from "./types";

export interface DecisionRepository {
  /** marca de origem dos dados ("DEMO" no mock; o cliente real devolve "API") */
  readonly source: "DEMO" | "API";
  list(): readonly DecisionAggregate[];
  get(id: string): DecisionAggregate | undefined;
  /** substitui o agregado inteiro (o comando já calculou a nova versão) */
  save(agg: DecisionAggregate): void;
  create(input: NewDecisionInput, now?: Date): DecisionAggregate;
  subscribe(listener: () => void): () => void;
  /** Carrega (se preciso) e espera as escritas em voo — para quem lê fora do React (handoff). */
  ready?(): Promise<void>;
  /**
   * Id definitivo de uma decisão criada agora: na API o `create` devolve um id provisório e o servidor dá o UUID depois; quem guarda o
   * id em outro lugar (a Mesa de projetos) espera por ele. No DEMO é o próprio id.
   */
  confirmedId?(id: string): Promise<string>;
  /** Busca no servidor as decisões ligadas a um item de trabalho (bloco "Decisões ligadas"); no DEMO a lista já tem tudo. */
  linkedTo?(type: WorkLinkTarget, targetId: string): Promise<void>;
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
    ready: () => Promise.resolve(),
    confirmedId: (id) => Promise.resolve(id),
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

/** Decisões com vínculo para o item de trabalho (tarefa, projeto, marco), da mesma fonte; na API pede a lista ao servidor. */
export function useLinkedDecisions(type: WorkLinkTarget, targetId: string, repo: DecisionRepository = demoRepository()): readonly DecisionAggregate[] {
  const list = useDecisions(repo);
  useEffect(() => {
    void repo.linkedTo?.(type, targetId);
  }, [repo, type, targetId]);
  return useMemo(() => linkedDecisions(list, type, targetId), [list, type, targetId]);
}

/** Puro: decisões com vínculo de trabalho para o alvo (a de projeto também pelo `projectId` da raiz). */
export function linkedDecisions(list: readonly DecisionAggregate[], type: WorkLinkTarget, targetId: string): DecisionAggregate[] {
  return list.filter((a) => a.workLinks.some((w) => w.targetType === type && w.targetId === targetId) || (type === "PROJETO" && a.decision.projectId === targetId));
}

export function useDecision(id: string, repo: DecisionRepository = demoRepository()): DecisionAggregate | undefined {
  const list = useDecisions(repo);
  // `get` resolve também o id provisório de uma decisão recém-criada na API (lib/decia/http.ts)
  return repo.get(id) ?? list.find((a) => a.decision.id === id);
}
