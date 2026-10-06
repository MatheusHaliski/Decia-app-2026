package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Gatilho "o que mudaria esta decisão" (§4.2); DISPARADO sem tratamento torna a decisão VENCIDA (§6.11). */
@DomainEntity(context = "5b DECIA decisão estruturada", table = "decision_triggers", rfs = {"RF29"}, migration = 22,
        doc = "Gatilhos (filho da decisão → CASCADE). Comparador restrito por CHECK; métrica opcional.",
        indexes = {"decision_id, status", "metric_key"},
        checks = {"comparator IS NULL OR comparator IN ('<', '<=', '>', '>=', '=', '!=')"})
public record DecisionTrigger(
        @Attr("identificador") UUID id,
        @Attr(value = "decisão", ref = "decisions", onDelete = OnDelete.CASCADE) UUID decisionId,
        @Attr(value = "condição (o que mudaria a decisão)", len = 1000) String conditionText,
        @Attr(value = "métrica", opt = true, len = 80) String metricKey,
        @Attr(value = "comparador", opt = true, len = 2) String comparator,
        @Attr(value = "limiar", opt = true, sql = "DECIMAL(18,4)") BigDecimal threshold,
        @Attr(value = "estado", def = "'ATIVO'") TriggerStatus status,
        @Attr(value = "disparado em", opt = true) Instant firedAt) {
}
