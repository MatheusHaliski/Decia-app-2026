package br.gov.pr.secid.workstation.infrastructure.mysql.chancelas.entity;

import br.gov.pr.secid.workstation.domain.chancelas.SealProposalStatus;
import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * Entidade JPA de {@code seal_proposals} (SealProposal — 9 Chancelas & Vínculos; RF39). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "seal_proposals")
public class SealProposalEntity extends AuditableEntity {

    @Column(name = "proposer_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID proposerId;

    @Column(name = "department_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID departmentId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "rationale", nullable = false, columnDefinition = "TEXT")
    private String rationale;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SealProposalStatus status;

    @Column(name = "resulting_seal_id", columnDefinition = "BINARY(16)")
    private UUID resultingSealId;

    @Column(name = "decided_by", columnDefinition = "BINARY(16)")
    private UUID decidedBy;

    public UUID getProposerId() {
        return proposerId;
    }

    public void setProposerId(UUID proposerId) {
        this.proposerId = proposerId;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(UUID departmentId) {
        this.departmentId = departmentId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRationale() {
        return rationale;
    }

    public void setRationale(String rationale) {
        this.rationale = rationale;
    }

    public SealProposalStatus getStatus() {
        return status;
    }

    public void setStatus(SealProposalStatus status) {
        this.status = status;
    }

    public UUID getResultingSealId() {
        return resultingSealId;
    }

    public void setResultingSealId(UUID resultingSealId) {
        this.resultingSealId = resultingSealId;
    }

    public UUID getDecidedBy() {
        return decidedBy;
    }

    public void setDecidedBy(UUID decidedBy) {
        this.decidedBy = decidedBy;
    }
}
