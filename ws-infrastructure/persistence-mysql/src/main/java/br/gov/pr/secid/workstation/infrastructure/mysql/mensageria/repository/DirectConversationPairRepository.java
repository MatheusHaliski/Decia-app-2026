package br.gov.pr.secid.workstation.infrastructure.mysql.mensageria.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.mensageria.entity.DirectConversationPairEntity;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repositório Spring Data de {@code direct_conversation_pairs} (RF46). Gerado pelo SchemaGenerator; consultas específicas
 * entram por RF.
 */
public interface DirectConversationPairRepository extends JpaRepository<DirectConversationPairEntity, String> {
}
