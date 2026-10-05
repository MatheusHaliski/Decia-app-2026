package br.gov.pr.secid.workstation.infrastructure.mysql.lgpd.entity;

import br.gov.pr.secid.workstation.domain.lgpd.ConsentAction;
import br.gov.pr.secid.workstation.domain.lgpd.ConsentChannel;
import br.gov.pr.secid.workstation.domain.lgpd.ConsentPurpose;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code consent_events} (ConsentEvent — 1 Identidade & Acesso; RF3, RF18). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "consent_events")
public class ConsentEventEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false)
    private ConsentPurpose purpose;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false)
    private ConsentAction action;

    @Column(name = "at", nullable = false)
    private Instant at;

    @Column(name = "ip")
    private String ip;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "policy_version")
    private String policyVersion;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false)
    private ConsentChannel channel;

    @Column(name = "correlation_id")
    private String correlationId;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public ConsentPurpose getPurpose() {
        return purpose;
    }

    public void setPurpose(ConsentPurpose purpose) {
        this.purpose = purpose;
    }

    public ConsentAction getAction() {
        return action;
    }

    public void setAction(ConsentAction action) {
        this.action = action;
    }

    public Instant getAt() {
        return at;
    }

    public void setAt(Instant at) {
        this.at = at;
    }

    public String getIp() {
        return ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    public String getPolicyVersion() {
        return policyVersion;
    }

    public void setPolicyVersion(String policyVersion) {
        this.policyVersion = policyVersion;
    }

    public ConsentChannel getChannel() {
        return channel;
    }

    public void setChannel(ConsentChannel channel) {
        this.channel = channel;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public void setCorrelationId(String correlationId) {
        this.correlationId = correlationId;
    }
}
