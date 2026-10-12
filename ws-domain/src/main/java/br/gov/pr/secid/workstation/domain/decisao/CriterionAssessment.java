package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Avaliação de (alternativa, critério) por um avaliador: nota 1–5, 5 = mais desejável (§6.1). Consenso = mediana das linhas. */
@DomainEntity(context = "5b DECIA decisão estruturada", table = "criterion_assessments", rfs = {"RF29", "RF31"}, migration = 22,
        doc = "Uma linha por avaliador (filho da alternativa e do critério → CASCADE); avaliador RESTRICT. Nota 1–5 por CHECK.",
        uniques = {"alternative_id, criterion_id, assessor_user_id"}, indexes = {"criterion_id", "assessor_user_id"},
        checks = {"score BETWEEN 1 AND 5"})
public record CriterionAssessment(
        @Attr("identificador") UUID id,
        @Attr(value = "alternativa", ref = "decision_alternatives", onDelete = OnDelete.CASCADE) UUID alternativeId,
        @Attr(value = "critério", ref = "decision_criteria", onDelete = OnDelete.CASCADE) UUID criterionId,
        @Attr(value = "avaliador", ref = "users", onDelete = OnDelete.RESTRICT) UUID assessorUserId,
        @Attr("nota 1–5 (desejabilidade)") int score,
        @Attr(value = "justificativa", opt = true, len = 1000) String rationale,
        @Attr("enviada em") Instant submittedAt,
        @Attr(value = "origem", def = "'HUMANO'") ContentOrigin origin) {

    public CriterionAssessment {
        DecisionRules.score(score);
    }
}
