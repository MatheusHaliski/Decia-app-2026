package br.gov.pr.secid.workstation.infrastructure.mysql.social.entity;

import br.gov.pr.secid.workstation.domain.common.TargetType;
import br.gov.pr.secid.workstation.domain.social.MuralKind;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code mural_entries} (MuralEntry — 7 Social & Descoberta; RF27, RF15, RF35, RF42). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "mural_entries")
public class MuralEntryEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "company_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID companyId;

    @Column(name = "department_id", columnDefinition = "BINARY(16)")
    private UUID departmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false)
    private MuralKind kind;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type")
    private TargetType targetType;

    @Column(name = "target_id", columnDefinition = "BINARY(16)")
    private UUID targetId;

    @Column(name = "actor_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID actorId;

    @Column(name = "boost_until")
    private Instant boostUntil;

    @Column(name = "at", nullable = false)
    private Instant at;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

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

    public MuralKind getKind() {
        return kind;
    }

    public void setKind(MuralKind kind) {
        this.kind = kind;
    }

    public TargetType getTargetType() {
        return targetType;
    }

    public void setTargetType(TargetType targetType) {
        this.targetType = targetType;
    }

    public UUID getTargetId() {
        return targetId;
    }

    public void setTargetId(UUID targetId) {
        this.targetId = targetId;
    }

    public UUID getActorId() {
        return actorId;
    }

    public void setActorId(UUID actorId) {
        this.actorId = actorId;
    }

    public Instant getBoostUntil() {
        return boostUntil;
    }

    public void setBoostUntil(Instant boostUntil) {
        this.boostUntil = boostUntil;
    }

    public Instant getAt() {
        return at;
    }

    public void setAt(Instant at) {
        this.at = at;
    }
}
