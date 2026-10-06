package br.gov.pr.secid.workstation.domain.decisao;

import java.util.Locale;

/**
 * Tipo do evento da trilha da decisão (§8 "toda escrita gera DecisionEvent") e de analytics (§9, {@code lib/decia/analytics.ts}). Os valores
 * são os nomes do §9 em maiúsculas; {@link #wireName()} devolve o nome do evento de analytics ({@code decision_created}…).
 */
public enum DecisionEventType {
    DECISION_CREATED, EVIDENCE_ADDED, ALTERNATIVE_ADDED, CRITERION_CHANGED, DECISION_COMPARED, DECISION_CHALLENGED, DECISION_FINALIZED,
    DECISION_REOPENED, CHECKPOINT_COMPLETED, OUTCOME_RECORDED, REVIEW_COMPLETED, CARD_FLIPPED, AI_SUGGESTION_ACCEPTED, AI_SUGGESTION_DISMISSED;

    /** Nome do evento de analytics (snake_case minúsculo, como no §9). */
    public String wireName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
