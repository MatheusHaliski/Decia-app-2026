/**
 * DECIA — eventos de produto (03 §9). Separados dos fatos de domínio (`DecisionEventType`, histórico da decisão):
 * eventos de interface como `card_flipped` e `decision_compared` nunca entram no histórico.
 * Lista tipada e um "sink" trocável: por padrão é no-op (sem console, sem rede);
 * o backend de analytics, quando existir, registra o próprio sink. Métricas sempre com contexto, nunca "tempo no app",
 * e nada de XP por quantidade (G9).
 */
export const DECIA_ANALYTICS_EVENTS = [
  "decision_created", "evidence_added", "alternative_added", "criterion_changed", "decision_compared", "decision_challenged",
  "decision_finalized", "decision_reopened", "checkpoint_completed", "outcome_recorded", "review_completed", "card_flipped",
  "ai_suggestion_accepted", "ai_suggestion_dismissed",
] as const;
export type DeciaAnalyticsEvent = (typeof DECIA_ANALYTICS_EVENTS)[number];

/** Propriedades por evento (as que a interface já conhece; demais campos ficam opcionais). */
export interface DeciaEventProps {
  decision_created: { decisionId: string; complexity: string; templateKey?: string };
  evidence_added: { decisionId: string; nature: string };
  alternative_added: { decisionId: string; doNothing: boolean };
  criterion_changed: { decisionId: string; criterionId?: string; weightPct?: number | null };
  decision_compared: { decisionId: string; alternativeId?: string; criterionId?: string };
  decision_challenged: { decisionId: string; mode: string };
  decision_finalized: { decisionId: string; warnings: number; complexity: string };
  decision_reopened: { decisionId: string };
  checkpoint_completed: { decisionId: string; action?: string };
  outcome_recorded: { decisionId: string; result: string };
  review_completed: { decisionId: string; processQuality: string };
  card_flipped: { decisionId: string; to: "back" | "front"; mode: string };
  ai_suggestion_accepted: { decisionId: string; suggestionId: string };
  ai_suggestion_dismissed: { decisionId: string; suggestionId: string };
}

export interface AnalyticsRecord<E extends DeciaAnalyticsEvent = DeciaAnalyticsEvent> { event: E; props: DeciaEventProps[E]; at: string }
export type AnalyticsSink = (record: AnalyticsRecord) => void;

const noop: AnalyticsSink = () => {};
let sink: AnalyticsSink = noop;

export function setAnalyticsSink(next: AnalyticsSink | null) {
  sink = next ?? noop;
}

export function track<E extends DeciaAnalyticsEvent>(event: E, props: DeciaEventProps[E], now: Date = new Date()): AnalyticsRecord<E> {
  const record = { event, props, at: now.toISOString() };
  try {
    sink(record as AnalyticsRecord);
  } catch {
    // analytics nunca derruba a interface
  }
  return record;
}
