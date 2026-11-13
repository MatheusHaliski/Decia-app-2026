package br.gov.pr.secid.workstation.infrastructure.mysql.connectors.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.connectors.ConnectionStatus;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;
import br.gov.pr.secid.workstation.infrastructure.mysql.crypto.AesGcmStringConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code connector_accounts} (ConnectorAccount — 2 Acervo de Tarefas; RF20, RF4, RF23, RF34). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "connector_accounts")
public class ConnectorAccountEntity extends AuditableEntity {

    @Column(name = "owner_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID ownerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false)
    private ConnectorProvider provider;

    @Column(name = "external_subject", nullable = false)
    private String externalSubject;

    @Convert(converter = AesGcmStringConverter.class)
    @Column(name = "account_email_enc")
    private String accountEmailEnc;

    @Column(name = "scopes_json", columnDefinition = "JSON")
    private String scopesJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ConnectionStatus status;

    @Column(name = "access_token_sealed", columnDefinition = "TEXT")
    private String accessTokenSealed;

    @Column(name = "refresh_token_sealed", columnDefinition = "TEXT")
    private String refreshTokenSealed;

    @Column(name = "access_expires_at")
    private Instant accessExpiresAt;

    @Column(name = "connected_at", nullable = false)
    private Instant connectedAt;

    @Column(name = "last_used_at")
    private Instant lastUsedAt;

    @Column(name = "last_error")
    private String lastError;

    public UUID getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(UUID ownerId) {
        this.ownerId = ownerId;
    }

    public ConnectorProvider getProvider() {
        return provider;
    }

    public void setProvider(ConnectorProvider provider) {
        this.provider = provider;
    }

    public String getExternalSubject() {
        return externalSubject;
    }

    public void setExternalSubject(String externalSubject) {
        this.externalSubject = externalSubject;
    }

    public String getAccountEmailEnc() {
        return accountEmailEnc;
    }

    public void setAccountEmailEnc(String accountEmailEnc) {
        this.accountEmailEnc = accountEmailEnc;
    }

    public String getScopesJson() {
        return scopesJson;
    }

    public void setScopesJson(String scopesJson) {
        this.scopesJson = scopesJson;
    }

    public ConnectionStatus getStatus() {
        return status;
    }

    public void setStatus(ConnectionStatus status) {
        this.status = status;
    }

    public String getAccessTokenSealed() {
        return accessTokenSealed;
    }

    public void setAccessTokenSealed(String accessTokenSealed) {
        this.accessTokenSealed = accessTokenSealed;
    }

    public String getRefreshTokenSealed() {
        return refreshTokenSealed;
    }

    public void setRefreshTokenSealed(String refreshTokenSealed) {
        this.refreshTokenSealed = refreshTokenSealed;
    }

    public Instant getAccessExpiresAt() {
        return accessExpiresAt;
    }

    public void setAccessExpiresAt(Instant accessExpiresAt) {
        this.accessExpiresAt = accessExpiresAt;
    }

    public Instant getConnectedAt() {
        return connectedAt;
    }

    public void setConnectedAt(Instant connectedAt) {
        this.connectedAt = connectedAt;
    }

    public Instant getLastUsedAt() {
        return lastUsedAt;
    }

    public void setLastUsedAt(Instant lastUsedAt) {
        this.lastUsedAt = lastUsedAt;
    }

    public String getLastError() {
        return lastError;
    }

    public void setLastError(String lastError) {
        this.lastError = lastError;
    }
}
