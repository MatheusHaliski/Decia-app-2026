/**
 * Memória Institucional (RF33) — contrato da busca com citação de fonte. A implementação (índice vetorial determinístico sobre
 * relatórios, portarias, atas, sessões encerradas, projetos e tarefas) fica em `lib/memory/*`; a sessão do DECIA e outras telas só
 * chamam `searchMemory`, que devolve trechos EXATOS do documento (início e fim no texto) para a IA citar sem inventar (D-12).
 * Enquanto o índice não estiver carregado, a busca devolve lista vazia.
 */

export const MEMORY_KINDS = ["RELATORIO", "PORTARIA", "ATA", "SESSAO", "PROJETO", "TAREFA", "ARTEFATO", "NORMA"] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

export interface MemoryDoc {
  id: string;
  kind: MemoryKind;
  title: string;
  /** sigla do departamento ou órgão de origem */
  department: string | null;
  /** exercício (ano) */
  year: number | null;
  /** classificação de acesso: a busca nunca devolve o que a pessoa não pode ler */
  accessClass: "PUBLICO" | "INTERNO" | "RESTRITO" | "SIGILOSO";
  /** endereço dentro do app, quando o documento tem página própria */
  href: string | null;
  body: string;
}

export interface MemoryHit {
  docId: string;
  kind: MemoryKind;
  title: string;
  department: string | null;
  year: number | null;
  href: string | null;
  /** similaridade 0–1 (cosseno no espaço do índice) */
  score: number;
  /** trecho exato citado: `body.slice(start, end) === text` */
  passage: { text: string; start: number; end: number };
  /** referência curta para a citação ("Portaria 12/2025 — SECID, §3") */
  citation: string;
}

export interface MemorySearchOptions {
  /** quantos resultados (padrão 5) */
  k?: number;
  kinds?: readonly MemoryKind[];
  department?: string | null;
  /** exercício (ano) do documento; ausente = todos */
  year?: number | null;
  /** classes que a pessoa pode ler (padrão: PUBLICO e INTERNO) */
  readable?: readonly MemoryDoc["accessClass"][];
  /** similaridade mínima para entrar (padrão 0,05) */
  minScore?: number;
}

export type MemorySearch = (query: string, options?: MemorySearchOptions) => MemoryHit[];

let impl: MemorySearch = () => [];

/** Liga a implementação real (feito por `lib/memory/index.ts` ao carregar). */
export function registerMemorySearch(search: MemorySearch): void {
  impl = search;
}

/** Busca na Memória Institucional com trechos exatos para citação. */
export const searchMemory: MemorySearch = (query, options) => impl(query, options);

// Quem importa só o contrato (a sessão do DECIA, a Transição) também recebe a busca real: no navegador, o índice DEMO
// (`lib/memory/index.ts`) é carregado em segundo plano e se registra ao chegar. Até lá a busca devolve lista vazia, como diz o
// contrato. No servidor e nos testes de ambiente node nada é carregado; para registrar na hora, importe de "@/lib/memory".
if (typeof window !== "undefined") void import("./index");
