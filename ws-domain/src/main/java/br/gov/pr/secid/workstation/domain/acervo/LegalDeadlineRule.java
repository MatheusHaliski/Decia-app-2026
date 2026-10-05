package br.gov.pr.secid.workstation.domain.acervo;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.LocalDate;
import java.util.UUID;

/** Regra de prazo legal por categoria (RF20.CA11) — TAXONOMIA §2.5. companyId nulo = padrão. */
@DomainEntity(context = "2 Acervo de Tarefas", table = "legal_deadline_rules", rfs = {"RF20", "RF44"}, migration = 11,
        doc = "Catálogo de prazos legais (dias corridos ou úteis) por categoria/subcategoria. RESTRICT.",
        indexes = {"category, subcategory, active"}, checks = {"days > 0"})
public record LegalDeadlineRule(
        @Attr("identificador") UUID id,
        @Attr(value = "empresa (nulo = padrão)", opt = true, ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr("categoria") TaskCategory category,
        @Attr(value = "subcategoria", opt = true, len = 80) String subcategory,
        @Attr("dias") int days,
        @Attr("dias úteis?") boolean businessDays,
        @Attr(value = "base legal", len = 300) String legalBasis,
        @Attr(value = "descrição", opt = true, len = 500) String description,
        @Attr(value = "ativa", def = "TRUE") boolean active,
        @Attr(value = "vigência de", opt = true) LocalDate validFrom,
        @Attr(value = "vigência até", opt = true) LocalDate validTo) {
}
