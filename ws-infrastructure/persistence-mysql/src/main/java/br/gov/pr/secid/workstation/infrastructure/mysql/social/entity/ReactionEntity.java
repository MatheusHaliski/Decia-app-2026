package br.gov.pr.secid.workstation.infrastructure.mysql.social.entity;

import br.gov.pr.secid.workstation.domain.common.TargetType;
import br.gov.pr.secid.workstation.domain.social.IgnoredReason;
import br.gov.pr.secid.workstation.domain.social.ReactionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code reactions} (Reaction — 7 Social & Descoberta; RF26, RF27, RF42, RF45). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "reactions")
public class ReactionEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "actor_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID actorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    private TargetType targetType;

    @Column(name = "target_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID targetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reaction_type", nullable = false)
    private ReactionType reactionType;

    @Column(name = "at", nullable = false)
    private Instant at;

    @Column(name = "actor_hype_at_time")
    private Integer actorHypeAtTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "ignored_reason")
    private IgnoredReason ignoredReason;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getActorId() {
        return actorId;
    }

    public void setActorId(UUID actorId) {
        this.actorId = actorId;
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

    public ReactionType getReactionType() {
        return reactionType;
    }

    public void setReactionType(ReactionType reactionType) {
        this.reactionType = reactionType;
    }

    public Instant getAt() {
        return at;
    }

    public void setAt(Instant at) {
        this.at = at;
    }

    public Integer getActorHypeAtTime() {
        return actorHypeAtTime;
    }

    public void setActorHypeAtTime(Integer actorHypeAtTime) {
        this.actorHypeAtTime = actorHypeAtTime;
    }

    public IgnoredReason getIgnoredReason() {
        return ignoredReason;
    }

    public void setIgnoredReason(IgnoredReason ignoredReason) {
        this.ignoredReason = ignoredReason;
    }
}
