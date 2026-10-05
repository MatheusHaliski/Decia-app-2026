package br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code divergence_replies} (DivergenceReply — 5 DECIA sessão; RF10, RF42). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "divergence_replies")
public class DivergenceReplyEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "divergence_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID divergenceId;

    @Column(name = "author_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID authorId;

    @Column(name = "message_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID messageId;

    @Column(name = "resolves", nullable = false)
    private boolean resolves;

    @Column(name = "at", nullable = false)
    private Instant at;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getDivergenceId() {
        return divergenceId;
    }

    public void setDivergenceId(UUID divergenceId) {
        this.divergenceId = divergenceId;
    }

    public UUID getAuthorId() {
        return authorId;
    }

    public void setAuthorId(UUID authorId) {
        this.authorId = authorId;
    }

    public UUID getMessageId() {
        return messageId;
    }

    public void setMessageId(UUID messageId) {
        this.messageId = messageId;
    }

    public boolean isResolves() {
        return resolves;
    }

    public void setResolves(boolean resolves) {
        this.resolves = resolves;
    }

    public Instant getAt() {
        return at;
    }

    public void setAt(Instant at) {
        this.at = at;
    }
}
