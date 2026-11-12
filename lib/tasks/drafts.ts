/**
 * Rascunho de tarefa entregue ao criador (`/tasks/new?rascunho=<id>`) por outra tela: extração de desenho ou documento (RF34),
 * Autopiloto (RF30), Ata Viva (RF37), Espelho de Conformidade (RF32) etc. O criador abre já preenchido e a pessoa revisa antes de
 * salvar — nada vai ao servidor até lá. Fica no `sessionStorage` desta aba (some ao fechar a aba; outra pessoa no mesmo navegador
 * não o lê depois) com validade de 1 hora; sem `sessionStorage` (bloqueado, modo privado antigo), vale só na memória da página.
 * A origem viaja junto para o criador explicar de onde veio o conteúdo.
 */
import type { TaskDraft } from "./templates";

export const DRAFT_TTL_MS = 60 * 60 * 1000;
const PREFIX = "ws.tasks.draft:";
const ID = /^[a-z0-9]{8,32}$/;

export const DRAFT_ORIGINS = ["CAD", "DOCUMENTO", "AUTOPILOTO", "ATA", "CONFORMIDADE", "OUTRO"] as const;
export type DraftOrigin = (typeof DRAFT_ORIGINS)[number];

export interface TaskDraftHandoff {
  /** campos do criador a preencher; o que faltar fica com o padrão do formulário */
  draft: Partial<TaskDraft>;
  /** de onde veio: tipo, rótulo já traduzido para a tela e referência opcional (id do projeto, da reunião, nome do arquivo) */
  origin: { kind: DraftOrigin; label: string; ref?: string };
  createdAt: number;
}

const memory = new Map<string, string>();

function store(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
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
  return { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => void memory.set(k, v), removeItem: (k) => void memory.delete(k) };
}

function newId(): string {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

/** Guarda o rascunho e devolve o id para `?rascunho=`. */
export function saveTaskDraft(handoff: Omit<TaskDraftHandoff, "createdAt">, now = Date.now()): string {
  const id = newId();
  store().setItem(PREFIX + id, JSON.stringify({ ...handoff, createdAt: now } satisfies TaskDraftHandoff));
  return id;
}

/** Lê o rascunho (id inválido, vencido ou corrompido = nada; o vencido é apagado). */
export function loadTaskDraft(id: string | null | undefined, now = Date.now()): TaskDraftHandoff | null {
  if (!id || !ID.test(id)) return null;
  const s = store();
  const raw = s.getItem(PREFIX + id);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TaskDraftHandoff;
    if (!parsed || typeof parsed !== "object" || typeof parsed.createdAt !== "number" || !parsed.origin || !parsed.draft) return null;
    if (now - parsed.createdAt > DRAFT_TTL_MS || parsed.createdAt > now + 60_000) {
      s.removeItem(PREFIX + id);
      return null;
    }
    if (!(DRAFT_ORIGINS as readonly string[]).includes(parsed.origin.kind)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Apaga o rascunho (depois de salvar a tarefa ou de a pessoa descartar). */
export function discardTaskDraft(id: string | null | undefined): void {
  if (!id || !ID.test(id)) return;
  store().removeItem(PREFIX + id);
}

/** Endereço do criador com o rascunho. */
export const draftHref = (id: string) => `/tasks/new?rascunho=${encodeURIComponent(id)}`;
