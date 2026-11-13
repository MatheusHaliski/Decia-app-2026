/**
 * Ganchos do Balcão de Modelos (RF40): repositório DEMO da aba sobre o razão de DECIA Points corrente e leitura reativa.
 */
"use client";
import { useSyncExternalStore } from "react";
import { pointsLedger } from "@/lib/points/usePoints";
import { buildDemoOffers } from "./fixtures";
import { createMemoryModelsRepository, type ModelsRepository } from "./repository";
import type { ModelOffer } from "./types";

let demo: ModelsRepository | null = null;

export function demoModelsRepository(): ModelsRepository {
  demo ??= createMemoryModelsRepository({ ledger: pointsLedger(), seed: buildDemoOffers(new Date()) });
  return demo;
}

/** Só para testes: troca o repositório usado pelos ganchos (null recria o DEMO na próxima leitura). */
export function setDemoModelsRepository(repo: ModelsRepository | null) {
  demo = repo;
}

export function useModelsTick(repo: ModelsRepository = demoModelsRepository()): number {
  return useSyncExternalStore(repo.subscribe, repo.snapshot, repo.snapshot);
}

export function useModelOffers(repo: ModelsRepository = demoModelsRepository()): readonly ModelOffer[] {
  useModelsTick(repo);
  return repo.list();
}
