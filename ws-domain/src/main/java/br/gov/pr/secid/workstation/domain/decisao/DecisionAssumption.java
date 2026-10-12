package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Registro de premissas (§4.2). Premissa crítica = importância CRITICO; INVALIDADA eleva o risco da decisão para ≥ ALTO (§6.6). */
@DomainEntity(context = "5b DECIA decisão estruturada", table = "decision_assumptions", rfs = {"RF29", "RF31"}, migration = 22,
        doc = "Premissas (filho da decisão → CASCADE); dono RESTRICT; alternativa e inferência de IA SET NULL. Confiança 0–100 passo 5.",
        indexes = {"decision_id, importance, validation_status", "alternative_id"},
        checks = {"confidence_pct IS NULL OR (confidence_pct BETWEEN 0 AND 100 AND MOD(confidence_pct, 5) = 0)"})
public record DecisionAssumption(
        @Attr("identificador") UUID id,
        @Attr(value = "decisão", ref = "decisions", onDelete = OnDelete.CASCADE) UUID decisionId,
        @Attr(value = "enunciado", len = 1000) String statement,
        @Attr("importância") DecisionLevel importance,
        @Attr("confiança (0–100, passo 5)") Integer confidencePct,
        @Attr(value = "validação", def = "'NAO_VALIDADA'") AssumptionStatus validationStatus,
        @Attr(value = "dono da validação", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID ownerUserId,
        @Attr(value = "alternativa", opt = true, ref = "decision_alternatives", onDelete = OnDelete.SET_NULL) UUID alternativeId,
        @Attr(value = "nota da validação", opt = true, len = 1000) String validationNote,
        @Attr(value = "validada/invalidada em", opt = true) Instant validatedAt,
        @Attr(value = "origem", def = "'HUMANO'") ContentOrigin origin,
        @Attr(value = "inferência de IA", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId) {

    public DecisionAssumption {
        DecisionRules.confidence(confidencePct, "confidencePct");
    }

    public boolean isCritical() {
        return importance == DecisionLevel.CRITICO;
    }
}
