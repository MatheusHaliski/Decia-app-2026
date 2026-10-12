package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceStance;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceTarget;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * Entidade JPA de {@code decision_evidence_links} (EvidenceLink — 5b DECIA decisão estruturada; RF29). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decision_evidence_links")
public class EvidenceLinkEntity extends AuditableEntity {

    @Column(name = "evidence_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID evidenceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    private EvidenceTarget targetType;

    @Column(name = "target_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID targetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "stance", nullable = false)
    private EvidenceStance stance;

    @Column(name = "note")
    private String note;

    public UUID getEvidenceId() {
        return evidenceId;
    }

    public void setEvidenceId(UUID evidenceId) {
        this.evidenceId = evidenceId;
    }

    public EvidenceTarget getTargetType() {
        return targetType;
    }

    public void setTargetType(EvidenceTarget targetType) {
        this.targetType = targetType;
    }

    public UUID getTargetId() {
        return targetId;
    }

    public void setTargetId(UUID targetId) {
        this.targetId = targetId;
    }

    public EvidenceStance getStance() {
        return stance;
    }

    public void setStance(EvidenceStance stance) {
        this.stance = stance;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}
