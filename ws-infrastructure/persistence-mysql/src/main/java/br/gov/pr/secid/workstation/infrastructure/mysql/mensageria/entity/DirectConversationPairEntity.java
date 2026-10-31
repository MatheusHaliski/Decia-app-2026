package br.gov.pr.secid.workstation.infrastructure.mysql.mensageria.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code direct_conversation_pairs} (DirectConversationPair — 12b Mensageria & Atribuição; RF46). Gerada
 * pelo SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate
 * para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "direct_conversation_pairs")
public class DirectConversationPairEntity {

    @Id
    @Column(name = "pair_key", nullable = false, updatable = false)
    private String pairKey;

    @Column(name = "conversation_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID conversationId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public String getPairKey() {
        return pairKey;
    }

    public void setPairKey(String pairKey) {
        this.pairKey = pairKey;
    }

    public UUID getConversationId() {
        return conversationId;
    }

    public void setConversationId(UUID conversationId) {
        this.conversationId = conversationId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
