package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.gamificacao.PointsEvent;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code decia_points_rules} (DeciaPointsRule — 8 Gamificação; RF42, RF18). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decia_points_rules")
public class DeciaPointsRuleEntity extends AuditableEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "event_code", nullable = false)
    private PointsEvent eventCode;

    @Column(name = "points", nullable = false)
    private int points;

    @Column(name = "daily_cap")
    private Integer dailyCap;

    @Column(name = "weekly_cap")
    private Integer weeklyCap;

    @Column(name = "per_session_cap")
    private Integer perSessionCap;

    @Column(name = "once_per_ref", nullable = false)
    private boolean oncePerRef;

    @Column(name = "multiplier_source")
    private String multiplierSource;

    @Column(name = "valid_from", nullable = false)
    private Instant validFrom;

    @Column(name = "valid_to")
    private Instant validTo;

    @Column(name = "active", nullable = false)
    private boolean active;

    @Column(name = "edited_by", columnDefinition = "BINARY(16)")
    private UUID editedBy;

    @Column(name = "description")
    private String description;

    public PointsEvent getEventCode() {
        return eventCode;
    }

    public void setEventCode(PointsEvent eventCode) {
        this.eventCode = eventCode;
    }

    public int getPoints() {
        return points;
    }

    public void setPoints(int points) {
        this.points = points;
    }

    public Integer getDailyCap() {
        return dailyCap;
    }

    public void setDailyCap(Integer dailyCap) {
        this.dailyCap = dailyCap;
    }

    public Integer getWeeklyCap() {
        return weeklyCap;
    }

    public void setWeeklyCap(Integer weeklyCap) {
        this.weeklyCap = weeklyCap;
    }

    public Integer getPerSessionCap() {
        return perSessionCap;
    }

    public void setPerSessionCap(Integer perSessionCap) {
        this.perSessionCap = perSessionCap;
    }

    public boolean isOncePerRef() {
        return oncePerRef;
    }

    public void setOncePerRef(boolean oncePerRef) {
        this.oncePerRef = oncePerRef;
    }

    public String getMultiplierSource() {
        return multiplierSource;
    }

    public void setMultiplierSource(String multiplierSource) {
        this.multiplierSource = multiplierSource;
    }

    public Instant getValidFrom() {
        return validFrom;
    }

    public void setValidFrom(Instant validFrom) {
        this.validFrom = validFrom;
    }

    public Instant getValidTo() {
        return validTo;
    }

    public void setValidTo(Instant validTo) {
        this.validTo = validTo;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public UUID getEditedBy() {
        return editedBy;
    }

    public void setEditedBy(UUID editedBy) {
        this.editedBy = editedBy;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
