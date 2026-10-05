package br.gov.pr.secid.workstation.infrastructure.mysql.mensageria.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.mensageria.entity.DirectConversationParticipantEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code direct_conversation_participants} (RF46). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface DirectConversationParticipantRepository extends JpaRepository<DirectConversationParticipantEntity, UUID> {
}
