package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Checkpoint programado ou por gatilho (§4.2): "ainda vale?", premissas mudaram?, evidência nova?, confiança depois, ação. */
@DomainEntity(context = "5b DECIA decisão estruturada", table = "decision_checkpoints", rfs = {"RF29"}, migration = 22,
        doc = "Checkpoints (filho da decisão → CASCADE); quem concluiu RESTRICT. Confiança depois 0–100 passo 5.",
        indexes = {"decision_id, status, due_at", "due_at, status"},
        checks = {"confidence_pct_after IS NULL OR (confidence_pct_after BETWEEN 0 AND 100 AND MOD(confidence_pct_after, 5) = 0)"})
public record DecisionCheckpoint(
        @Attr("identificador") UUID id,
        @Attr(value = "decisão", ref = "decisions", onDelete = OnDelete.CASCADE) UUID decisionId,
        @Attr("vence em") Instant dueAt,
        @Attr("origem (programado/gatilho)") CheckpointKind kind,
        @Attr(value = "estado", def = "'AGENDADO'") CheckpointStatus status,
        @Attr(value = "concluído em", opt = true) Instant completedAt,
        @Attr(value = "concluído por", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID completedByUserId,
        @Attr("ainda vale?") Boolean stillValid,
        @Attr("premissas mudaram?") Boolean assumptionsChanged,
        @Attr("evidência nova?") Boolean newEvidence,
        @Attr("confiança depois (0–100, passo 5)") Integer confidencePctAfter,
        @Attr(value = "ação", opt = true) CheckpointAction action,
        @Attr(value = "nota", opt = true, len = 1000) String note) {

    public DecisionCheckpoint {
        DecisionRules.confidence(confidencePctAfter, "confidencePctAfter");
        if (status == CheckpointStatus.CONCLUIDO && (completedAt == null || action == null)) {
            throw DecisionRules.invalid("checkpoint CONCLUIDO exige completedAt e ação");
        }
    }
}
