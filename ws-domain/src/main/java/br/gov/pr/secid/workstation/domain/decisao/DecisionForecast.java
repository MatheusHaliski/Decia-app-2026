package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Previsão binária e verificável com probabilidade 5–95 em passos de 5 (§6.9); base da calibração (Brier). */
@DomainEntity(context = "5b DECIA decisão estruturada", table = "decision_forecasts", rfs = {"RF29"}, migration = 22,
        doc = "Previsões (filho da decisão → CASCADE); previsor e quem resolveu RESTRICT; alternativa SET NULL. Probabilidade 5–95 passo 5.",
        indexes = {"decision_id, resolution", "forecaster_user_id, resolution", "resolve_by"},
        checks = {"probability_pct BETWEEN 5 AND 95 AND MOD(probability_pct, 5) = 0"})
public record DecisionForecast(
        @Attr("identificador") UUID id,
        @Attr(value = "decisão", ref = "decisions", onDelete = OnDelete.CASCADE) UUID decisionId,
        @Attr(value = "alternativa", opt = true, ref = "decision_alternatives", onDelete = OnDelete.SET_NULL) UUID alternativeId,
        @Attr(value = "enunciado binário e verificável", len = 500) String statement,
        @Attr("probabilidade % (5–95, passo 5)") int probabilityPct,
        @Attr("resolver até") LocalDate resolveBy,
        @Attr(value = "previsor", ref = "users", onDelete = OnDelete.RESTRICT) UUID forecasterUserId,
        @Attr(value = "resolução", def = "'PENDENTE'") ForecastResolution resolution,
        @Attr(value = "resolvida em", opt = true) Instant resolvedAt,
        @Attr(value = "resolvida por", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID resolvedByUserId) {

    public DecisionForecast {
        DecisionRules.probability(probabilityPct);
    }
}
