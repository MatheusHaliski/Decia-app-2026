package br.gov.pr.secid.workstation.domain.projetos;

import br.gov.pr.secid.workstation.domain.acervo.ProcessTag;
import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Checklist de conformidade por processo (RF32.CA01) — TAXONOMIA §3.7. */
@DomainEntity(context = "3 Criador de Projetos", table = "compliance_checklists", rfs = {"RF32", "RF11", "RF39", "RF45"}, migration = 12,
        doc = "Catálogo institucional de checklists (RESTRICT). departmentId nulo = toda a empresa.",
        indexes = {"company_id, process_tag, active"})
public record ComplianceChecklist(
        @Attr("identificador") UUID id,
        @Attr(value = "empresa", ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr(value = "departamento (nulo = empresa)", opt = true, ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr("processo") ProcessTag processTag,
        @Attr(value = "nome", len = 160) String name,
        @Attr(value = "base legal", opt = true, len = 300) String legalBasis,
        @Attr(value = "ativo", def = "TRUE") boolean active,
        @Attr(value = "versão do checklist", def = "1") int checklistVersion) {
}
