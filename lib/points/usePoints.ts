/**
 * Ganchos React do DECIA Points (RF42): saldo e lançamentos do razão DEMO compartilhado (`deciaPoints`), com o histórico dos
 * perfis do laboratório semeado uma vez ao carregar o módulo (lib/points/demo.ts — sem assinantes ainda, então nada re-renderiza
 * no meio de outro render). Usados pela ficha DP da barra e pelas telas de Pontos, Loja, Balcão e Benefícios.
 */
"use client";
import { useSyncExternalStore } from "react";
import { seedLabPersonas } from "./demo";
import { createDonationService, type DonationService } from "./donations";
import { deciaPoints, type PointsEntry, type PointsLedger } from "./ledger";

seedLabPersonas(deciaPoints);

let current: PointsLedger = deciaPoints;
let donations: DonationService | null = null;

/** Razão usado pelas telas (o DEMO compartilhado; os testes trocam por um razão próprio). */
export const pointsLedger = (): PointsLedger => current;

/** Só para testes: troca o razão usado pelos ganchos e serviços (null volta ao `deciaPoints`). */
export function setPointsLedger(ledger: PointsLedger | null) {
  current = ledger ?? deciaPoints;
  donations = null;
}

/** Serviço de doações sobre o razão corrente. */
export function pointsDonations(): DonationService {
  donations ??= createDonationService(current);
  return donations;
}

/** Re-renderiza a cada lançamento. */
export function usePointsTick(ledger: PointsLedger = pointsLedger()): number {
  return useSyncExternalStore(ledger.subscribe, ledger.snapshot, ledger.snapshot);
}

export function usePointsBalance(holderId: string | null, ledger: PointsLedger = pointsLedger()): number | null {
  usePointsTick(ledger);
  return holderId ? ledger.balance(holderId) : null;
}

export function usePointsEntries(holderId: string | null, ledger: PointsLedger = pointsLedger()): readonly PointsEntry[] {
  usePointsTick(ledger);
  return holderId ? ledger.entries(holderId) : [];
}
