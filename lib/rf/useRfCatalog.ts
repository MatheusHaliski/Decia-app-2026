"use client";
import { useEffect, useSyncExternalStore } from "react";
import { loadRfCatalog, rfCatalogSnapshot, subscribeRfCatalog, type RfEntry } from "./load";

const serverSnapshot = () => null;

/**
 * Catálogo de RFs para a tela: `null` até chegar. Só pede o download quando `enabled` (o bloco de CAs vai ser exibido — modo
 * laboratório); fora disso o chunk nunca é baixado.
 */
export function useRfCatalog(enabled: boolean): readonly RfEntry[] | null {
  const catalog = useSyncExternalStore(subscribeRfCatalog, rfCatalogSnapshot, serverSnapshot);
  useEffect(() => {
    if (enabled && !catalog) void loadRfCatalog().catch(() => undefined);
  }, [enabled, catalog]);
  return enabled ? catalog : null;
}
