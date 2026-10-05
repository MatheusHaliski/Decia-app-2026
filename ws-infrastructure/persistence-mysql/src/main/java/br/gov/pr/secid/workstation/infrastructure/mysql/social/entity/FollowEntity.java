package br.gov.pr.secid.workstation.infrastructure.mysql.social.entity;

import br.gov.pr.secid.workstation.domain.social.FollowStatus;
import br.gov.pr.secid.workstation.domain.social.FollowTargetType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code follows} (Follow — 7 Social & Descoberta; RF27, RF14, RF15). Gerada pelo SchemaGenerator a partir
 * do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String;
 * JSON como String.
 */
@Entity
@Table(name = "follows")
public class FollowEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "follower_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID followerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    private FollowTargetType targetType;

    @Column(name = "target_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID targetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private FollowStatus status;

    @Column(name = "at", nullable = false)
    private Instant at;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getFollowerId() {
        return followerId;
    }

    public void setFollowerId(UUID followerId) {
        this.followerId = followerId;
    }

    public FollowTargetType getTargetType() {
        return targetType;
    }

    public void setTargetType(FollowTargetType targetType) {
        this.targetType = targetType;
    }

    public UUID getTargetId() {
        return targetId;
    }

    public void setTargetId(UUID targetId) {
        this.targetId = targetId;
    }

    public FollowStatus getStatus() {
        return status;
    }

    public void setStatus(FollowStatus status) {
        this.status = status;
    }

    public Instant getAt() {
        return at;
    }

    public void setAt(Instant at) {
        this.at = at;
    }
}
