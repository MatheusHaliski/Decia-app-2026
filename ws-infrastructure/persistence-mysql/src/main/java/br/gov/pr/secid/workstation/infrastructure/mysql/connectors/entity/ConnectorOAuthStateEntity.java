package br.gov.pr.secid.workstation.infrastructure.mysql.connectors.entity;

import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code connector_oauth_states} (ConnectorOAuthState — 2 Acervo de Tarefas; RF20, RF4). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "connector_oauth_states")
public class ConnectorOAuthStateEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "state_hash", nullable = false)
    private String stateHash;

    @Column(name = "owner_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID ownerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false)
    private ConnectorProvider provider;

    @Column(name = "code_verifier_sealed", nullable = false)
    private String codeVerifierSealed;

    @Column(name = "code_sealed", columnDefinition = "TEXT")
    private String codeSealed;

    @Column(name = "return_to", nullable = false)
    private String returnTo;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getStateHash() {
        return stateHash;
    }

    public void setStateHash(String stateHash) {
        this.stateHash = stateHash;
    }

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

    public String getCodeVerifierSealed() {
        return codeVerifierSealed;
    }

    public void setCodeVerifierSealed(String codeVerifierSealed) {
        this.codeVerifierSealed = codeVerifierSealed;
    }

    public String getCodeSealed() {
        return codeSealed;
    }

    public void setCodeSealed(String codeSealed) {
        this.codeSealed = codeSealed;
    }

    public String getReturnTo() {
        return returnTo;
    }

    public void setReturnTo(String returnTo) {
        this.returnTo = returnTo;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
