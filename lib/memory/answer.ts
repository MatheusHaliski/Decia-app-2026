/**
 * "Perguntar à IA ✦" da Memória (RF33.CA02/CA03, D-12): resposta SIMULADA e determinística, montada EXCLUSIVAMENTE com os trechos
 * recuperados. Não chama modelo, não resume com palavras próprias, não acrescenta número: cada item é uma frase exata de um
 * trecho (posição conferível no documento) com citação numerada [1], [2]… que leva ao trecho. Só entram trechos relevantes de
 * verdade: nota ≥ 0,2 e ao menos 60 % dos termos da pergunta atendidos (numa pergunta de dois termos, os dois). Sem nenhum, a
 * resposta é "sem fonte" — a IA diz que não encontrou fundamento em vez de responder de memória.
 */
import type { Span } from "./text";
import type { ExplainedHit } from "./types";

export const ANSWER_MIN_SCORE = 0.2;
export const ANSWER_MIN_COVERAGE = 0.6;
export const ANSWER_MAX_SOURCES = 3;

export interface AnswerItem {
  /** número da citação ([1], [2]…) */
  n: number;
  /** posição do resultado na lista de busca (para ligar a citação ao cartão do trecho) */
  hitIndex: number;
  docId: string;
  citation: string;
  href: string | null;
  /** frase exata do trecho escolhida para responder (posições no documento) */
  quote: { text: string; start: number; end: number };
  score: number;
}

export type MemoryAnswer =
  | { status: "SEM_FONTE"; question: string; items: readonly [] }
  | { status: "COM_FONTES"; question: string; items: readonly AnswerItem[] };

/** O trecho é relevante o bastante para fundamentar uma resposta? */
export const isAnswerable = (hit: ExplainedHit) =>
  hit.score >= ANSWER_MIN_SCORE &&
  hit.explanation.coverage.total > 0 &&
  hit.explanation.coverage.matched / hit.explanation.coverage.total >= ANSWER_MIN_COVERAGE;

/** A frase do trecho com mais termos casados (empate: a primeira). Sempre uma frase inteira do documento. */
export function bestSentence(hit: ExplainedHit): { text: string; start: number; end: number } {
  const marks = hit.explanation.highlights.map((h) => ({ start: hit.passage.start + h.start, end: hit.passage.start + h.end }));
  let best: Span | null = null;
  let bestCount = -1;
  for (const s of hit.sentences) {
    const count = marks.filter((m) => m.start >= s.start && m.end <= s.end).length;
    if (count > bestCount) {
      best = s;
      bestCount = count;
    }
  }
  const span = best ?? { start: hit.passage.start, end: hit.passage.end };
  return { text: hit.passage.text.slice(span.start - hit.passage.start, span.end - hit.passage.start), start: span.start, end: span.end };
}

export function composeAnswer(question: string, hits: readonly ExplainedHit[]): MemoryAnswer {
  const q = question.trim();
  const items: AnswerItem[] = [];
  hits.forEach((hit, hitIndex) => {
    if (items.length >= ANSWER_MAX_SOURCES || !isAnswerable(hit)) return;
    items.push({ n: items.length + 1, hitIndex, docId: hit.docId, citation: hit.citation, href: hit.href, quote: bestSentence(hit), score: hit.score });
  });
  return items.length ? { status: "COM_FONTES", question: q, items } : { status: "SEM_FONTE", question: q, items: [] };
}
