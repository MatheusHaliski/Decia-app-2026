package br.gov.pr.secid.workstation.domain.ia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Snapshot de métrica (= FAI) — TAXONOMIA §10.7 (RF18 indicadores, RF43). Materializa as views/procedures do §12.8. */
@DomainEntity(context = "10 IA do sistema", table = "metric_snapshots", rfs = {"RF18", "RF43"}, migration = 21, audit = Audit.NONE,
        doc = "Valores materializados por métrica, escopo e período. Métrica RESTRICT.",
        uniques = {"metric_code, scope, scope_id, period_start, period_end"})
public record MetricSnapshot(
        @Attr("identificador") UUID id,
        @Attr(value = "métrica", len = 60, ref = "metric_definitions", refCol = "code", onDelete = OnDelete.RESTRICT) String metricCode,
        @Attr("escopo") MetricScope scope,
        @Attr(value = "id do escopo (nulo = GLOBAL)", opt = true) UUID scopeId,
        @Attr("início do período") LocalDate periodStart,
        @Attr("fim do período") LocalDate periodEnd,
        @Attr(value = "valor", sql = "DECIMAL(18,4)") BigDecimal value,
        @Attr(value = "valores detalhados", opt = true) String valuesJson,
        @Attr("calculado em") Instant computedAt) {
}
