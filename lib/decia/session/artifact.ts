/**
 * Artefato da sessão (RF30.CA06): a proposta do Autopiloto (ou o esquema de um projeto salvo) anexada à sessão do DECIA. A minuta
 * nasce com o texto da proposta; o que a sessão decidir nela volta ao rascunho/projeto pela tela, e `markArtifactApplied` avança
 * a base de comparação para a revisão aplicada — a mesma decisão não volta duas vezes. Só o PROPRIETARIO devolve as decisões
 * (o mesmo papel que muda o estado da sessão). Funções puras.
 */
import { MAX_MINUTA_CHARS } from "./minuta";
import { can } from "./roles";
import type { CommandResult, DeciaSession, IsoDate, Minuta, SessionArtifact } from "./types";

export type NewSessionArtifact = Omit<SessionArtifact, "attachedAt" | "attachedBy" | "baseText" | "baseRevision" | "applications">;

/** Artefato pronto para gravar na sessão nova e a minuta inicial (revisão 1 = o texto anexado). */
export function attachArtifact(input: NewSessionArtifact, actor: string, at: IsoDate): { artifact: SessionArtifact; minuta: Minuta } {
  const text = input.text.slice(0, MAX_MINUTA_CHARS);
  return {
    artifact: { ...input, text, baseText: text, attachedAt: at, attachedBy: actor, baseRevision: 1, applications: [] },
    minuta: { revision: 1, text, history: [{ revision: 1, text, by: actor, at, origin: "HUMANO" }] },
  };
}

/** Registra que as decisões da minuta (revisão atual) voltaram ao rascunho/projeto: a base passa a ser essa revisão. */
export function markArtifactApplied(session: DeciaSession, actor: string, changes: number, now: Date): CommandResult<{ session: DeciaSession }> {
  if (!session.artifact) return { ok: false, reason: "SEM_ALTERACAO" };
  if (!can(session, actor, "MUDAR_ESTADO")) return { ok: false, reason: "SEM_PERMISSAO" };
  if (changes <= 0) return { ok: false, reason: "SEM_ALTERACAO" };
  const at = now.toISOString();
  const artifact: SessionArtifact = {
    ...session.artifact,
    baseText: session.minuta.text,
    baseRevision: session.minuta.revision,
    applications: [...session.artifact.applications, { at, by: actor, revision: session.minuta.revision, changes }],
  };
  return { ok: true, session: { ...session, artifact, updatedAt: at } };
}
