/**
 * Rascunho do Autopiloto (RF30.CA03: "proposta em rascunho não persistido até confirmar"; no backend, `ProjectDraft` em Redis
 * com TTL de 24 h). DEMO: `sessionStorage` desta aba com validade de 24 h — some ao fechar a aba e ninguém mais lê; sem
 * `sessionStorage`, vale só na memória da página. Abre na Mesa em modo rascunho por `/desk?draft=<id>`.
 */
import type { DemandFacts } from "./extract";
import type { ProjectProposal } from "./proposal";

export const PROPOSAL_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const PREFIX = "ws.projects.autopilot:";
const ID = /^[a-z0-9]{8,32}$/;

export interface ProposalDraft {
  id: string;
  proposal: ProjectProposal;
  /** leitura da demanda (com o texto), para voltar a ela e mostrar de onde veio cada fato */
  facts?: DemandFacts;
  createdAt: number;
  updatedAt: number;
}

const memory = new Map<string, string>();

function store(): Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length"> {
  try {
    if (typeof sessionStorage !== "undefined") {
      const probe = `${PREFIX}probe`;
      sessionStorage.setItem(probe, "1");
      sessionStorage.removeItem(probe);
      return sessionStorage;
    }
  } catch {
    // bloqueado: cai na memória da página
  }
  return {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => void memory.set(k, v),
    removeItem: (k) => void memory.delete(k),
    key: (i) => [...memory.keys()][i] ?? null,
    get length() {
      return memory.size;
    },
  };
}

function newId(): string {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

const valid = (d: unknown): d is ProposalDraft => {
  const x = d as ProposalDraft | null;
  return Boolean(x && typeof x === "object" && typeof x.createdAt === "number" && typeof x.updatedAt === "number" && x.proposal
    && typeof x.proposal.title === "string" && Array.isArray(x.proposal.tasks) && Array.isArray(x.proposal.phases));
};

/** Guarda (ou atualiza, com `id`) o rascunho e devolve o id para `?draft=`. */
export function saveProposalDraft(input: { proposal: ProjectProposal; facts?: DemandFacts }, opts: { id?: string; now?: number } = {}): string {
  const now = opts.now ?? Date.now();
  const id = opts.id && ID.test(opts.id) ? opts.id : newId();
  const prev = opts.id ? loadProposalDraft(opts.id, now) : null;
  const draft: ProposalDraft = { id, proposal: input.proposal, facts: input.facts ?? prev?.facts, createdAt: prev?.createdAt ?? now, updatedAt: now };
  try {
    store().setItem(PREFIX + id, JSON.stringify(draft));
  } catch {
    // cota cheia: guarda sem o texto da demanda
    store().setItem(PREFIX + id, JSON.stringify({ ...draft, facts: undefined }));
  }
  return id;
}

/** Lê o rascunho (id inválido, vencido ou corrompido = nada; o vencido é apagado). */
export function loadProposalDraft(id: string | null | undefined, now = Date.now()): ProposalDraft | null {
  if (!id || !ID.test(id)) return null;
  const s = store();
  const raw = s.getItem(PREFIX + id);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!valid(parsed)) return null;
    if (now - parsed.updatedAt > PROPOSAL_DRAFT_TTL_MS || parsed.createdAt > now + 60_000) {
      s.removeItem(PREFIX + id);
      return null;
    }
    return { ...parsed, id };
  } catch {
    return null;
  }
}

/** Rascunhos vivos desta aba, do mais recente ao mais antigo. */
export function listProposalDrafts(now = Date.now()): ProposalDraft[] {
  const s = store();
  const ids: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k?.startsWith(PREFIX) && ID.test(k.slice(PREFIX.length))) ids.push(k.slice(PREFIX.length));
  }
  return ids.map((id) => loadProposalDraft(id, now)).filter((d): d is ProposalDraft => Boolean(d)).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function discardProposalDraft(id: string | null | undefined): void {
  if (!id || !ID.test(id)) return;
  store().removeItem(PREFIX + id);
}

/** Mesa em modo rascunho (rota do RF30). */
export const proposalDraftHref = (id: string) => `/desk?draft=${encodeURIComponent(id)}`;
