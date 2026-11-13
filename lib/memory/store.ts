/**
 * Memória Institucional — repositório DEMO (mesmo padrão de `lib/decia/repository.ts`). A API `/api/memory/*` (MemoryService,
 * índice OpenSearch `ws-memory`) ainda não existe e não é presumida: `MemoryRepository` é o contrato que o cliente HTTP real
 * implementará. Aqui o acervo = corpus de exemplo + decisões ENCERRADAS do repositório DEMO do DECIA (somente leitura, relidas a
 * cada mudança) + documentos ingeridos nesta aba. O índice é reconstruído só quando o acervo muda. Tudo vive na memória da aba.
 */
import { demoRepository } from "@/lib/decia/repository";
import type { DecisionAggregate } from "@/lib/decia/types";
import { closedDecisionDocs } from "./adapters";
import { DEMO_MEMORY_DOCS } from "./corpus";
import { buildIndex, searchIndex, type MemoryIndex } from "./engine";
import { buildIngestedDoc, slugOf, type IngestInput, type IngestResult } from "./ingest";
import type { AccessClass, MemoryDocument, MemoryQueryOptions, SearchResult } from "./types";

export interface MemoryRepository {
  /** "DEMO" no repositório em memória; o cliente real devolve "API" */
  readonly source: "DEMO" | "API";
  documents(): readonly MemoryDocument[];
  get(id: string): MemoryDocument | undefined;
  index(): MemoryIndex;
  search(query: string, opts?: MemoryQueryOptions): SearchResult;
  ingest(input: IngestInput, ctx: { addedBy: string | null; allowedClasses: readonly AccessClass[]; now?: Date }): IngestResult;
  /** remove um documento ingerido nesta aba (os de exemplo e do DECIA não saem) */
  remove(id: string): boolean;
  subscribe(listener: () => void): () => void;
  /** versão do acervo (muda a cada ingestão/remoção ou mudança nas decisões) */
  snapshot(): number;
}

export interface DecisionSource {
  list(): readonly DecisionAggregate[];
  subscribe(listener: () => void): () => void;
}

export function createMemoryRepository(opts: { base: readonly MemoryDocument[]; decisions?: DecisionSource | null }): MemoryRepository {
  let ingested: MemoryDocument[] = [];
  let counter = 0;
  let version = 0;
  let lastDecisions: readonly DecisionAggregate[] | null | undefined;
  let docsCache: readonly MemoryDocument[] | null = null;
  let indexCache: MemoryIndex | null = null;
  const listeners = new Set<() => void>();
  const invalidate = () => {
    docsCache = null;
    indexCache = null;
    version++;
  };
  const sync = () => {
    const list = opts.decisions?.list() ?? null;
    if (list !== lastDecisions) {
      lastDecisions = list;
      invalidate();
    }
  };
  const emit = () => listeners.forEach((l) => l());
  const documents = () => {
    sync();
    docsCache ??= [...opts.base, ...closedDecisionDocs(lastDecisions ?? []), ...ingested];
    return docsCache;
  };
  const index = () => {
    const docs = documents();
    indexCache ??= buildIndex(docs);
    return indexCache;
  };
  return {
    source: "DEMO",
    documents,
    get: (id) => documents().find((d) => d.id === id),
    index,
    search: (query, o = {}) => searchIndex(index(), query, o),
    ingest(input, ctx) {
      const id = `ing-${counter + 1}-${slugOf(input.title)}`;
      const r = buildIngestedDoc(input, { id, addedBy: ctx.addedBy, now: ctx.now ?? new Date(), allowedClasses: ctx.allowedClasses });
      if (r.ok) {
        counter++;
        ingested = [...ingested, r.doc];
        invalidate();
        emit();
      }
      return r;
    },
    remove(id) {
      if (!ingested.some((d) => d.id === id)) return false;
      ingested = ingested.filter((d) => d.id !== id);
      invalidate();
      emit();
      return true;
    },
    subscribe(listener) {
      listeners.add(listener);
      const off = opts.decisions?.subscribe(listener);
      return () => {
        listeners.delete(listener);
        off?.();
      };
    },
    snapshot: () => {
      sync();
      return version;
    },
  };
}

let demo: MemoryRepository | null = null;
/** Repositório DEMO da aba: corpus de exemplo + decisões encerradas do DECIA DEMO + ingestões desta aba. */
export function demoMemoryRepository(): MemoryRepository {
  demo ??= createMemoryRepository({ base: DEMO_MEMORY_DOCS, decisions: demoRepository() });
  return demo;
}
/** Só para testes: troca o repositório usado pelas telas e pela busca registrada. */
export function setDemoMemoryRepository(repo: MemoryRepository | null) {
  demo = repo;
}
