package br.gov.pr.secid.workstation.infrastructure.mysql.mensageria.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.mensageria.ConversationKind;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code direct_conversations} (DirectConversation — 12b Mensageria & Atribuição; RF46, RF10). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "direct_conversations")
public class DirectConversationEntity extends AuditableEntity {

    @Column(name = "company_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID companyId;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false)
    private ConversationKind kind;

    @Column(name = "title")
    private String title;

    @Column(name = "created_by", nullable = false, columnDefinition = "BINARY(16)")
    private UUID createdBy;

    @Column(name = "last_message_at")
    private Instant lastMessageAt;

    @Column(name = "messaging_ttl_days")
    private Integer messagingTtlDays;

    public UUID getCompanyId() {
        return companyId;
    }

    public void setCompanyId(UUID companyId) {
        this.companyId = companyId;
    }

    public ConversationKind getKind() {
        return kind;
    }

    public void setKind(ConversationKind kind) {
        this.kind = kind;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(UUID createdBy) {
        this.createdBy = createdBy;
    }

    public Instant getLastMessageAt() {
        return lastMessageAt;
    }

    public void setLastMessageAt(Instant lastMessageAt) {
        this.lastMessageAt = lastMessageAt;
    }

    public Integer getMessagingTtlDays() {
        return messagingTtlDays;
    }

    public void setMessagingTtlDays(Integer messagingTtlDays) {
        this.messagingTtlDays = messagingTtlDays;
    }
}
