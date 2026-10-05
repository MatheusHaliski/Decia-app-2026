package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Cenário do resumo analítico (RF11) — TAXONOMIA §5.10; pode apontar para um cenário simulado (RF31.CA04). */
@DomainEntity(context = "5 DECIA sessão", table = "summary_scenarios", rfs = {"RF11", "RF12", "RF31"}, migration = 14, audit = Audit.CREATED,
        doc = "Cenários do resumo (filho → CASCADE); cenário do simulador SET NULL.",
        indexes = {"summary_id"})
public record SummaryScenario(
        @Attr("identificador") UUID id,
        @Attr(value = "resumo", ref = "analytical_summaries", onDelete = OnDelete.CASCADE) UUID summaryId,
        @Attr(value = "nome", len = 120) String name,
        @Attr(value = "descrição", opt = true, sql = "TEXT") String description,
        @Attr(value = "vantagens", opt = true) String advantagesJson,
        @Attr(value = "desvantagens", opt = true) String disadvantagesJson,
        @Attr(value = "notas por critério", opt = true) String criteriaScoresJson,
        @Attr(value = "cenário do simulador (RF31.CA04)", opt = true, ref = "project_scenarios", onDelete = OnDelete.SET_NULL) UUID linkedProjectScenarioId) {
}
