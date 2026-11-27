/**
 * Catálogo de RFs sob demanda (auditoria "Desempenho"): `catalog.gen.ts` (~119 KB gzip, CAs copiados dos READMEs) só é usado
 * no modo laboratório (bloco "O que esta aba vai fazer", lib/nav/labView.ts). Fica fora do bundle das rotas: este módulo só tem
 * `import type` dele e baixa o resto por `import()` quando o bloco aparece pela primeira vez. Sem React (o hook está em
 * useRfCatalog.ts), para testes e scripts poderem esperar `loadRfCatalog()`.
 */
import type { RfEntry } from "./catalog.gen";

export type { RfEntry };

let cache: readonly RfEntry[] | null = null;
let pending: Promise<readonly RfEntry[]> | null = null;
const listeners = new Set<() => void>();

/** Catálogo já carregado (ou `null`). Snapshot estável para `useSyncExternalStore`. */
export const rfCatalogSnapshot = (): readonly RfEntry[] | null => cache;

export function subscribeRfCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Baixa o catálogo uma vez; falha de rede rejeita e o próximo pedido tenta de novo. */
export function loadRfCatalog(): Promise<readonly RfEntry[]> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = import("./catalog.gen")
      .then((m) => {
        cache = m.RF_CATALOG;
        for (const l of [...listeners]) l();
        return m.RF_CATALOG;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

/** RF por id num catálogo carregado. */
export const findRf = (catalog: readonly RfEntry[] | null, id: string): RfEntry | undefined => catalog?.find((r) => r.id === id);
