/**
 * Dossiês de Transição — repositório em memória (DEMO). A API do RF36 (`POST /api/handoffs`, aceite e recusa) ainda não existe e não
 * é presumida: a interface `HandoffRepository` é o contrato que um cliente HTTP real implementará depois; a tela só fala com ela. Os
 * dados vivem só nesta aba do navegador — recarregar volta ao exemplo (mesmo padrão de `lib/decia/repository.ts`).
 */
"use client";
import { useSyncExternalStore } from "react";
import { buildDemoDecisions, DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { tr } from "@/lib/i18n/core";
import { buildDemoProject } from "@/lib/projects/fixtures";
import { collectDossier } from "./collect";
import { buildDemoHandoffTasks } from "./fixtures";
import type { HandoffDossier } from "./types";
import { createDossier, sendToSuccessors } from "./workflow";

export interface HandoffRepository {
  readonly source: "DEMO" | "API";
  list(): readonly HandoffDossier[];
  get(id: string): HandoffDossier | undefined;
  /** grava a versão nova (o comando puro já calculou) */
  save(d: HandoffDossier): void;
  subscribe(listener: () => void): () => void;
}

export function createMemoryHandoffRepository(seed: readonly HandoffDossier[]): HandoffRepository {
  let items: readonly HandoffDossier[] = [...seed];
  const listeners = new Set<() => void>();
  return {
    source: "DEMO",
    list: () => items,
    get: (id) => items.find((d) => d.id === id),
    save(d) {
      const i = items.findIndex((x) => x.id === d.id);
      items = i < 0 ? [d, ...items] : items.map((x, j) => (j === i ? d : x));
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

/** Exemplo: a saída de Diego Exemplo, pedida pela chefia, já enviada à Pessoa Exemplo (que pode dar ciência no laboratório). */
export function buildDemoDossiers(now: Date): HandoffDossier[] {
  const today = now.toISOString().slice(0, 10);
  const effective = new Date(now.getTime() + 14 * 86_400_000).toISOString().slice(0, 10);
  const collected = collectDossier({
    subject: { id: "u-diego", name: DEMO_PEOPLE["u-diego"]!.name },
    today,
    consentForPrivateItems: false,
    people: DEMO_PEOPLE,
    projects: [buildDemoProject()],
    decisions: buildDemoDecisions(now),
    tasks: buildDemoHandoffTasks(now),
    taskSource: "DEMO",
  });
  const at = new Date(now.getTime() - 2 * 86_400_000).toISOString();
  const created = createDossier({
    id: "dossie-exemplo-diego",
    subject: { id: "u-diego", name: DEMO_PEOPLE["u-diego"]!.name },
    reason: "SAIDA",
    effectiveDate: effective,
    today,
    requestedBy: { id: "viewer:CHEFE", name: tr("viewer.name.chefe"), profile: "CHEFE" },
    consentForPrivateItems: false,
    defaultSuccessorId: "u-pessoa",
    collected,
    now: at,
  });
  const sent = sendToSuccessors(created, "viewer:CHEFE", at);
  return [sent.ok ? sent.dossier : created];
}

let demo: HandoffRepository | null = null;
export function demoHandoffRepository(): HandoffRepository {
  demo ??= createMemoryHandoffRepository(buildDemoDossiers(new Date()));
  return demo;
}
/** Só para testes: troca o repositório usado pelos hooks. */
export function setDemoHandoffRepository(repo: HandoffRepository | null) {
  demo = repo;
}

export function useHandoffs(repo: HandoffRepository = demoHandoffRepository()): readonly HandoffDossier[] {
  return useSyncExternalStore(repo.subscribe, repo.list, repo.list);
}
