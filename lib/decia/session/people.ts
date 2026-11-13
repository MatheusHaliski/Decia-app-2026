/**
 * Casamento de nomes e @menções com os membros da sessão (RF37: encaminhamento com RESPONSÁVEL). Sem acento, sem caixa, sem
 * títulos ("Dra.", "Sr."); nome completo, primeiro nome único, sobrenome único ou @menção ("@ana", "@ana.exemplo",
 * "@AnaExemplo"). Mais de um membro possível = AMBIGUO; nenhum = "a definir" (o texto original fica para a pessoa revisar).
 */
import type { PersonMatch } from "./types";

export interface PersonRef { userId: string; name: string }

const TITLES = new Set(["sr", "sra", "srta", "dr", "dra", "prof", "profa", "eng", "senhor", "senhora", "dona", "seu", "doutor", "doutora", "professor", "professora"]);

export const foldName = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
export function nameTokens(s: string): string[] {
  return foldName(s).replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t && !TITLES.has(t));
}
const compact = (s: string) => foldName(s).replace(/[^\p{L}\p{N}]/gu, "");

function byHandle(handle: string, people: readonly PersonRef[]): PersonRef[] {
  const h = compact(handle);
  if (!h) return [];
  return people.filter((p) => {
    const tokens = nameTokens(p.name);
    const first = tokens[0] ?? "";
    const last = tokens.at(-1) ?? "";
    return h === compact(p.name) || h === first || h === first + last || h === compact(p.userId.replace(/^u-/, ""));
  });
}

function byName(raw: string, people: readonly PersonRef[]): PersonRef[] {
  const want = nameTokens(raw);
  if (!want.length) return [];
  const exact = people.filter((p) => nameTokens(p.name).join(" ") === want.join(" "));
  if (exact.length) return exact;
  return people.filter((p) => {
    const have = nameTokens(p.name);
    return want.every((w) => have.includes(w));
  });
}

export function matchPerson(raw: string | null | undefined, people: readonly PersonRef[]): PersonMatch {
  const text = raw?.trim() ?? "";
  if (!text) return { status: "A_DEFINIR", raw: null };
  const found = text.startsWith("@") ? byHandle(text.slice(1), people) : byName(text, people);
  if (found.length === 1) return { status: "CASADO", userId: found[0]!.userId, raw: text };
  if (found.length > 1) return { status: "AMBIGUO", candidates: found.map((p) => p.userId), raw: text };
  return { status: "A_DEFINIR", raw: text };
}
