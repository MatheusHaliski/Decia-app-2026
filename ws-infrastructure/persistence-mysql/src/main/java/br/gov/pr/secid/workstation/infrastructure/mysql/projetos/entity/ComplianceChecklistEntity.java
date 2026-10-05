package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity;

import br.gov.pr.secid.workstation.domain.acervo.ProcessTag;
import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * Entidade JPA de {@code compliance_checklists} (ComplianceChecklist — 3 Criador de Projetos; RF32, RF11, RF39, RF45).
 * Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do
 * Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "compliance_checklists")
public class ComplianceChecklistEntity extends AuditableEntity {

    @Column(name = "company_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID companyId;

    @Column(name = "department_id", columnDefinition = "BINARY(16)")
    private UUID departmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "process_tag", nullable = false)
    private ProcessTag processTag;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "legal_basis")
    private String legalBasis;

    @Column(name = "active", nullable = false)
    private boolean active;

    @Column(name = "checklist_version", nullable = false)
    private int checklistVersion;

    public UUID getCompanyId() {
        return companyId;
    }

    public void setCompanyId(UUID companyId) {
        this.companyId = companyId;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(UUID departmentId) {
        this.departmentId = departmentId;
    }

    public ProcessTag getProcessTag() {
        return processTag;
    }

    public void setProcessTag(ProcessTag processTag) {
        this.processTag = processTag;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLegalBasis() {
        return legalBasis;
    }

    public void setLegalBasis(String legalBasis) {
        this.legalBasis = legalBasis;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public int getChecklistVersion() {
        return checklistVersion;
    }

    public void setChecklistVersion(int checklistVersion) {
        this.checklistVersion = checklistVersion;
    }
}
