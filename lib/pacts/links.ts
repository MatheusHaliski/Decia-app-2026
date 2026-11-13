/**
 * Endereços do RF49. "Mediar no DECIA" abre a mediação numa sessão do DECIA (`/decia/<sessão>?pacto=<id>`; a tela da sessão é de
 * outra frente — aqui só se gera o link). Sem sessão vinculada, o id sugerido é `mediacao-<pacto>`.
 */
import type { CooperationPact } from "./types";

export const mediationSessionId = (pact: Pick<CooperationPact, "id" | "sessionId">) => pact.sessionId ?? `mediacao-${pact.id}`;
export const mediationHref = (pact: Pick<CooperationPact, "id" | "sessionId">) =>
  `/decia/${encodeURIComponent(mediationSessionId(pact))}?pacto=${encodeURIComponent(pact.id)}`;
/** Abre o pacto na fila de cooperação (`/goals?pacto=<id>`), usado por avisos e pela sessão de mediação. */
export const pactHref = (pactId: string) => `/goals?pacto=${encodeURIComponent(pactId)}`;
