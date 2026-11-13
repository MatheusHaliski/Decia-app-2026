/**
 * Ganchos da Loja Work AI (RF42): repositório DEMO da aba (sobre o razão de DECIA Points corrente) e leitura reativa — compras,
 * skins desbloqueadas (também lidas pelo seletor de skin das preferências), créditos de IA e impulsos.
 */
"use client";
import { useSyncExternalStore } from "react";
import type { DeskSkin } from "@/lib/preferences/types";
import { pointsLedger } from "@/lib/points/usePoints";
import { createMemoryStoreRepository, demoStoreSeed, type StoreRepository } from "./repository";

let demo: StoreRepository | null = null;

export function demoStoreRepository(): StoreRepository {
  demo ??= createMemoryStoreRepository({ ledger: pointsLedger(), seed: demoStoreSeed() });
  return demo;
}

/** Só para testes: troca o repositório usado pelos ganchos (null recria o DEMO na próxima leitura). */
export function setDemoStoreRepository(repo: StoreRepository | null) {
  demo = repo;
}

export function useStoreTick(repo: StoreRepository = demoStoreRepository()): number {
  return useSyncExternalStore(repo.subscribe, repo.snapshot, repo.snapshot);
}

/** Skins da Mesa desbloqueadas na Loja pela pessoa (vazio sem dono de saldo). */
export function useOwnedSkins(holderId: string | null, repo: StoreRepository = demoStoreRepository()): readonly DeskSkin[] {
  useStoreTick(repo);
  return holderId ? repo.ownedSkins(holderId) : [];
}
