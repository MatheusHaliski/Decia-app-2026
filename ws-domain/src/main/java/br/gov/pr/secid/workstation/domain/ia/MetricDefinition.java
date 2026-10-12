package br.gov.pr.secid.workstation.domain.ia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;

/** Catálogo de métricas (RF43 §8, METRICAS_GESTAO.md) — TAXONOMIA §10.6. PK = code. */
@DomainEntity(context = "10 IA do sistema", table = "metric_definitions", rfs = {"RF43", "RF18"}, migration = 21, pk = "code", audit = Audit.FULL,
        doc = "Catálogo de métricas (fórmula, fonte, proxy, unidade, amostra mínima).")
public record MetricDefinition(
        @Attr(value = "código (PK)", len = 60) String code,
        @Attr("domínio") MetricDomain domain,
        @Attr(value = "nome", len = 160) String name,
        @Attr(value = "fórmula", sql = "TEXT") String formula,
        @Attr(value = "fonte dos dados", opt = true, sql = "TEXT") String sourceDescription,
        @Attr(value = "nota sobre proxy", opt = true, len = 500) String proxyNote,
        @Attr(value = "unidade", opt = true, len = 30) String unit,
        @Attr(value = "amostra mínima", def = "1") int minSamples) {
}
