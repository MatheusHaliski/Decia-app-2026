package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Decisão final (RF12, RF15) — TAXONOMIA §5.11; vira ATA_REGISTRO (RF29.CA05) e pontua (RF42). Estado por {@link DecisionStatus}. */
@DomainEntity(context = "5 DECIA sessão", table = "final_decisions", rfs = {"RF12", "RF14", "RF15", "RF29", "RF42"}, migration = 14, versioned = true,
        doc = "Decisões por sessão (filho → CASCADE). Revisão/cenário/ata SET NULL.",
        indexes = {"session_id, status", "resulting_task_id"})
public record FinalDecision(
        @Attr("identificador") UUID id,
        @Attr(value = "sessão", ref = "decia_sessions", onDelete = OnDelete.CASCADE) UUID sessionId,
        @Attr(value = "resumo de base", opt = true, ref = "analytical_summaries", onDelete = OnDelete.SET_NULL) UUID summaryId,
        @Attr(value = "texto da decisão", sql = "TEXT") String decisionText,
        @Attr(value = "fundamentação", opt = true, sql = "TEXT") String rationale,
        @Attr(value = "cenário escolhido", opt = true, ref = "summary_scenarios", onDelete = OnDelete.SET_NULL) UUID chosenScenarioId,
        @Attr("proposta pela IA") boolean proposedByAi,
        @Attr("proposta em") Instant proposedAt,
        @Attr(value = "estado", def = "'PROPOSTA'") DecisionStatus status,
        @Attr(value = "revisão", opt = true, ref = "decision_reviews", onDelete = OnDelete.SET_NULL) UUID reviewId,
        @Attr(value = "ATA_REGISTRO resultante (RF29.CA05)", opt = true, ref = "tasks", onDelete = OnDelete.SET_NULL) UUID resultingTaskId,
        @Attr(value = "carimbo {kind VALIDADO|DEVOLVIDO, date, reviewerName}", opt = true) String stampJson,
        @Attr(value = "citações", opt = true) String citationsJson) {

    public FinalDecision transition(DecisionStatus to) {
        return new FinalDecision(id, sessionId, summaryId, decisionText, rationale, chosenScenarioId, proposedByAi, proposedAt, status.transition(to),
                reviewId, resultingTaskId, stampJson, citationsJson);
    }
}
