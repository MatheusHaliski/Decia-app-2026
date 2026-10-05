package br.gov.pr.secid.workstation.infrastructure.mysql.decia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity.MessageClassificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code message_classifications} (RF7, RF8, RF11, RF29, RF42). Gerado pelo SchemaGenerator;
 * consultas específicas entram por RF.
 */
public interface MessageClassificationRepository extends JpaRepository<MessageClassificationEntity, UUID> {
}
