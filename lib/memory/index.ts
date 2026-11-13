/**
 * Memória Institucional (RF33) — ponto de entrada. Ao ser importado, LIGA a busca real ao contrato `searchMemory`
 * (`registerMemorySearch`): quem precisa citar a Memória (a sessão do DECIA, por exemplo) deve importar daqui —
 * `import { searchMemory } from "@/lib/memory"` — para garantir o registro. A assinatura do contrato não muda: a função devolve
 * `MemoryHit[]` com o trecho exato (`body.slice(start, end) === text`), a citação curta e o link.
 */
import { registerMemorySearch, searchMemory, type MemoryHit, type MemorySearch } from "./search";
import { demoMemoryRepository } from "./store";
import type { ExplainedHit } from "./types";

/** Resultado explicado → só os campos do contrato (o que a sessão do DECIA guarda na mensagem). */
export const toContractHit = (h: ExplainedHit): MemoryHit => ({
  docId: h.docId,
  kind: h.kind,
  title: h.title,
  department: h.department,
  year: h.year,
  href: h.href,
  score: h.score,
  passage: { ...h.passage },
  citation: h.citation,
});

/** Implementação registrada: índice DEMO da aba, com os padrões do contrato (k = 5, PÚBLICO+INTERNO, nota ≥ 0,05). */
export const memorySearchImpl: MemorySearch = (query, options) => demoMemoryRepository().search(query, options ?? {}).hits.map(toContractHit);

registerMemorySearch(memorySearchImpl);

export { searchMemory, registerMemorySearch };
export { MEMORY_KINDS } from "./search";
export type { MemoryDoc, MemoryHit, MemoryKind, MemorySearch, MemorySearchOptions } from "./search";
export { demoMemoryRepository, setDemoMemoryRepository, createMemoryRepository } from "./store";
export type { MemoryRepository } from "./store";
export type { AccessClass, ExplainedHit, MemoryDocument, MemoryQueryOptions, SearchResult } from "./types";
