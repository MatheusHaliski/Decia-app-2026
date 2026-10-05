package br.gov.pr.secid.workstation.infrastructure.mysql.mensageria.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.mensageria.entity.DirectConversationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code direct_conversations} (RF46, RF10). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface DirectConversationRepository extends JpaRepository<DirectConversationEntity, UUID> {
}
