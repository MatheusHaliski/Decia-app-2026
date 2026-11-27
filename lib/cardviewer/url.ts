/**
 * Endereço compartilhável do visualizador de card: `?ver=tarefa:<id>` ou `?ver=projeto:<id>` em qualquer página (Acervo, Mural,
 * perfil, Minha mesa). Funções puras: ler o alvo de uma querystring e montar a querystring com/sem o alvo, preservando o resto.
 * Id fora do formato (letras, dígitos, hífen e sublinhado, até 80) é ignorado — um link adulterado não abre nada.
 */
export const VIEWER_PARAM = "ver";
export const VIEWER_KINDS = ["tarefa", "projeto"] as const;
export type ViewerKind = (typeof VIEWER_KINDS)[number];
export interface ViewerTarget { kind: ViewerKind; id: string }

const ID = /^[A-Za-z0-9_-]{1,80}$/;

export function parseViewerParam(raw: string | null | undefined): ViewerTarget | null {
  if (!raw) return null;
  const at = raw.indexOf(":");
  if (at < 0) return null;
  const kind = raw.slice(0, at).trim().toLowerCase();
  const id = raw.slice(at + 1).trim();
  if (!(VIEWER_KINDS as readonly string[]).includes(kind) || !ID.test(id)) return null;
  return { kind: kind as ViewerKind, id };
}

export const formatViewerParam = (t: ViewerTarget) => `${t.kind}:${t.id}`;

/** Querystring (com `?`, ou vazia) com o alvo trocado; `null` remove o parâmetro. Os demais parâmetros ficam como estavam. */
export function withViewer(search: string, target: ViewerTarget | null): string {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (target) q.set(VIEWER_PARAM, formatViewerParam(target));
  else q.delete(VIEWER_PARAM);
  const s = q.toString().replace(/%3A/gi, ":");
  return s ? `?${s}` : "";
}

export const sameTarget = (a: ViewerTarget | null, b: ViewerTarget | null) => !!a && !!b && a.kind === b.kind && a.id === b.id;
