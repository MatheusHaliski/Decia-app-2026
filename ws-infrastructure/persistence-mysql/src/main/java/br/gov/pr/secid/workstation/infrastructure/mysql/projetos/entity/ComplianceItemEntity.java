package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity;

import br.gov.pr.secid.workstation.domain.acervo.TaskCategory;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.projetos.ProjectPhase;
import br.gov.pr.secid.workstation.domain.projetos.Requirement;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * Entidade JPA de {@code compliance_items} (ComplianceItem — 3 Criador de Projetos; RF32). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "compliance_items")
public class ComplianceItemEntity extends AuditableEntity {

    @Column(name = "checklist_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID checklistId;

    @Column(name = "label", nullable = false)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(name = "requirement", nullable = false)
    private Requirement requirement;

    @Enumerated(EnumType.STRING)
    @Column(name = "expected_phase")
    private ProjectPhase expectedPhase;

    @Enumerated(EnumType.STRING)
    @Column(name = "expected_category")
    private TaskCategory expectedCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "expected_type")
    private TaskType expectedType;

    @Column(name = "must_precede_item_id", columnDefinition = "BINARY(16)")
    private UUID mustPrecedeItemId;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    public UUID getChecklistId() {
        return checklistId;
    }

    public void setChecklistId(UUID checklistId) {
        this.checklistId = checklistId;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public Requirement getRequirement() {
        return requirement;
    }

    public void setRequirement(Requirement requirement) {
        this.requirement = requirement;
    }

    public ProjectPhase getExpectedPhase() {
        return expectedPhase;
    }

    public void setExpectedPhase(ProjectPhase expectedPhase) {
        this.expectedPhase = expectedPhase;
    }

    public TaskCategory getExpectedCategory() {
        return expectedCategory;
    }

    public void setExpectedCategory(TaskCategory expectedCategory) {
        this.expectedCategory = expectedCategory;
    }

    public TaskType getExpectedType() {
        return expectedType;
    }

    public void setExpectedType(TaskType expectedType) {
        this.expectedType = expectedType;
    }

    public UUID getMustPrecedeItemId() {
        return mustPrecedeItemId;
    }

    public void setMustPrecedeItemId(UUID mustPrecedeItemId) {
        this.mustPrecedeItemId = mustPrecedeItemId;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
