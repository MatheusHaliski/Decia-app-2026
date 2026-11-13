/**
 * Ganchos das Chancelas (RF39): repositório DEMO da aba ligado ao razão de DECIA Points (bônus de benefício), à Loja (créditos de
 * IA dos benefícios) e ao Balcão (chancela aprovada num projeto oferecido como modelo o leva à prateleira Chancelados, RF39.CA11).
 */
"use client";
import { useSyncExternalStore } from "react";
import { demoModelsRepository } from "@/lib/models/useModels";
import { pointsHolderOf } from "@/lib/points/identity";
import { pointsLedger } from "@/lib/points/usePoints";
import { demoStoreRepository } from "@/lib/store/useStore";
import type { ViewerUser } from "@/lib/viewer/profiles";
import { buildDemoSeals, demoSealTargets } from "./fixtures";
import { createMemorySealsRepository, type SealsRepository } from "./repository";
import type { SealActor, SealTarget } from "./types";

let demo: SealsRepository | null = null;

/** Reutilizações no Balcão do item oferecido como modelo (projeto de origem). */
function reusesFromModels(target: { type: SealTarget["type"]; id: string }): number {
  if (target.type !== "PROJETO") return 0;
  return demoModelsRepository().list().reduce((sum, o) => (o.source.type === "PROJECT" && o.source.projectId === target.id ? sum + o.reuseCount : sum), 0);
}

/** Itens chanceláveis com os fatos de agora (inclui as reutilizações do Balcão). */
export const currentSealTargets = (): SealTarget[] => demoSealTargets(reusesFromModels);

export function demoSealsRepository(): SealsRepository {
  if (!demo) {
    const now = new Date();
    const seed = buildDemoSeals(now, currentSealTargets());
    demo = createMemorySealsRepository({
      ledger: pointsLedger(),
      store: demoStoreRepository(),
      onApproved: (bond, seal) => {
        const models = demoModelsRepository();
        for (const o of models.list()) if (o.source.type === "PROJECT" && o.source.projectId === bond.targetId) models.markSealed(o.id, seal.name);
      },
    }, seed);
  }
  return demo;
}

/** Só para testes: troca o repositório usado pelos ganchos (null recria o DEMO na próxima leitura). */
export function setDemoSealsRepository(repo: SealsRepository | null) {
  demo = repo;
}

export function useSealsTick(repo: SealsRepository = demoSealsRepository()): number {
  return useSyncExternalStore(repo.subscribe, repo.snapshot, repo.snapshot);
}

/** Quem age nas chancelas a partir de quem está vendo: o dono do saldo (quem tem) ou o nome de usuário. */
export function sealActorOf(user: ViewerUser, name: string): SealActor {
  return { id: pointsHolderOf(user) ?? user.username, profile: user.profile, name, department: user.profile === "EMPRESA" ? null : user.departmentAcronym };
}
