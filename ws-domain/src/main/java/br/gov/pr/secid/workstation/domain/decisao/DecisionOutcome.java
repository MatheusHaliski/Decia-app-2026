package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Resultado observado da decisão (§4.2), único por decisão. Qualidade do resultado ≠ qualidade da decisão (G8). */
@DomainEntity(context = "5b DECIA decisão estruturada", table = "decision_outcomes", rfs = {"RF29", "RF33"}, migration = 22,
        doc = "Resultado (filho da decisão → CASCADE, único por decisão); quem registrou RESTRICT.")
public record DecisionOutcome(
        @Attr("identificador") UUID id,
        @Attr(value = "decisão", ref = "decisions", onDelete = OnDelete.CASCADE, unique = true) UUID decisionId,
        @Attr("resultado") OutcomeResult result,
        @Attr("observado em") Instant observedAt,
        @Attr(value = "resumo", sql = "TEXT") String summary,
        @Attr(value = "métricas", opt = true) String metricsJson,
        @Attr(value = "registrado por", ref = "users", onDelete = OnDelete.RESTRICT) UUID recordedByUserId) {
}
