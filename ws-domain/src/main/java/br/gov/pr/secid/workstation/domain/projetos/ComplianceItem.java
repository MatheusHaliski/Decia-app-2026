package br.gov.pr.secid.workstation.domain.projetos;

import br.gov.pr.secid.workstation.domain.acervo.TaskCategory;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Item do checklist (RF32) — TAXONOMIA §3.8; o Espelho cria tarefa faltante a partir dele (RF32.CA03). */
@DomainEntity(context = "3 Criador de Projetos", table = "compliance_items", rfs = {"RF32"}, migration = 12,
        doc = "Itens esperados de um checklist (fase, categoria, tipo, precedência). Filho do checklist → CASCADE.",
        indexes = {"checklist_id, sort_order"})
public record ComplianceItem(
        @Attr("identificador") UUID id,
        @Attr(value = "checklist", ref = "compliance_checklists", onDelete = OnDelete.CASCADE) UUID checklistId,
        @Attr(value = "rótulo", len = 200) String label,
        @Attr(value = "exigência", def = "'OBRIGATORIO'") Requirement requirement,
        @Attr(value = "fase esperada", opt = true) ProjectPhase expectedPhase,
        @Attr(value = "categoria esperada", opt = true) TaskCategory expectedCategory,
        @Attr(value = "tipo esperado", opt = true) TaskType expectedType,
        @Attr(value = "deve preceder o item", opt = true, ref = "compliance_items", onDelete = OnDelete.SET_NULL) UUID mustPrecedeItemId,
        @Attr("ordem") int sortOrder) {
}
