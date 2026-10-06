package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/**
 * Revisão pós-decisão (laço duplo, [REF-ARGYRIS]; G8 processo separado do resultado). Nome distinto de {@code DecisionReview}, que já é a
 * validação RF29 do {@code FinalDecision}.
 */
@DomainEntity(context = "5b DECIA decisão estruturada", table = "decision_retrospectives", rfs = {"RF29", "RF33"}, migration = 22,
        doc = "Retrospectivas (filho da decisão → CASCADE); resultado SET NULL; revisor RESTRICT.",
        indexes = {"decision_id, reviewed_at", "share_as_lesson"})
public record DecisionRetrospective(
        @Attr("identificador") UUID id,
        @Attr(value = "decisão", ref = "decisions", onDelete = OnDelete.CASCADE) UUID decisionId,
        @Attr(value = "resultado", opt = true, ref = "decision_outcomes", onDelete = OnDelete.SET_NULL) UUID outcomeId,
        @Attr(value = "o que aconteceu", sql = "TEXT") String whatHappened,
        @Attr(value = "o que se esperava", sql = "TEXT") String whatExpected,
        @Attr(value = "o que estava certo", sql = "TEXT") String whatWasRight,
        @Attr(value = "o que estava errado", sql = "TEXT") String whatWasWrong,
        @Attr(value = "premissas que falharam", opt = true) String failedAssumptionIdsJson,
        @Attr("qualidade do processo (G8)") ProcessQuality processQuality,
        @Attr(value = "lições (Markdown)", sql = "TEXT") String lessonsMd,
        @Attr("compartilhar como lição (Memória, RF33)") boolean shareAsLesson,
        @Attr(value = "revisada por", ref = "users", onDelete = OnDelete.RESTRICT) UUID reviewedByUserId,
        @Attr("revisada em") Instant reviewedAt) {
}
