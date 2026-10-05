package br.gov.pr.secid.workstation.infrastructure.mysql.chancelas.entity;

import br.gov.pr.secid.workstation.domain.chancelas.PolicyMode;
import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code seal_policies} (SealPolicy — 9 Chancelas & Vínculos; RF39). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "seal_policies")
public class SealPolicyEntity extends AuditableEntity {

    @Column(name = "seal_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID sealId;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode", nullable = false)
    private PolicyMode mode;

    @Column(name = "criteria_json", nullable = false, columnDefinition = "JSON")
    private String criteriaJson;

    @Column(name = "recertify_every_days")
    private Integer recertifyEveryDays;

    @Column(name = "version", nullable = false)
    private int version;

    @Column(name = "valid_from", nullable = false)
    private Instant validFrom;

    public UUID getSealId() {
        return sealId;
    }

    public void setSealId(UUID sealId) {
        this.sealId = sealId;
    }

    public PolicyMode getMode() {
        return mode;
    }

    public void setMode(PolicyMode mode) {
        this.mode = mode;
    }

    public String getCriteriaJson() {
        return criteriaJson;
    }

    public void setCriteriaJson(String criteriaJson) {
        this.criteriaJson = criteriaJson;
    }

    public Integer getRecertifyEveryDays() {
        return recertifyEveryDays;
    }

    public void setRecertifyEveryDays(Integer recertifyEveryDays) {
        this.recertifyEveryDays = recertifyEveryDays;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public Instant getValidFrom() {
        return validFrom;
    }

    public void setValidFrom(Instant validFrom) {
        this.validFrom = validFrom;
    }
}
